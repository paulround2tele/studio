import net from 'node:net';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function checkPort(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return await new Promise((resolveReady) => {
    const socket = new net.Socket();
    const onError = () => { try { socket.destroy(); } catch {} resolveReady(false); };
    socket.setTimeout(timeoutMs);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => { try { socket.end(); } catch {} resolveReady(true); });
  });
}

async function waitForPort(host: string, port: number, totalTimeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < totalTimeoutMs) {
    if (await checkPort(host, port, 1000)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return await res.json();
}

async function ensureCampaign(base: string): Promise<string> {
  // Try list first
  try {
    const list = await fetchJson(`${base}/campaigns`);
    const existing = list?.data?.[0]?.id;
    if (existing) {
      console.log(`[global-setup] Reusing existing campaign ${existing}`);
      return existing;
    }
  } catch (e) {
    console.warn('[global-setup] listing campaigns failed, will attempt create', e);
  }
  // Create minimal campaign (schema assumes POST /campaigns)
  const createBody = { name: `pw-campaign-${Date.now()}` };
  const res = await fetch(`${base}/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(createBody) });
  if (!res.ok) throw new Error(`[global-setup] campaign create failed: ${res.status}`);
  const json = await res.json();
  const id = json?.data?.id || json?.data?.campaign?.id;
  if (!id) throw new Error('[global-setup] could not determine created campaign id');
  console.log(`[global-setup] Created campaign ${id}`);
  return id;
}

// Bootstrap minimal personas (dns + http) so phase config forms have selectable entries.
// Returns a map of personaType -> id (best-effort; failures are logged but non-fatal).
async function bootstrapPersonas(base: string): Promise<Record<string,string>> {
  const created: Record<string,string> = {};
  const listExisting = async () => {
    try {
      const res = await fetch(`${base}/personas`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return [] as any[];
      const json = await res.json();
      return (json?.data || json || []) as any[];
    } catch { return [] as any[]; }
  };
  const ensureType = async (personaType: 'dns'|'http') => {
    const existing = (await listExisting()).find(p => p?.personaType === personaType);
    if (existing?.id) { created[personaType] = String(existing.id); return; }
    try {
      const body = { name: `pw-${personaType}-persona-${Date.now().toString().slice(-6)}`, description: 'playwright bootstrap', personaType, isEnabled: true } as any;
      const res = await fetch(`${base}/personas`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const json = await res.json();
        const id = json?.data?.id || json?.id;
        if (id) { created[personaType] = String(id); return; }
      } else {
        console.warn(`[global-setup] persona create ${personaType} failed status ${res.status}`);
      }
    } catch (e) {
      console.warn('[global-setup] persona create error', personaType, e);
    }
    // Retry list once more to see if another concurrent process created one.
    const retry = (await listExisting()).find(p => p?.personaType === personaType);
    if (retry?.id) created[personaType] = String(retry.id);
  };
  await ensureType('dns');
  await ensureType('http');
  return created;
}

export default async function globalSetup() {
  const HOST = process.env.BACKEND_HOST || '127.0.0.1';
  const PORT = parseInt(process.env.BACKEND_PORT || '8080', 10);

  let started = false;
  if (await checkPort(HOST, PORT)) {
    console.log(`[global-setup] Backend already up at http://${HOST}:${PORT}`);
  } else {
    console.log('[global-setup] Starting backend: go run ./cmd/apiserver');
    const child = spawn('bash', ['-lc', 'cd backend && go run ./cmd/apiserver'], {
      stdio: 'inherit',
      detached: true,
    });
    const ok = await waitForPort(HOST, PORT, 45000);
    if (!ok) {
      try { process.kill(-child.pid!, 'SIGTERM'); } catch {}
      throw new Error('[global-setup] Backend failed to start within timeout');
    }
    const pidFile = resolve(process.cwd(), '.playwright-backend.pid');
    writeFileSync(pidFile, String(child.pid ?? ''), { encoding: 'utf8' });
    console.log(`[global-setup] Backend started (pid ${child.pid}), recorded in ${pidFile}`);
    started = true;
  }

  // Ensure campaign fixture
  const apiBase = `http://${HOST}:${PORT}/api/v2`;
  let campaignId: string;
  try {
    campaignId = await ensureCampaign(apiBase);
  } catch (e) {
    console.warn('[global-setup] Failed to ensure campaign:', e);
    throw e;
  }

  // Persona bootstrap (optional)
  const personas = await bootstrapPersonas(apiBase);
  if (Object.keys(personas).length) {
    console.log('[global-setup] Bootstrapped personas:', personas);
  } else {
    console.log('[global-setup] No personas bootstrapped (may already exist or endpoint unavailable)');
  }

  // Expose to tests via dotenv-style file consumed by Playwright worker process
  const envFile = resolve(process.cwd(), '.playwright-env');
  const extra = Object.entries(personas).map(([k,v]) => `PLAYWRIGHT_${k.toUpperCase()}_PERSONA_ID=${v}`).join('\n');
  writeFileSync(envFile, `PLAYWRIGHT_CAMPAIGN_ID=${campaignId}\n${extra}\n`, { encoding: 'utf8' });
  console.log(`[global-setup] Wrote campaign id to ${envFile}`);
}
