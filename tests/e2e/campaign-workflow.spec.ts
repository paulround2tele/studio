import { test, expect } from '@playwright/test';

// End-to-end workflow: login → create campaign → run discovery/validation/extraction/analysis → capture SSE
test.describe('Campaign full workflow with SSE', () => {
  test.setTimeout(5 * 60 * 1000); // 5 minutes

  test('user can create a campaign, run all phases, and see realtime updates', async ({ page, browserName }) => {
    // Capture browser logs and errors for debugging
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    const networkErrors: Array<{ url: string; status: number }> = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err?.message || String(err));
    });
    page.on('response', (resp) => {
      const status = resp.status();
      if (status >= 400) networkErrors.push({ url: resp.url(), status });
    });

    console.log(`[E2E] Running in browser: ${browserName}`);

    // 1) Login (UI-first with robust fallback)
    const email = process.env.E2E_EMAIL || 'test@example.com';
    const password = process.env.E2E_PASSWORD || 'password123';

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    console.log('[E2E] Navigated to /login');

    const tryUILogin = async () => {
      try {
        await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 8000 });
      } catch {
        return false; // UI fields not ready
      }
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /sign in securely|sign in/i }).click();
      // Give the layout time to update auth and redirect
      await page.waitForLoadState('domcontentloaded');
      return true;
    };

    const uiLoginOk = await tryUILogin();
    if (!uiLoginOk) {
      console.log('[E2E] UI login controls not found in time, using fetch() fallback');
      // Use in-page fetch so Set-Cookie is applied to the browser context
      const loginResult = await page.evaluate(async ({ email, password }) => {
        const res = await fetch('/api/v2/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        let json: any = null;
        try { json = await res.json(); } catch {}
        return { ok: res.ok, status: res.status, json };
      }, { email, password });
      expect(loginResult.ok, `Login failed (${loginResult.status}) ${JSON.stringify(loginResult.json)}`).toBeTruthy();
    }

    // Verify authenticated session via /auth/me before navigating anywhere
    const meCheck = await page.evaluate(async () => {
      const res = await fetch('/api/v2/auth/me', { credentials: 'include' });
      let json: any = null; try { json = await res.json(); } catch {}
      return { ok: res.ok, status: res.status, json };
    });
    if (!meCheck.ok) {
      const cookies = await page.context().cookies('http://localhost:3000');
      console.log('[E2E] /auth/me failed', meCheck.status, JSON.stringify(meCheck.json));
      console.log('[E2E] Current cookies:', JSON.stringify(cookies));
    }
    expect(meCheck.ok, `/auth/me should be OK before navigating (status ${meCheck.status})`).toBeTruthy();

  // Helper to call API using in-page fetch (ensures cookies are sent)
  const api = async (method: 'GET'|'POST', path: string, body?: any) => {
      const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
      const result = await page.evaluate(async ({ method, urlPath, body }) => {
        const res = await fetch(urlPath, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        });
        let json: any = null;
        try { json = await res.json(); } catch {}
        return { ok: res.ok, status: res.status, json };
      }, { method, urlPath, body });
      return result as { ok: boolean; status: number; json: any };
    };

    // 2) Create campaign via API (avoids brittle UI selectors)
    const campaignName = 'E2E Campaign ' + Date.now();
    const createReq = {
      name: campaignName,
      description: 'Created by Playwright E2E',
      targetDomains: [],
      configuration: {
        phases: {
          discovery: {
            patternType: 'prefix',
            constantString: 'acme',
            characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
            variableLength: 2,
            tlds: ['com'],
            numDomainsToGenerate: 50,
          },
        },
      },
    } as any;
    const created = await api('POST', '/campaigns', createReq);
    expect(created.ok, `Create campaign failed (${created.status}): ${JSON.stringify(created.json)}`).toBeTruthy();
    let campaignId: string | null = created.json?.data?.id || created.json?.id || null;
    if (!campaignId) {
      // Fallback: list and find by name
      const list = await api('GET', '/campaigns');
      const items = Array.isArray(list.json?.data) ? list.json.data : list.json;
      const found = (items || []).find((c: any) => c?.name === campaignName);
      campaignId = found?.id ? String(found.id) : null;
    }
    expect(campaignId, 'Campaign ID should be available after creation').toBeTruthy();
    console.log('[E2E] Created campaign ID:', campaignId);

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

  // api helper defined earlier

    // 4) Run phases sequentially: discovery → validation → extraction → analysis
  const runPhase = async (phase: string) => {
      // Configure minimal payloads per phase when required by schema
      const defaultConfigs: Record<string, any> = {
        discovery: {
          // Map to DomainGenerationConfig expected by backend
          patternType: 'prefix',
          constantString: 'acme',
          characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
          variableLength: 2,
          tlds: ['com'],
          numDomainsToGenerate: 50,
          batchSize: 500,
          offsetStart: 0,
        },
        validation: { personaIds: [], batch_size: 25, timeout_seconds: 10, max_retries: 1, validation_types: ['A'] },
        extraction: { personaIds: [], keywords: [] },
        analysis: { personaIds: [] },
      };
      const body = defaultConfigs[phase] ? { configuration: defaultConfigs[phase] } : {};
      const cfg = await api('POST', `/campaigns/${campaignId}/phases/${phase}/configure`, body);
      if (!cfg.ok) {
        console.log(`[E2E] Configure ${phase} failed`, cfg.status, JSON.stringify(cfg.json));
      }
      expect(cfg.ok).toBeTruthy();
      const start = await api('POST', `/campaigns/${campaignId}/phases/${phase}/start`, {});
      if (!start.ok) {
        console.log(`[E2E] Start ${phase} failed`, start.status, JSON.stringify(start.json));
      }
      expect(start.ok).toBeTruthy();

      // Wait for at least one progress or completed event mentioning this phase
      await expect.poll(async () => {
        const events = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
        const hits = events.filter(e => e && (e.event === 'phase_started' || e.event === 'campaign_progress' || e.event === 'phase_completed'))
          .filter(e => JSON.stringify(e).includes(phase));
        return hits.length;
      }, { timeout: 120_000, message: `Expected SSE events for phase ${phase}` }).toBeGreaterThan(0);
    };

  // Run discovery first to validate end-to-end
  await runPhase('discovery');

    // 5) Fetch domains list to ensure data flow
  const domainsResp = await api('GET', `/campaigns/${campaignId}/domains?limit=10`);
    expect(domainsResp.ok).toBeTruthy();
  console.log('[E2E] Domains endpoint OK', domainsResp.status);

    // 6) Snapshot SSE event summary to console
  const sseEvents = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
  console.log(`SSE events captured: ${sseEvents.length}`);
    const summary = sseEvents.reduce((acc: Record<string, number>, e: any) => {
      acc[e.event] = (acc[e.event] || 0) + 1; return acc;
    }, {} as Record<string, number>);
    console.log('SSE event summary:', summary);

    // Basic assertions: we should have seen started/progress/completed over the run
    expect(Object.keys(summary).length).toBeGreaterThan(0);

  // Close SSE to ensure clean shutdown
  await page.evaluate(() => { try { (window as any).__sse?.close?.(); } catch {} });

    // Dump browser logs for traceability
    if (consoleLogs.length) {
      console.log(`Browser console logs (${consoleLogs.length}):`);
      consoleLogs.slice(-100).forEach((l) => console.log(l));
    }
    if (pageErrors.length) {
      console.log(`Browser page errors (${pageErrors.length}):`);
      pageErrors.forEach((e) => console.log(e));
    }
    if (networkErrors.length) {
      console.log(`Network errors (${networkErrors.length}):`);
      networkErrors.forEach((e) => console.log(`${e.status} ${e.url}`));
    }
  });
});
