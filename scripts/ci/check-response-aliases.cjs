#!/usr/bin/env node
const fs = require('fs');
const modelsDir = 'src/lib/api-client/models';
let offenders = [];
if (fs.existsSync(modelsDir)) {
  for (const f of fs.readdirSync(modelsDir)) {
    if (!f.endsWith('.ts')) continue;
    const content = fs.readFileSync(`${modelsDir}/${f}`,'utf-8');
    if (/200Response\s*=\s*SuccessEnvelope/.test(content)) offenders.push(f);
  }
}
if (offenders.length) {
  console.error('[check-response-aliases] ERROR: 200 response aliasing SuccessEnvelope in:', offenders);
  process.exit(1);
}
console.log('[check-response-aliases] OK');
