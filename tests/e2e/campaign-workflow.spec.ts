import { test, expect } from '@playwright/test';

// End-to-end workflow: login → create campaign → run discovery/validation/extraction/analysis → capture SSE
test.describe('Campaign full workflow with SSE', () => {
  test.setTimeout(5 * 60 * 1000); // 5 minutes

  test('user can create a campaign, run all phases, and see realtime updates', async ({ page }) => {
    // 1) Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.E2E_EMAIL || 'test@example.com');
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD || 'password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // After login, go to campaigns (layout redirects can vary)
    await page.goto('/campaigns');
    await expect(page.getByRole('heading', { name: /campaigns/i })).toBeVisible({ timeout: 15000 });

    // 2) Create campaign via UI
    await page.getByRole('button', { name: /new campaign|create first campaign/i }).first().click();
    await page.waitForURL('**/campaigns/new');

    // Fill required fields
    await page.getByLabel('Campaign Name *').fill('E2E Campaign ' + Date.now());
    await page.getByLabel('Maximum Domains to Generate').fill('50');

    // Pattern Type select
    await page.getByLabel('Pattern Type').click();
    await page.getByRole('option', { name: /Prefix Variable/i }).click();

    await page.getByLabel('Constant Part *').fill('acme');
    await page.getByLabel('Allowed Character Set').fill('abc');
    await page.getByLabel('Variable Length').fill('2');

    // Add TLD via Select
    await page.getByText('Add TLD').click();
    await page.getByRole('option', { name: '.com' }).click();

    // Submit
    await page.getByRole('button', { name: /create campaign/i }).click();

    // Expect redirect to details page with id
    await page.waitForURL('**/campaigns/*', { timeout: 30000 });
    const url = page.url();
    const match = url.match(/\/campaigns\/([\w-]+)/);
    expect(match).not.toBeNull();
    const campaignId = match![1];

    // 3) Attach SSE listener in the browser to capture realtime events
    await page.addInitScript(() => {
      (window as any).__sseEvents = [];
    });
    await page.evaluate((id) => {
      const ES = (window as any).EventSource as any;
      const es = new ES(`/api/v2/sse/campaigns/${id}/events`, { withCredentials: true } as any);
      const store = (evt: MessageEvent, eventType: string) => {
        try {
          const data = JSON.parse(evt.data);
          (window as any).__sseEvents.push({ event: eventType, data, ts: Date.now() });
        } catch (e) {
          (window as any).__sseEvents.push({ event: eventType, raw: evt.data, ts: Date.now() });
        }
      };
  es.onmessage = (evt: any) => store(evt as any, 'message');
      ['campaign_progress','phase_started','phase_completed','phase_failed','domain_generated','domain_validated','analysis_completed','keep_alive','error']
  .forEach((type: string) => es.addEventListener(type, (evt: any) => store(evt as any, type as any)));
      (window as any).__sse = es;
    }, campaignId);

    // Helper to call API via page.request (shares browser cookies)
    const api = async (method: 'GET'|'POST', path: string, body?: any) => {
      const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
      const resp = await (method === 'GET' 
        ? page.request.get(urlPath)
        : page.request.post(urlPath, { data: body ?? {} }));
      const json = await resp.json().catch(() => ({}));
      return { ok: resp.ok(), status: resp.status(), json };
    };

    // 4) Run phases sequentially: discovery → validation → extraction → analysis
    const runPhase = async (phase: string) => {
      // Configure (best-effort empty config)
      const cfg = await api('POST', `/campaigns/${campaignId}/phases/${phase}/configure`, {});
      expect(cfg.ok).toBeTruthy();

      // Start
      const start = await api('POST', `/campaigns/${campaignId}/phases/${phase}/start`, {});
      expect(start.ok).toBeTruthy();

      // Wait for at least one progress or completed event mentioning this phase
      await expect.poll(async () => {
        const events = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
        const hits = events.filter(e => e && (e.event === 'phase_started' || e.event === 'campaign_progress' || e.event === 'phase_completed'))
          .filter(e => JSON.stringify(e).includes(phase));
        return hits.length;
      }, { timeout: 60_000, message: `Expected SSE events for phase ${phase}` }).toBeGreaterThan(0);
    };

    for (const phase of ['discovery','validation','extraction','analysis']) {
      await runPhase(phase);
    }

    // 5) Fetch domains list to ensure data flow
    const domainsResp = await api('GET', `/campaigns/${campaignId}/domains?limit=10`);
    expect(domainsResp.ok).toBeTruthy();

    // 6) Snapshot SSE event summary to console
    const sseEvents = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
    console.log(`SSE events captured: ${sseEvents.length}`);
    const summary = sseEvents.reduce((acc: Record<string, number>, e: any) => {
      acc[e.event] = (acc[e.event] || 0) + 1; return acc;
    }, {} as Record<string, number>);
    console.log('SSE event summary:', summary);

    // Basic assertions: we should have seen started/progress/completed over the run
    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });
});
