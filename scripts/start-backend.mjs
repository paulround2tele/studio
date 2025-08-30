#!/usr/bin/env node
import net from 'node:net';
import { spawn } from 'node:child_process';

const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const PORT = parseInt(process.env.BACKEND_PORT || '8080', 10);

function checkPort(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => { try { socket.destroy(); } catch {} resolve(false); };
    socket.setTimeout(timeoutMs);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => { try { socket.end(); } catch {} resolve(true); });
  });
}

const alreadyUp = await checkPort(HOST, PORT);
if (alreadyUp) {
  console.log(`[start-backend] Backend already running on ${HOST}:${PORT}`);
  process.exit(0);
}

console.log('[start-backend] Starting backend: go run ./cmd/apiserver');
const child = spawn('bash', ['-lc', 'cd backend && go run ./cmd/apiserver'], { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  console.log(`[start-backend] Backend process exited with code ${code} signal ${signal}`);
  process.exit(code ?? 0);
});
