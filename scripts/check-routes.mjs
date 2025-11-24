#!/usr/bin/env node
// Strict route parity checker: runs compare-routes.js and fails if diffs exist.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const logsDir = resolve(repoRoot, 'scripts', 'test-logs');
mkdirSync(logsDir, { recursive: true });

const res = spawnSync('node', [resolve(repoRoot, 'scripts/compare-routes.cjs')], {
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
});

if (res.status !== 0) {
  console.error('compare-routes.js exited with non-zero status');
  process.exit(res.status || 1);
}

let report;
try {
  report = JSON.parse(res.stdout.trim());
} catch (e) {
  console.error('Failed to parse compare-routes output as JSON');
  console.error(res.stdout);
  process.exit(2);
}

writeFileSync(resolve(logsDir, 'route-parity.json'), JSON.stringify(report, null, 2));

const { totals, missingInSpec, missingInGin } = report;
const mismatches = (totals?.missingInSpec || 0) + (totals?.missingInGin || 0);
if (mismatches > 0) {
  console.error('❌ Route parity check failed');
  console.error(JSON.stringify({ totals, missingInSpec, missingInGin }, null, 2));
  process.exit(3);
}

console.log('✅ Route parity check passed');
