// Default to project-local browser cache so the script works on fresh hosts.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

const { chromium } = await import('playwright');

const CAMPAIGN_ID = process.env.CAMPAIGN_ID || '5a3f6fb3-db6c-4b97-9653-677bcbc0e214';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = process.env.USER_EMAIL || 'test@example.com';
const LOGIN_PASSWORD = process.env.USER_PASSWORD || 'password123';
const WAIT_MS = Number(process.env.SSE_WAIT_MS || 20000);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 60000);
const WAIT_UNTIL = process.env.PW_WAIT_UNTIL || 'domcontentloaded';
const isSSEUrl = (url) => url.includes('/api/v2/sse');

async function waitForConsoleMatch(page, pattern, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      page.off('console', onConsole);
      resolve(null);
    }, timeoutMs);
    const onConsole = (msg) => {
      const text = msg.text();
      if (!pattern.test(text)) return;
      if (done) return;
      done = true;
      clearTimeout(timer);
      page.off('console', onConsole);
      resolve(text);
    };
    page.on('console', onConsole);
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

  const sseNetworkLog = [];
  const recordSSEEvent = (entry) => {
    sseNetworkLog.push({ timestamp: new Date().toISOString(), ...entry });
  };

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error('[pageerror]', err);
  });
  page.on('request', (request) => {
    if (!isSSEUrl(request.url())) return;
    recordSSEEvent({
      kind: 'request-start',
      url: request.url(),
      method: request.method(),
      resourceType: typeof request.resourceType === 'function' ? request.resourceType() : 'unknown',
      headers: request.headers()
    });
  });
  page.on('response', (response) => {
    if (!isSSEUrl(response.url())) return;
    recordSSEEvent({
      kind: 'response',
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      resourceType: typeof response.request === 'function' ? response.request().resourceType() : 'unknown',
      headers: response.headers()
    });
  });
  page.on('requestfailed', (request) => {
    if (!isSSEUrl(request.url())) return;
    recordSSEEvent({
      kind: 'request-failed',
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'unknown'
    });
  });

  console.log(`Navigating to login page (${BASE_URL})...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: WAIT_UNTIL });

  const emailInput = page.locator('[data-testid="auth-login-email"]');
  const passwordInput = page.locator('[data-testid="auth-login-password"]');
  const submitButton = page.locator('button[type="submit"]');
  try {
    await emailInput.waitFor({ state: 'visible' });
    await passwordInput.waitFor({ state: 'visible' });
  } catch (err) {
    console.error('[login] failed to find login inputs; dumping diagnostics');
    console.error('[login] current url:', page.url());
    try {
      console.error('[login] title:', await page.title());
    } catch {
      // ignore
    }
    try {
      await page.screenshot({ path: 'playwright-login-timeout.png', fullPage: true });
      console.error('[login] screenshot saved: playwright-login-timeout.png');
    } catch {
      // ignore
    }
    try {
      const bodyText = await page.locator('body').innerText();
      console.error('[login] body text (first 400 chars):', (bodyText || '').slice(0, 400));
    } catch {
      // ignore
    }
    throw err;
  }

  await emailInput.fill(LOGIN_EMAIL);
  await passwordInput.fill(LOGIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/dashboard/),
    submitButton.click()
  ]);
  console.log('Logged in, navigating to campaign...');
  await page.goto(`${BASE_URL}/campaigns/${CAMPAIGN_ID}`, { waitUntil: WAIT_UNTIL });
  await page.waitForURL(new RegExp(`/campaigns/${CAMPAIGN_ID}`));

  // Report the UI SSE status label (Connecting… / Live / Reconnecting… / Disconnected (...))
  // This is derived from useCampaignPhaseStream's isConnected/hasEverConnected/error.
  const uiSseLabelLocator = page.locator('div.flex.justify-between.items-center.mb-6 span').last();
  const initialUiLabel = await uiSseLabelLocator.textContent().catch(() => null);
  console.log('[ui] SSE status label (initial):', initialUiLabel);

  // Wait for the useSSE onopen confirmation (prints: ✅ SSE Connected to ...)
  const connectedLog = await waitForConsoleMatch(page, /✅ SSE Connected to /, Math.min(WAIT_MS, 30000));
  if (connectedLog) {
    console.log('[console] observed:', connectedLog);
  } else {
    console.log('[console] did NOT observe SSE onopen (✅ SSE Connected ...) within timeout');
  }

  // Direct EventSource smoke test (bypasses app code) to prove whether EventSource works in this headless session.
  // If this opens but the app stays "Connecting…", the issue is in app lifecycle/state, not the backend.
  const directSseUrl = `http://localhost:8080/api/v2/sse/campaigns/${CAMPAIGN_ID}/events`;
  console.log('[pw] direct EventSource smoke test:', directSseUrl);
  const directResult = await page
    .evaluate((sseUrl) => {
      return new Promise((resolve) => {
        try {
          const es = new EventSource(sseUrl, { withCredentials: true });
          let settled = false;
          const done = (value) => {
            if (settled) return;
            settled = true;
            try {
              es.close();
            } catch {
              // ignore
            }
            resolve(value);
          };
          es.onopen = () => done({ ok: true, kind: 'open', readyState: es.readyState });
          es.onerror = () => done({ ok: false, kind: 'error', readyState: es.readyState });
          es.onmessage = () => done({ ok: true, kind: 'message', readyState: es.readyState });
          setTimeout(() => done({ ok: false, kind: 'timeout', readyState: es.readyState }), 5000);
        } catch (e) {
          resolve({ ok: false, kind: 'exception', message: String(e?.message || e) });
        }
      });
    }, directSseUrl)
    .catch((err) => ({ ok: false, kind: 'evaluate-failed', message: String(err?.message || err) }));
  console.log('[pw] direct EventSource result:', JSON.stringify(directResult));

  console.log(`Waiting ${WAIT_MS}ms to collect console output...`);
  await page.waitForTimeout(WAIT_MS);

  const finalUiLabel = await uiSseLabelLocator.textContent().catch(() => null);
  console.log('[ui] SSE status label (final):', finalUiLabel);

  if (sseNetworkLog.length === 0) {
    console.log('No SSE network events recorded.');
  } else {
    console.log('--- SSE network events ---');
    sseNetworkLog.forEach((entry, index) => {
      console.log(`[${index + 1}] ${JSON.stringify(entry)}`);
    });
  }
  await browser.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
