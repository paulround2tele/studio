import { test, expect } from '@playwright/test';

// Full pipeline test: discovery -> validation -> extraction -> analysis on a small (10 domains) batch
test.describe('Campaign full pipeline all phases (10-domain batch)', () => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes

  test('user can run all phases sequentially', async ({ page }) => {
    const email = process.env.E2E_EMAIL || 'test@example.com';
    const password = process.env.E2E_PASSWORD || 'password123';

    // Simple API helper using in-page fetch to preserve cookies
    const api = async (method: 'GET'|'POST', path: string, body?: any) => {
      const urlPath = path.startsWith('/api') ? path : `/api/v2${path}`;
      const result = await page.evaluate(async ({ method, urlPath, body }) => {
        const res = await fetch(urlPath, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        });
        let json: any = null; try { json = await res.json(); } catch {}
        return { ok: res.ok, status: res.status, json };
      }, { method, urlPath, body });
      return result as { ok: boolean; status: number; json: any };
    };

    // 1. Login (UI first then fallback; ensure cookie set)
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    let uiTried = false;
    try {
      await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /sign in securely|sign in/i }).click();
      await page.waitForTimeout(1000);
      uiTried = true;
    } catch {}
    if (!uiTried) {
      const login = await api('POST', '/auth/login', { email, password });
      expect(login.ok, `Fallback login failed (${login.status})`).toBeTruthy();
    }
    const me = await api('GET', '/auth/me');
    if (!me.ok) {
      const cookies = await page.context().cookies();
      console.log('[E2E] /auth/me failed status', me.status, 'body:', JSON.stringify(me.json));
      console.log('[E2E] Cookies:', JSON.stringify(cookies));
    }
    expect(me.ok, '/auth/me should succeed').toBeTruthy();

    // 2. Create required personas (dns + http). If creation conflicts, list & reuse.
    const personaIds: string[] = [];
    const mkPersona = async (personaType: 'dns'|'http') => {
      const name = `E2E-${personaType}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      const created = await api('POST', '/personas', { name, description: 'e2e persona', personaType });
      if (created.ok) {
        const id = created.json?.data?.id || created.json?.id; if (id) return id as string;
      }
      // fallback: list
      const list = await api('GET', '/personas');
      const found = (list.json?.data || list.json || []).find((p: any) => p?.personaType === personaType);
      expect(found, `Should have at least one ${personaType} persona`).toBeTruthy();
      return String(found.id);
    };
    const dnsPersonaId = await mkPersona('dns');
    const httpPersonaId = await mkPersona('http');
    personaIds.push(dnsPersonaId, httpPersonaId);

    // 3. Create campaign with discovery config (10 domains)
    const campaignName = 'FullPipeline ' + Date.now();
    const createReq = {
      name: campaignName,
      description: 'Full pipeline e2e',
      configuration: {
        phases: {
          discovery: {
            patternType: 'prefix',
            constantString: 'acme',
            characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
            variableLength: 1,
            tlds: ['com'],
            numDomainsToGenerate: 10,
            batchSize: 100,
            offsetStart: 0,
          },
        },
      },
    } as any;
    const created = await api('POST', '/campaigns', createReq);
    expect(created.ok, `Create campaign failed (${created.status})`).toBeTruthy();
    let campaignId: string | null = created.json?.data?.id || created.json?.id || null;
    if (!campaignId) {
      const list = await api('GET', '/campaigns');
      const items = Array.isArray(list.json?.data) ? list.json.data : list.json;
      const found = (items || []).find((c: any) => c?.name === campaignName);
      campaignId = found?.id ? String(found.id) : null;
    }
    expect(campaignId).toBeTruthy();

    // 4. Attach SSE listener
    await page.addInitScript(() => { (window as any).__sseEvents = []; });
    await page.evaluate((id) => {
      const es = new EventSource(`/api/v2/sse/campaigns/${id}/events`, { withCredentials: true } as any);
      const store = (evt: MessageEvent, eventType: string) => {
        try { (window as any).__sseEvents.push({ event: eventType, data: JSON.parse(evt.data), ts: Date.now() }); }
        catch { (window as any).__sseEvents.push({ event: eventType, raw: evt.data, ts: Date.now() }); }
      };
      ['campaign_progress','phase_started','phase_completed','phase_failed','domain_generated','domain_validated','analysis_completed','keep_alive','error']
        .forEach((type: string) => es.addEventListener(type, (evt: any) => store(evt as any, type)));
      (window as any).__sse = es;
    }, campaignId);

    // Helper to run & wait for phase SSE activity
    const runPhase = async (phase: 'discovery'|'validation'|'extraction'|'analysis') => {
      const configMap: Record<string, any> = {
        discovery: {
          patternType: 'prefix', constantString: 'acme', characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
          variableLength: 1, tlds: ['com'], numDomainsToGenerate: 10, batchSize: 100, offsetStart: 0,
        },
        validation: {
          personaIds: [dnsPersonaId], batchSize: 25, timeout: 10, maxRetries: 1, validation_types: ['A'],
        },
        extraction: {
          personaIds: [httpPersonaId], keywords: ['login','portal'],
        },
        analysis: {
          personaIds: [httpPersonaId], includeExternal: false,
        },
      };
  // Backend expects { configuration: { phases: { [phase]: <config> } } } shape
  const cfgBody = { configuration: { phases: { [phase]: configMap[phase] } } } as any;
  const cfg = await api('POST', `/campaigns/${campaignId}/phases/${phase}/configure`, cfgBody);
      expect(cfg.ok, `Configure ${phase} failed ${cfg.status}`).toBeTruthy();
      const start = await api('POST', `/campaigns/${campaignId}/phases/${phase}/start`, {});
      expect(start.ok, `Start ${phase} failed ${start.status}`).toBeTruthy();
      await expect.poll(async () => {
        const events = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
        const relevant = events.filter(e => ['phase_started','campaign_progress','phase_completed','phase_failed'].includes(e.event) && JSON.stringify(e).includes(`"phase":"${phase}"`));
        return relevant.some(e => e.event === 'phase_completed') ? 'done' : relevant.length > 0 ? 'progress' : '';
      }, { timeout: 180_000, message: `Waiting for ${phase} phase events` }).toBe('done');
    };

    // 5. Run phases sequentially
    await runPhase('discovery');
    // Verify domains list limited to <= 10
    const domains = await api('GET', `/campaigns/${campaignId}/domains?limit=10`);
    expect(domains.ok).toBeTruthy();
    const domainItems = domains.json?.data || domains.json || [];
    expect(domainItems.length).toBeGreaterThan(0);
    expect(domainItems.length).toBeLessThanOrEqual(10);

    await runPhase('validation');
    await runPhase('extraction');
    await runPhase('analysis');

    // 6. Summarize SSE events
    const summary = await page.evaluate(() => {
      const events = (window as any).__sseEvents as Array<any>;
      return events.reduce((acc: Record<string, number>, e: any) => { acc[e.event] = (acc[e.event]||0)+1; return acc; }, {} as Record<string, number>);
    });
    // Ensure we saw completion events for all phases
    ['discovery','validation','extraction','analysis'].forEach(phase => {
      // We'll assert at least one phase_completed event contains the phase string
    });
    const eventsRaw = await page.evaluate(() => (window as any).__sseEvents as Array<any>);
    for (const phase of ['discovery','validation','extraction','analysis']) {
      expect(eventsRaw.some(e => e.event === 'phase_completed' && JSON.stringify(e).includes(`"phase":"${phase}"`)), `Missing phase_completed for ${phase}`).toBeTruthy();
    }

    // Close SSE
    await page.evaluate(() => { try { (window as any).__sse?.close?.(); } catch {} });

    // Basic sanity: summary should include phase_completed
    expect(summary['phase_completed'] || 0).toBeGreaterThanOrEqual(4);
  });
});
