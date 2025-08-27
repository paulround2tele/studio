#!/usr/bin/env node
// End-to-end API autogeneration pipeline:
// 1) Bundle modular spec -> dist
// 2) Validate (kin-openapi + Redocly)
// 3) Route parity check (fail on diffs)
// 4) Generate types, clients, docs

import { spawnSync } from 'node:child_process';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

run('npm', ['run', 'api:bundle']);
run('npm', ['run', 'api:validate-bundle']);
// Dump routes fresh, just in case devs changed gin registration
run('bash', ['-lc', 'cd backend && go run ./dump_routes.go | tee routes.dump.txt']);
run('node', ['scripts/check-routes.mjs']);
run('npm', ['run', 'gen:types']);
run('npm', ['run', 'gen:clients']);
run('npm', ['run', 'gen:docs']);
console.log('✅ API autogeneration complete');
