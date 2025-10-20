import { test, expect } from '@playwright/test';

/**
 * Visual test for campaign details page
 * This test creates a campaign, executes phases, and takes screenshots
 * to verify the UI displays real data instead of hardcoded fallbacks
 */

test.describe('Campaign Details Visual Test', () => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes

  test('creates campaign and captures UI at each stage', async ({ page }) => {
    const email = process.env.E2E_EMAIL || 'test@example.com';
    const password = process.env.E2E_PASSWORD || 'password123';

    // API helper
    const api = async (method: 'GET' | 'POST', path: string, body?: any) => {
      const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
      const result = await page.evaluate(
        async ({ method, urlPath, body }) => {
          const res = await fetch(urlPath, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
          });
          let json: any = null;
          try {
            json = await res.json();
          } catch {}
          return { ok: res.ok, status: res.status, json };
        },
        { method, urlPath, body }
      );
      return result as { ok: boolean; status: number; json: any };
    };

    // Step 1: Login
    console.log('[VISUAL] Logging in...');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    try {
      await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('[VISUAL] UI login failed, using API fallback');
      await api('POST', '/auth/login', { email, password });
      await page.reload();
      await page.waitForTimeout(2000);
    }

    // Step 2: Get or create personas
    const personas = await api('GET', '/personas');
    let dnsPersonaId: string | null = null;
    let httpPersonaId: string | null = null;

    const personaList = personas.json?.data || personas.json || [];
    const dnsPersona = personaList.find((p: any) => p?.personaType === 'dns');
    const httpPersona = personaList.find((p: any) => p?.personaType === 'http');

    if (dnsPersona) {
      dnsPersonaId = String(dnsPersona.id);
    } else {
      const createDns = await api('POST', '/personas', {
        name: `E2E-DNS-${Date.now()}`,
        description: 'E2E test DNS persona',
        personaType: 'dns',
      });
      dnsPersonaId = String(createDns.json?.data?.id || createDns.json?.id);
    }

    if (httpPersona) {
      httpPersonaId = String(httpPersona.id);
    } else {
      const createHttp = await api('POST', '/personas', {
        name: `E2E-HTTP-${Date.now()}`,
        description: 'E2E test HTTP persona',
        personaType: 'http',
      });
      httpPersonaId = String(createHttp.json?.data?.id || createHttp.json?.id);
    }

    // Step 3: Create campaign
    console.log('[VISUAL] Creating campaign...');
    const campaignName = `Visual-Test-${Date.now()}`;
    const created = await api('POST', '/campaigns', {
      name: campaignName,
      description: 'Visual test campaign for screenshots',
      configuration: {
        phases: {
          discovery: {
            patternType: 'prefix',
            constantString: 'test',
            characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
            variableLength: 2,
            tlds: ['.com'],
            numDomainsToGenerate: 20,
            batchSize: 100,
            offsetStart: 0,
          },
        },
      },
    });

    const campaignId = created.json?.data?.id || created.json?.id;
    console.log('[VISUAL] Created campaign:', campaignId);

    // Step 4: Navigate to campaign page and take screenshot - CREATING
    console.log('[VISUAL] Step 1: Campaign just created (CREATING status)');
    await page.goto(`/campaigns/${campaignId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/campaign-01-creating.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-01-creating.png');

    // Step 5: Start discovery phase
    console.log('[VISUAL] Starting discovery phase...');
    await api('POST', `/campaigns/${campaignId}/phases/discovery/configure`, {
      configuration: {
        patternType: 'prefix',
        constantString: 'test',
        characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
        variableLength: 2,
        tlds: ['.com'],
        numDomainsToGenerate: 20,
        batchSize: 100,
        offsetStart: 0,
      },
    });
    await api('POST', `/campaigns/${campaignId}/phases/discovery/start`, {});

    // Wait a bit for discovery to start
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-02-discovery-running.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-02-discovery-running.png');

    // Wait for discovery to complete
    await waitForPhaseCompletion(page, api, campaignId, 'discovery');

    // Reload and screenshot - DISCOVERY COMPLETED
    console.log('[VISUAL] Step 2: Discovery completed');
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-03-discovery-completed.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-03-discovery-completed.png');

    // Step 6: Start validation phase
    console.log('[VISUAL] Starting validation phase...');
    await api('POST', `/campaigns/${campaignId}/phases/validation/configure`, {
      configuration: {
        personaIds: [dnsPersonaId],
        batchSize: 25,
        timeout: 10,
        maxRetries: 1,
        validation_types: ['A'],
      },
    });
    await api('POST', `/campaigns/${campaignId}/phases/validation/start`, {});

    // Wait a bit for validation to start
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-04-validation-running.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-04-validation-running.png');

    // Wait for validation to complete
    await waitForPhaseCompletion(page, api, campaignId, 'validation');

    // Reload and screenshot - VALIDATION COMPLETED
    console.log('[VISUAL] Step 3: Validation completed');
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-05-validation-completed.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-05-validation-completed.png');

    // Step 7: Start extraction phase
    console.log('[VISUAL] Starting extraction phase...');
    await api('POST', `/campaigns/${campaignId}/phases/extraction/configure`, {
      configuration: {
        personaIds: [httpPersonaId],
        keywords: ['login', 'portal', 'admin'],
        enrichmentEnabled: true,
      },
    });
    await api('POST', `/campaigns/${campaignId}/phases/extraction/start`, {});

    // Wait a bit for extraction to start
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-06-extraction-running.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-06-extraction-running.png');

    // Wait for extraction to complete
    await waitForPhaseCompletion(page, api, campaignId, 'extraction');

    // Reload and screenshot - EXTRACTION COMPLETED
    console.log('[VISUAL] Step 4: Extraction completed');
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/campaign-07-extraction-completed.png', fullPage: true });
    console.log('[VISUAL] Screenshot saved: campaign-07-extraction-completed.png');

    console.log('[VISUAL] ✅ All screenshots captured successfully!');
  });
});

async function waitForPhaseCompletion(
  page: any,
  api: (method: 'GET' | 'POST', path: string, body?: any) => Promise<any>,
  campaignId: string,
  phase: string
) {
  let phaseCompleted = false;
  const startTime = Date.now();
  const maxWaitTime = 180_000; // 3 minutes

  while (!phaseCompleted && Date.now() - startTime < maxWaitTime) {
    await page.waitForTimeout(2000);

    const statusResp = await api('GET', `/campaigns/${campaignId}/phases/${phase}/status`);
    if (statusResp.ok) {
      const phaseData = statusResp.json?.data || statusResp.json;
      const status = phaseData?.status;

      if (status === 'completed' || status === 'success') {
        phaseCompleted = true;
        break;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(`Phase ${phase} failed`);
      }
    }
  }

  if (!phaseCompleted) {
    throw new Error(`Phase ${phase} did not complete within ${maxWaitTime}ms`);
  }
}
