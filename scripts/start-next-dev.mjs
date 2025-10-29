#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_LOG_PATH = 'logs/next-dev.log';

function timestamp() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!dir || dir === '.' || dir === '/') {
    return;
  }
  mkdirSync(dir, { recursive: true });
}

function normaliseLogPath(rawPath) {
  if (!rawPath || !rawPath.trim()) {
    return resolve(process.cwd(), DEFAULT_LOG_PATH);
  }
  return resolve(process.cwd(), rawPath.trim());
}

function wireStream(source, targetStream, logStream, label) {
  source.on('data', (chunk) => {
    const text = chunk.toString();
    targetStream.write(chunk);
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      logStream.write(`[${timestamp()}] [${label}] ${line}\n`);
    }
  });
}

function main() {
  const logPath = normaliseLogPath(process.env.NEXT_DEV_LOG_PATH || process.env.NEXT_LOG_PATH);
  ensureDir(logPath);
  const logStream = createWriteStream(logPath, { flags: 'a' });

  console.info(`[next-dev] writing log output to ${logPath}`);

  const nextBin = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'dev'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  wireStream(child.stdout, process.stdout, logStream, 'STDOUT');
  wireStream(child.stderr, process.stderr, logStream, 'STDERR');

  child.on('exit', (code, signal) => {
    const exitMsg = `[${timestamp()}] [process] next dev exited with code=${code} signal=${signal || 'null'}\n`;
    logStream.write(exitMsg);
    logStream.end();
    if (code !== null) {
      process.exit(code);
    } else if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(0);
    }
  });

  const terminate = (sig) => {
    if (!child.killed) {
      child.kill(sig);
    }
  };

  process.on('SIGINT', () => terminate('SIGINT'));
  process.on('SIGTERM', () => terminate('SIGTERM'));
}

main();
