#!/usr/bin/env node
/**
 * audit-any.mjs
 * Counts explicit 'any' occurrences in src (excluding generated + allowed) to help drive reduction.
 */

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const BASELINE_FILE = resolve(ROOT, 'scripts/.any-baseline');

// Globs / directories to exclude from audit
const EXCLUDES = [
  'src/lib/api-client', // generated
  'src/types/react-window.d.ts',
  'src/tests',
  'node_modules'
];

// Build grep exclude args
const excludeArgs = EXCLUDES.map(p => `--exclude-dir='${p}' --exclude='${p}'`).join(' ');

function countAny() {
  try {
    const cmd = `grep -R "[^A-Za-z0-9_]any[^A-Za-z0-9_]" src ${excludeArgs} | grep -v "eslint-disable" | wc -l`;
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', shell: '/bin/bash' }).trim();
    return parseInt(out, 10) || 0;
  } catch (e) {
    return 0;
  }
}

const current = countAny();
let baseline = current;

if (existsSync(BASELINE_FILE)) {
  baseline = parseInt(readFileSync(BASELINE_FILE, 'utf-8').trim(), 10) || current;
} else {
  // Create baseline file on first run
  writeFileSync(BASELINE_FILE, String(current));
  console.log(`Baseline created at ${BASELINE_FILE} with count ${current}`);
  process.exit(0);
}

if (current > baseline) {
  console.error(`❌ any count increased: current=${current} baseline=${baseline}`);
  process.exit(1);
} else if (current < baseline) {
  writeFileSync(BASELINE_FILE, String(current));
  console.log(`✅ any count reduced: ${baseline} -> ${current}. Baseline updated.`);
} else {
  console.log(`ℹ️ any count unchanged: ${current}`);
}
