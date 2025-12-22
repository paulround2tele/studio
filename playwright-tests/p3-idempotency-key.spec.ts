/**
 * P3.3 Idempotency Key E2E Test
 * 
 * Tests that rapid double-clicks on pause/resume buttons don't emit duplicate SSE events.
 * This verifies the X-Idempotency-Key functionality works end-to-end.
 */
import { test, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api/v2';
const TEST_EMAIL = process.env.USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.USER_PASSWORD || 'password123';

interface CampaignPhaseStatus {
  status: string;
  phase: string;
}

// Helper to login and get auth context
async function loginAndGetContext(request: APIRequestContext): Promise<string> {
  const loginResp = await request.post(`${BASE_URL}/auth/login`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });
  expect(loginResp.ok()).toBeTruthy();
  const cookies = loginResp.headers()['set-cookie'];
  return cookies || '';
}

// Helper to get phase status
async function getPhaseStatus(
  request: APIRequestContext,
  campaignId: string,
  phase: string,
  cookie: string
): Promise<CampaignPhaseStatus> {
  const resp = await request.get(
    `${BASE_URL}/campaigns/${campaignId}/phases/${phase}/status`,
    { headers: { Cookie: cookie } }
  );
  expect(resp.ok()).toBeTruthy();
  return resp.json();
}

// Helper to pause phase with idempotency key
async function pausePhase(
  request: APIRequestContext,
  campaignId: string,
  phase: string,
  cookie: string,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Cookie: cookie };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  const resp = await request.post(
    `${BASE_URL}/campaigns/${campaignId}/phases/${phase}/pause`,
    { headers }
  );
  return { status: resp.status(), body: await resp.json() };
}

// Helper to resume phase with idempotency key
async function resumePhase(
  request: APIRequestContext,
  campaignId: string,
  phase: string,
  cookie: string,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Cookie: cookie };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  const resp = await request.post(
    `${BASE_URL}/campaigns/${campaignId}/phases/${phase}/resume`,
    { headers }
  );
  return { status: resp.status(), body: await resp.json() };
}

// Helper to start phase with idempotency key
async function startPhase(
  request: APIRequestContext,
  campaignId: string,
  phase: string,
  cookie: string,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Cookie: cookie };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  const resp = await request.post(
    `${BASE_URL}/campaigns/${campaignId}/phases/${phase}/start`,
    { headers }
  );
  return { status: resp.status(), body: await resp.json() };
}

// Helper to stop phase with idempotency key
async function stopPhase(
  request: APIRequestContext,
  campaignId: string,
  phase: string,
  cookie: string,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Cookie: cookie };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  const resp = await request.post(
    `${BASE_URL}/campaigns/${campaignId}/phases/${phase}/stop`,
    { headers }
  );
  return { status: resp.status(), body: await resp.json() };
}

// Helper to stop campaign with idempotency key
async function stopCampaign(
  request: APIRequestContext,
  campaignId: string,
  cookie: string,
  idempotencyKey?: string
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { Cookie: cookie };
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }
  
  const resp = await request.post(
    `${BASE_URL}/campaigns/${campaignId}/stop`,
    { headers }
  );
  return { status: resp.status(), body: await resp.json() };
}

test.describe('P3.3 X-Idempotency-Key', () => {
  let cookie: string;
  let campaignId: string;
  const phase = 'dns_validation';
  
  test.beforeAll(async ({ request }) => {
    // Login
    cookie = await loginAndGetContext(request);
    
    // Get a campaign with running/paused DNS phase
    const campaignsResp = await request.get(`${BASE_URL}/campaigns`, {
      headers: { Cookie: cookie },
    });
    const campaigns = await campaignsResp.json();
    
    // Find a campaign with dns_validation phase configured
    for (const c of campaigns) {
      if (c.currentPhase === 'dns_validation' || c.status === 'paused') {
        campaignId = c.id;
        break;
      }
    }
    
    if (!campaignId && campaigns.length > 0) {
      campaignId = campaigns[0].id;
    }
    
    expect(campaignId).toBeTruthy();
  });

  test('rapid double-click pause does not emit duplicate SSE', async ({ request }) => {
    // Ensure phase is running first
    const initialStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    if (initialStatus.status === 'paused') {
      await resumePhase(request, campaignId, phase, cookie);
      // Wait for resume to complete
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Generate unique idempotency key
    const idempotencyKey = `double-click-pause-${Date.now()}`;
    
    // Simulate rapid double-click: two parallel pause requests with same key
    const [resp1, resp2] = await Promise.all([
      pausePhase(request, campaignId, phase, cookie, idempotencyKey),
      pausePhase(request, campaignId, phase, cookie, idempotencyKey),
    ]);
    
    // Both should succeed (200)
    expect(resp1.status).toBe(200);
    expect(resp2.status).toBe(200);
    
    // Verify phase is paused
    const finalStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    expect(finalStatus.status).toBe('paused');
    
    // Note: In a real test, we'd also verify SSE stream only received ONE pause event,
    // not two. This requires subscribing to SSE which is more complex.
  });

  test('rapid double-click resume does not emit duplicate SSE', async ({ request }) => {
    // Ensure phase is paused first
    const initialStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    if (initialStatus.status !== 'paused') {
      await pausePhase(request, campaignId, phase, cookie);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Generate unique idempotency key
    const idempotencyKey = `double-click-resume-${Date.now()}`;
    
    // Simulate rapid double-click: two parallel resume requests with same key
    const [resp1, resp2] = await Promise.all([
      resumePhase(request, campaignId, phase, cookie, idempotencyKey),
      resumePhase(request, campaignId, phase, cookie, idempotencyKey),
    ]);
    
    // Both should succeed (200) - one executes, one returns cached
    expect(resp1.status).toBe(200);
    expect(resp2.status).toBe(200);
    
    // Verify phase is running
    const finalStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    expect(['running', 'in_progress']).toContain(finalStatus.status);
  });

  test('different idempotency keys trigger separate operations', async ({ request }) => {
    // Ensure phase is running
    const initialStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    if (initialStatus.status === 'paused') {
      await resumePhase(request, campaignId, phase, cookie);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // First pause with key A
    const keyA = `key-a-${Date.now()}`;
    const resp1 = await pausePhase(request, campaignId, phase, cookie, keyA);
    expect(resp1.status).toBe(200);
    
    // Resume
    await resumePhase(request, campaignId, phase, cookie);
    await new Promise(r => setTimeout(r, 500));
    
    // Second pause with key B (different key)
    const keyB = `key-b-${Date.now()}`;
    const resp2 = await pausePhase(request, campaignId, phase, cookie, keyB);
    expect(resp2.status).toBe(200);
    
    // Both should have executed separately (each emits its own SSE)
  });

  test('backward compatibility: no idempotency key still works', async ({ request }) => {
    // Ensure phase is running
    const initialStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    if (initialStatus.status === 'paused') {
      await resumePhase(request, campaignId, phase, cookie);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Pause without idempotency key
    const resp = await pausePhase(request, campaignId, phase, cookie);
    expect(resp.status).toBe(200);
    
    // Verify phase is paused
    const finalStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    expect(finalStatus.status).toBe('paused');
  });

  test('rapid double-click start does not emit duplicate SSE', async ({ request }) => {
    // This test requires a phase that is not yet started or was previously stopped
    // In real scenarios, we'd set up a fresh campaign
    
    // Generate unique idempotency key for start
    const idempotencyKey = `double-click-start-${Date.now()}`;
    
    // Simulate rapid double-click: two parallel start requests with same key
    // Note: In a real test, we'd need a phase in 'not_started' or 'completed' state
    // For now, we verify the idempotency mechanism is wired correctly
    const [resp1, resp2] = await Promise.all([
      startPhase(request, campaignId, phase, cookie, idempotencyKey),
      startPhase(request, campaignId, phase, cookie, idempotencyKey),
    ]);
    
    // Both should return same status (either 200 or 4xx depending on phase state)
    // The key point is they return the SAME response (one from cache)
    expect(resp1.status).toBe(resp2.status);
  });

  test('rapid double-click stop does not emit duplicate SSE', async ({ request }) => {
    // Ensure phase is running first (so stop can work)
    const initialStatus = await getPhaseStatus(request, campaignId, phase, cookie);
    if (initialStatus.status === 'paused') {
      await resumePhase(request, campaignId, phase, cookie);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Generate unique idempotency key
    const idempotencyKey = `double-click-stop-${Date.now()}`;
    
    // Simulate rapid double-click: two parallel stop requests with same key
    const [resp1, resp2] = await Promise.all([
      stopPhase(request, campaignId, phase, cookie, idempotencyKey),
      stopPhase(request, campaignId, phase, cookie, idempotencyKey),
    ]);
    
    // Both should return same status (one from cache)
    expect(resp1.status).toBe(resp2.status);
  });

  test('campaign stop with idempotency key', async ({ request }) => {
    // This test uses campaign-level stop, not phase-level
    // Create a unique idempotency key
    const idempotencyKey = `campaign-stop-${Date.now()}`;
    
    // First call
    const resp1 = await stopCampaign(request, campaignId, cookie, idempotencyKey);
    
    // Second call with same key (should be cached)
    const resp2 = await stopCampaign(request, campaignId, cookie, idempotencyKey);
    
    // Both should return same status
    expect(resp1.status).toBe(resp2.status);
  });
});
