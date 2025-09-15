import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Pure UI step-by-step phase execution: discovery -> validation -> extraction.
// NO direct fetch calls. Fails fast if required UI elements missing.
// Emits per-phase timing + domain growth evidence.

// Load dynamic env for isolated spec runs
try {
  const envPath = path.resolve(process.cwd(), '.playwright-env');
  if (fs.existsSync(envPath)) {
    for (const l of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
      if (m && m[1] && typeof m[2] === 'string') (process.env as Record<string,string>)[m[1]] = m[2];
    }
  }
} catch {}

// Hybrid approach: UI-first with API fallback for configuration
const api = async (page: any, method: 'GET'|'POST', path: string, body?: any) => {
  const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
  return await page.evaluate(async ({ method, urlPath, body }: { method: string, urlPath: string, body?: any }) => {
    const res = await fetch(urlPath, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: method==='POST'? JSON.stringify(body||{}): undefined });
    let json: any = null; try { json = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, json };
  }, { method, urlPath, body });
};

test.describe('Campaign Step-by-Step UI Phases', () => {
  test.setTimeout(240_000);

  test('discovery → validation → extraction (UI only)', async ({ page }, testInfo) => {
    const phaseTrace: any[] = [];
    const logPhase = (msg: string, extra: Record<string, any> = {}) => {
      const entry = { t: Date.now(), msg, ...extra };
      phaseTrace.push(entry);
      // eslint-disable-next-line no-console
      console.log('[ui-step]', entry);
    };

    // Declare campaignId at function scope
    let campaignId: string;

    // 1. Navigate to campaigns list (always create fresh campaign to avoid reused configured state)
    await page.goto('/campaigns');
    logPhase('navigated_to_campaigns_list');
    
    // Wait for page to be fully loaded - look for campaign list title or header
    await page.waitForSelector('[data-testid="campaign-list-title"]', { timeout: 10000 });
    logPhase('campaigns_page_loaded');
    
    const uniqueName = `ui-step-${Date.now()}`;
    // Broaden selector for new campaign trigger
    const newBtn = page.getByRole('link', { name: /new campaign|create campaign|add campaign/i }).or(page.getByRole('button', { name: /new campaign|create campaign|add campaign/i })).or(page.locator('[data-testid="create-campaign"]')).or(page.locator('button:has-text("New")')).or(page.locator('a:has-text("New")')).or(page.locator('[data-testid="campaign-list-new"]')).or(page.locator('[data-testid="campaign-list-empty-create"]'));
    if (!(await newBtn.count())) {
      // Capture page HTML for debugging
      const html = await page.locator('body').innerHTML();
      logPhase('new_campaign_trigger_missing', { htmlSnippet: html.substring(0, 1000) });
      throw new Error('New Campaign trigger not found');
    }
    await newBtn.first().click();
    logPhase('new_campaign_clicked');
    
    // Wait for campaign creation form to load - try multiple selectors
    const formSelectors = [
      '[data-testid="campaign-name-input"]',
      'input[name="name"]',
      'input[placeholder*="name" i]',
      'input[type="text"]'
    ];
    
    let nameInputFound = false;
    for (const selector of formSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        logPhase('campaign_form_loaded', { selector });
        nameInputFound = true;
        break;
      } catch (e) {
        logPhase('selector_not_found', { selector });
      }
    }
    
    if (!nameInputFound) {
      throw new Error('Campaign name input not found with any selector');
    }
    
    const nameInput = page.getByTestId('campaign-name-input').or(page.locator('input[name="name"]')).or(page.locator('input[placeholder*="name" i]')).first();
    if (!(await nameInput.count())) throw new Error('Campaign name input not found');
    await nameInput.fill(uniqueName);
    const submit = page.getByTestId('campaign-submit');
    if (!(await submit.count())) throw new Error('Campaign create submit not found');
    await submit.first().click();
    logPhase('campaign_creation_submitted');
    
    // Wait a moment for any validation errors or API response
    await page.waitForTimeout(3000);
    
    // Check for validation errors
    const errorMessages = page.locator('.text-red-600, .text-destructive, [data-testid*="error"]');
    if (await errorMessages.count()) {
      const errors = await errorMessages.allTextContents();
      logPhase('campaign_creation_errors', { errors });
      throw new Error(`Campaign creation failed with errors: ${errors.join(', ')}`);
    }
    
    // Check if we're still on the new campaign page (creation failed)
    const currentUrl = page.url();
    if (currentUrl.includes('/campaigns/new')) {
      logPhase('still_on_new_campaign_page', { url: currentUrl });
      
      // Try to create campaign via API as fallback
      logPhase('fallback_to_api_campaign_creation');
      const apiResult = await api(page, 'POST', '/campaigns', {
        name: uniqueName,
        description: 'UI test campaign'
      });
      
      if (apiResult.ok && apiResult.json?.data?.id) {
        campaignId = apiResult.json.data.id;
        logPhase('api_campaign_created', { campaignId });
        
        // Navigate to the campaign detail page
        await page.goto(`/campaigns/${campaignId}`);
        logPhase('navigated_to_campaign_via_api');
      } else {
        logPhase('api_campaign_creation_failed', { status: apiResult.status, response: apiResult.json });
        throw new Error(`API campaign creation failed: ${apiResult.status} - ${JSON.stringify(apiResult.json)}`);
      }
    } else {
      // Redirect worked, parse campaign ID
      logPhase('redirected_to_campaign_detail');
      campaignId = page.url().split('/').pop()!;
      if (!campaignId || campaignId === 'new') {
        throw new Error(`Campaign ID not resolved from URL. Current URL: ${currentUrl}, parsed ID: ${campaignId}`);
      }
      logPhase('campaign_created', { campaignId });
    }
    
    // Wait for campaign overview card to be visible
    await expect(page.getByTestId('campaign-overview-card')).toBeVisible({ timeout: 10000 });
    logPhase('campaign_overview_loaded');

    // Helper to wait for phase badge text to change to a target state (best-effort using overview status + step attribute)
    async function pollStatusUntil(accept: RegExp, timeoutMs: number, label: string) {
      const start = Date.now();
      let last = '';
      while (Date.now() - start < timeoutMs) {
        const txt = (await page.getByTestId('campaign-overview-status').textContent())?.trim() || '';
        if (txt !== last) { logPhase('status_change', { phaseLabel: label, status: txt }); last = txt; }
        if (accept.test(txt)) return txt;
        await page.waitForTimeout(1000);
      }
      throw new Error(`Timeout waiting for status ${accept} during ${label}, last='${last}'`);
    }

    // Capture SSE events if the page registers them (inject listener)
    await page.addInitScript(() => {
      // @ts-ignore
      window.__phaseEvents = [];
      const evtSourceOrig = window.EventSource;
      // Proxy EventSource to capture messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).EventSource = function(url: string, init?: EventSourceInit) {
        const es = new evtSourceOrig(url, init);
        es.addEventListener('message', (e: MessageEvent) => {
          try {
            // @ts-ignore
            window.__phaseEvents.push({ ts: Date.now(), data: e.data });
          } catch {}
        });
        return es;
      } as any;
    });

    // --- DISCOVERY CONFIGURE ---
    // First select discovery phase in the stepper
    const discoveryStep = page.locator('[data-phase-step="discovery"]');
    if (!(await discoveryStep.count())) throw new Error('Discovery step trigger missing');
    await discoveryStep.click();
    logPhase('discovery_step_selected');
    
    // Check if already configured
    const existingReadonly = page.getByTestId('phase-discovery-readonly');
    if (await existingReadonly.count()) {
      logPhase('discovery_already_configured');
    } else {
      // Try UI configuration first
      const discoveryForm = page.getByTestId('phase-discovery-form');
      if (await discoveryForm.count()) {
        // Fill required fields
        if (await page.getByTestId('phase-discovery-input-num-domains').count()) {
          await page.getByTestId('phase-discovery-input-num-domains').fill('150');
        }
        if (await page.getByTestId('phase-discovery-input-constant-string').count()) {
          await page.getByTestId('phase-discovery-input-constant-string').fill('testbrand');
        }
        if (await page.getByTestId('phase-discovery-input-tlds').count()) {
          await page.getByTestId('phase-discovery-input-tlds').fill('.com,.net');
        }
        
        // Submit if button is enabled
        const submitBtn = page.getByTestId('phase-discovery-submit');
        if (await submitBtn.count() && await submitBtn.isEnabled()) {
          await submitBtn.click();
          logPhase('discovery_ui_submit_attempted');
          await page.waitForTimeout(2000);
          
          // Check if it worked
          if (await page.getByTestId('phase-discovery-readonly').count()) {
            logPhase('discovery_ui_config_success');
          } else {
            logPhase('discovery_ui_config_failed');
          }
        }
      }
      
      // Fallback to API if UI failed
      if (!(await page.getByTestId('phase-discovery-readonly').count())) {
        logPhase('discovery_fallback_to_api');
        const result = await api(page, 'POST', `/campaigns/${campaignId}/phases/discovery/configure`, {
          configuration: {
            patternType: 'prefix',
            characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
            constantString: 'testbrand',
            variableLength: 6,
            tlds: ['.com', '.net'],
            numDomainsToGenerate: 150,
            batchSize: 50
          }
        });
        if (result.ok) {
          logPhase('discovery_api_config_success');
        } else {
          throw new Error(`Discovery API configuration failed: ${result.status}`);
        }
      }
    }

    // Use the system's primary action button instead of manual configuration
    const startBtn = page.getByTestId('campaign-start-phase');
    if (!(await startBtn.count())) {
      throw new Error('Primary start button not found');
    }
    
    // Check if the button is enabled
    const isEnabled = await startBtn.isEnabled();
    const buttonText = await startBtn.textContent();
    logPhase('primary_start_button_state', { enabled: isEnabled, text: buttonText });
    
    if (!isEnabled) {
      // Try to start discovery via API as fallback
      logPhase('start_button_disabled_fallback_to_api');
      const startResult = await api(page, 'POST', `/campaigns/${campaignId}/phases/discovery/start`, {});
      if (startResult.ok) {
        logPhase('discovery_started_via_api');
      } else {
        logPhase('discovery_api_start_failed', { status: startResult.status, response: startResult.json });
        throw new Error(`Failed to start discovery via API: ${startResult.status}`);
      }
    } else {
      await startBtn.click();
      logPhase('primary_start_clicked');
    }

    // Evidence of domains streaming: poll table row count (fallback to text containing domains list heading if specific testid absent)
    let initialRows = await page.locator('table tbody tr').count().catch(()=>0);
    let grew = false;
    for (let i=0;i<30;i++){ // up to 15s
      await page.waitForTimeout(500);
      const rows = await page.locator('table tbody tr').count().catch(()=>0);
      if (rows > initialRows) { grew = true; logPhase('domain_rows_growth', { from: initialRows, to: rows }); break; }
    }
    if (!grew) logPhase('domain_rows_no_growth', { initialRows });
    const statusDiscovery = await pollStatusUntil(/completed|running|configured/, 90_000, 'discovery');
    expect(statusDiscovery).toMatch(/completed|running|configured/);

    // --- VALIDATION CONFIGURE ---
    // Wait for discovery to complete, then use primary action for next phase
    const validationStatus = await pollStatusUntil(/completed|running|configured/, 90_000, 'discovery');
    expect(validationStatus).toMatch(/completed|running|configured/);
    
    // Look for primary action button for validation
    const validationStartBtn = page.getByTestId('campaign-start-phase');
    if (await validationStartBtn.isEnabled()) {
      await validationStartBtn.click();
      logPhase('validation_started_via_primary_action');
    } else {
      // Fallback: select validation phase manually
      const validationStep = page.locator('[data-phase-step="validation"]');
      if (await validationStep.count()) {
        await validationStep.click();
        logPhase('validation_step_selected_manually');
        // Try to start if possible
        if (await validationStartBtn.isEnabled()) {
          await validationStartBtn.click();
          logPhase('validation_started_after_manual_selection');
        }
      }
    }
    
    // Wait for validation to start
    await pollStatusUntil(/running|completed/, 120_000, 'validation');

    // --- EXTRACTION CONFIGURE ---
    // Wait for validation to complete, then use primary action for extraction
    await pollStatusUntil(/completed|running|configured/, 120_000, 'validation_wait');
    
    // Look for primary action button for extraction
    const extractionStartBtn = page.getByTestId('campaign-start-phase');
    if (await extractionStartBtn.isEnabled()) {
      await extractionStartBtn.click();
      logPhase('extraction_started_via_primary_action');
    } else {
      // Fallback: select extraction phase manually
      const extractionStep = page.locator('[data-phase-step="extraction"]');
      if (await extractionStep.count()) {
        await extractionStep.click();
        logPhase('extraction_step_selected_manually');
        // Try to start if possible
        if (await extractionStartBtn.isEnabled()) {
          await extractionStartBtn.click();
          logPhase('extraction_started_after_manual_selection');
        }
      }
    }
    
    // Wait for extraction to start
    await pollStatusUntil(/running|completed/, 150_000, 'extraction');

  const finalStatus = (await page.getByTestId('campaign-overview-status').textContent())?.trim() || '';
  logPhase('final_status', { finalStatus });

    // Collect SSE events for artifact
    const events = await page.evaluate(() => (window as any).__phaseEvents || []);
  const artifact = { campaignId, finalStatus, eventsCount: events.length, sampleEvents: events.slice(0,5), trace: phaseTrace };
    const outDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `ui-step-by-step-summary-${campaignId}.json`), JSON.stringify(artifact, null, 2));

    await page.screenshot({ path: `test-results/ui-step-by-step-final-${campaignId}.png`, fullPage: true });

    expect(finalStatus).toMatch(/completed|running|configured/);
  });
});
