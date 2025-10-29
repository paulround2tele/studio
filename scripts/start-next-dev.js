#!/usr/bin/env node

/**
 * Wrapper around `next dev` that mirrors stdout/stderr into a log file.
 * This enables persistent log capture for the frontend development server
 * without relying on shell redirection.
 */

import { spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const LOG_ENV = 'NEXT_DEV_LOG_PATH';
const DEFAULT_LOG = 'next-dev.log';

function resolveLogPath() {
  const target = process.env[LOG_ENV] && process.env[LOG_ENV]?.trim() !== ''
    ? process.env[LOG_ENV]
    : DEFAULT_LOG;
  return resolve(process.cwd(), target);
}

function ensureDirectory(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function start() {
  const logPath = resolveLogPath();
  ensureDirectory(logPath);

  const logStream = createWriteStream(logPath, { flags: 'a' });

  const write = (chunk) => {
    if (!chunk) return;
    logStream.write(chunk);
    process.stdout.write(chunk);
  };

  const args = process.argv.slice(2);
  const nextProcess = spawn('next', ['dev', ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  nextProcess.stdout.on('data', write);
  nextProcess.stderr.on('data', write);

  nextProcess.on('close', (code) => {
    logStream.end(() => {
      if (code !== 0) {
        console.error(`next dev exited with code ${code}`);
        process.exit(code ?? 1);
      }
    });
  });

  nextProcess.on('error', (err) => {
    logStream.end(() => {
      console.error('Failed to start next dev:', err);
      process.exit(1);
    });
  });
}

start();
