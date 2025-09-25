// Fails build if generated 200 response types alias SuccessEnvelope
const fs = require('fs');
const path = 'src/api/generated/types.ts';
if (!fs.existsSync(path)) process.exit(0);
const content = fs.readFileSync(path,'utf-8');
const offenders = [...content.matchAll(/(\w+200Response)\s*=\s*SuccessEnvelope/g)].map(m=>m[1]);
if (offenders.length) {
  console.error('ERROR: 200Response types alias SuccessEnvelope:', offenders);
  process.exit(1);
}
