import net from 'node:net';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
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

export default async function globalSetup() {
  const HOST = process.env.BACKEND_HOST || '127.0.0.1';
  const PORT = parseInt(process.env.BACKEND_PORT || '8080', 10);

  if (await checkPort(HOST, PORT)) {
    console.log(`[global-setup] Backend already up at http://${HOST}:${PORT}`);
    return;
  }

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
}
