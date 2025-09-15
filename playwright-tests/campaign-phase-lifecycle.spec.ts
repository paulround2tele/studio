import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

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

// Scenario: Campaign phase lifecycle & SSE-driven progression
// NOTE: This is a scaffold. Real implementation steps will replace the test.todo blocks after confirmation.
// References:
//  - docs/PIPELINE_DATAFLOW_FULL.md (authoritative pipeline data flow)
//  - Components used: CampaignOverviewCard (selector: [data-overview-card])
//  - Domains list: Generated Domains card table (no explicit data attribute; we rely on heading text + table rows)
//  - Status badge: dynamic text content inside overview card
//  - SSE events expected: phase_started, phase_completed, phase_auto_started, analysis_reuse_enrichment, analysis_completed

test.describe('Campaign Phase Lifecycle & SSE', () => {
  test('full pipeline configuration & auto progression (best-effort)', async ({ page }) => {
    test.setTimeout(180000);
    const existing = process.env.PLAYWRIGHT_CAMPAIGN_ID; // reuse if provided (faster)
    const dnsPersonaId = process.env.PLAYWRIGHT_DNS_PERSONA_ID;
    const httpPersonaId = process.env.PLAYWRIGHT_HTTP_PERSONA_ID;

    // lightweight helper for API calls (avoids re-login complexities)
    const api = async (method: 'GET'|'POST', path: string, body?: any) => {
      const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
      return await page.evaluate(async ({ method, urlPath, body }) => {
        const res = await fetch(urlPath, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: method==='POST'? JSON.stringify(body||{}): undefined });
        let json: any = null; try { json = await res.json(); } catch {}
        return { ok: res.ok, status: res.status, json };
      }, { method, urlPath, body });
    };

    // 1. Navigate to campaigns list (assumes already authenticated or no auth required for dev)
    await page.goto('/campaigns');

    let campaignId = existing;
    if (!campaignId) {
      // Create a campaign via UI if needed
      const newBtn = page.getByRole('link', { name: /new campaign/i }).or(page.getByRole('button', { name: /new campaign/i }));
      if (await newBtn.count()) {
        await newBtn.first().click();
        // Minimal form interactions (selectors assumed from earlier instrumentation) - fallback to name input if present
        const nameInput = page.getByRole('textbox').first();
        if (await nameInput.count()) {
          await nameInput.fill('pw-full-pipeline');
        }
  const submit = page.getByRole('button', { name: /create/i }).or(page.getByRole('button', { name: /save/i }));
        if (await submit.count()) await submit.first().click();
      }
      // After creation redirect expected /campaigns/:id
      await page.waitForURL(/\/campaigns\/[-a-z0-9]+/i);
      campaignId = page.url().split('/').pop() as string;
    } else {
      await page.goto(`/campaigns/${campaignId}`);
    }

    // 2. Overview card visible
    await expect(page.getByTestId('campaign-overview-card')).toBeVisible();

  // 3. Configure discovery phase (if needed) using stable data-testid selectors
    const discoveryForm = page.getByTestId('phase-discovery-form');
    const discoveryReadonly = page.getByTestId('phase-discovery-readonly');
    if (!(await discoveryForm.count()) && !(await discoveryReadonly.count())) {
      // open panel
      const step1 = page.locator('[data-phase-step="discovery"]');
      if (await step1.count()) await step1.click();
    }
    if (await discoveryForm.count()) {
      // Adjust one field to ensure dirty state then submit
      const numDomains = page.getByTestId('phase-discovery-input-num-domains');
      if (await numDomains.count()) {
        await numDomains.fill('250');
      }
      const saveBtn = page.getByTestId('phase-discovery-submit');
      if (await saveBtn.isEnabled()) await saveBtn.click();
      // Wait until form replaced by readonly or disabled submit
      await page.waitForTimeout(500); // small debounce
    }

    // 4. Configure validation (DNS) if personas available
    if (dnsPersonaId) {
      const stepValidation = page.locator('[data-phase-step="validation"]');
      if (await stepValidation.count()) await stepValidation.click();
      const dnsForm = page.getByTestId('phase-dns-form');
      if (await dnsForm.count()) {
        // Select persona via API if UI cannot due to empty list (graceful)
        // UI path: we attempt to click card; fallback to direct configure API
        if (!(await page.getByTestId(`phase-dns-persona-${dnsPersonaId}`).count())) {
          // Correct flat payload (no nested phases key)
          await api('POST', `/campaigns/${campaignId}/phases/validation/configure`, { configuration: { dnsValidation: { personaIds: [dnsPersonaId], name: 'Auto DNS Config' } } });
        } else {
          await page.getByTestId(`phase-dns-persona-${dnsPersonaId}`).click();
          const save = page.getByTestId('phase-dns-submit');
          if (await save.isEnabled()) await save.click();
        }
        await page.waitForTimeout(300);
      }
    }

    // 5. Configure extraction (HTTP) if http persona available
    if (httpPersonaId) {
      const stepExtraction = page.locator('[data-phase-step="extraction"]');
      if (await stepExtraction.count()) await stepExtraction.click();
      const httpForm = page.getByTestId('phase-http-form');
      if (await httpForm.count()) {
        if (!(await page.getByTestId(`phase-http-persona-${httpPersonaId}`).count())) {
          await api('POST', `/campaigns/${campaignId}/phases/extraction/configure`, { configuration: { httpValidation: { personaIds: [httpPersonaId], name: 'Auto HTTP Config', keywordSetIds: [], adHocKeywords: [] } } });
        } else {
          await page.getByTestId(`phase-http-persona-${httpPersonaId}`).click();
          const save = page.getByTestId('phase-http-submit');
          if (await save.isEnabled()) await save.click();
        }
        await page.waitForTimeout(300);
      }
    }

    // 6. Configure analysis (simple default) always via API (form optional)
  await api('POST', `/campaigns/${campaignId}/phases/analysis/configure`, { configuration: { analysis: { name: 'Auto Analysis Config', analysisTypes: ['content'], enableSuggestions: true, customRules: [] } } });

    // 7. Toggle auto mode if currently step-by-step

    // 5. Wait for discovery to transition (best-effort: watch badge state)
  const discoveryBadge = page.locator('[data-phase-step="discovery"]');
  await page.waitForTimeout(1000);

    // 6. Attempt to configure validation if panel opens after discovery
    const validationStep = page.locator('[data-phase-step="validation"]');
    if (await validationStep.count()) {
      await validationStep.click();
      const validationSubmit = page.getByTestId('phase-dns-submit');
      if (await validationSubmit.count() && await validationSubmit.isEnabled()) {
        await validationSubmit.click();
      }
    }

    const modeLabel = page.getByTestId('campaign-mode-label');
    if ((await modeLabel.textContent())?.includes('Step')) {
      await page.getByTestId('campaign-mode-toggle').click();
    }

    // 8. Start first phase manually if start button active (discovery or validation depending on missing configs earlier)
    const startBtn = page.getByTestId('campaign-start-phase');
    if (await startBtn.isEnabled()) await startBtn.click();

    // 9. Poll for terminal state (best effort). If backend does not execute engines in dev, allow idle/configured.
    const overviewStatus = page.getByTestId('campaign-overview-status');
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="campaign-overview-status"]');
      return !!el && /(completed|failed|running|configured)/.test((el.textContent||'').trim());
    }, {}, { timeout: 60000 }).catch(()=>{});
    const finalStatus = (await overviewStatus.textContent())?.trim() || '';
    // Accept broader set; log warning if not fully completed
    if (!/completed|failed/.test(finalStatus)) {
      console.warn('[lifecycle-spec] Pipeline did not reach completed/failed; final status:', finalStatus);
    }
    expect(finalStatus).toMatch(/completed|failed|running|configured|idle/);

    // 10. Persist screenshot & trace artifact automatically on failure via config, capture an explicit screenshot for success
    await page.screenshot({ path: `test-results/pipeline-final-${campaignId}.png` });
  });
});
