import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export default async function globalTeardown() {
  try {
    const pidFile = resolve(process.cwd(), '.playwright-backend.pid');
    const pidStr = readFileSync(pidFile, 'utf8').trim();
    if (pidStr) {
      const pid = parseInt(pidStr, 10);
      try {
        process.kill(-pid, 'SIGTERM');
        console.log(`[global-teardown] Stopped backend process group ${pid}`);
      } catch (e) {
        console.log('[global-teardown] Could not stop backend process:', e);
      }
    }
    try { rmSync(pidFile, { force: true }); } catch {}
  } catch {}
}
