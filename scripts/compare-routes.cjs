#!/usr/bin/env node
/*
Compare OpenAPI bundled paths vs Chi registered routes.
- Reads backend/openapi/dist/openapi.yaml
- Reads backend/routes.dump.txt (generated via go run ./cmd/apiserver -dump-routes)
- Normalizes routes by stripping leading /api/v2 and converting :param or {param}
*/
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BUNDLE = path.resolve(__dirname, '../backend/openapi/dist/openapi.yaml');
const ROUTES_DUMP = path.resolve(__dirname, '../backend/routes.dump.txt');

function loadBundle(file) {
  const src = fs.readFileSync(file, 'utf8');
  const doc = yaml.load(src);
  const paths = doc.paths || {};
  const specSet = new Set();
  for (const [p, obj] of Object.entries(paths)) {
    if (!obj || typeof obj !== 'object') continue;
      const normPath = p !== '/' && p.endsWith('/') ? p.replace(/\/+$/, '') : p;
    for (const m of ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']) {
      if (obj[m]) specSet.add(`${m.toUpperCase()} ${normPath}`);
    }
  }
  return specSet;
}

function normalizeRoutePath(raw) {
  let p = raw;
  if (p.startsWith('/api/v2')) p = p.slice('/api/v2'.length) || '/';
  p = p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  if (p !== '/' && p.endsWith('/')) p = p.replace(/\/+$/, '');
  return p;
}

function loadChiDump(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/).filter(Boolean);
  const chiSet = new Set();
  for (const line of lines) {
    const m = line.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)/);
    if (!m) continue;
    const method = m[1];
    const path = normalizeRoutePath(m[2]);
    chiSet.add(`${method} ${path}`);
  }
  return chiSet;
}

function diff(a, b) {
  const out = [];
  for (const x of a) if (!b.has(x)) out.push(x);
  return out.sort();
}

(function main() {
  if (!fs.existsSync(BUNDLE)) {
    console.error(`Bundle not found: ${BUNDLE}`);
    process.exit(1);
  }
  if (!fs.existsSync(ROUTES_DUMP)) {
    console.error(`Routes dump not found: ${ROUTES_DUMP}`);
    process.exit(2);
  }
  const specSet = loadBundle(BUNDLE);
  const chiSet = loadChiDump(ROUTES_DUMP);

  const missingInSpec = diff(chiSet, specSet);
  const missingInChi = diff(specSet, chiSet);
  const report = {
    totals: {
      specCount: specSet.size,
      chiCount: chiSet.size,
      missingInSpec: missingInSpec.length,
      missingInChi: missingInChi.length,
    },
    missingInSpec,
    missingInChi,
  };
  console.log(JSON.stringify(report, null, 2));
})();
