// Warns (Phase A) on potential success key usage in backend 2xx responses
const { execSync } = require('child_process');
const out = execSync(`grep -R "success" backend/internal || true`).toString();
const suspicious = out.split('\n').filter(l =>
  l.includes('success') && !l.match(/test|deprecated|error|ErrorEnvelope|SuccessEnvelope/i)
);
if (suspicious.length) {
  console.error('WARNING: Potential success field usage in backend 2xx responses:\n', suspicious.join('\n'));
  // Phase A: non-fatal
}
