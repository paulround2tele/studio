#!/usr/bin/env node
const { execSync } = require('child_process');

function checkBackendSuccessUsage() {
  try {
    const out = execSync(`grep -R "success" backend/internal || true`, { encoding: 'utf-8' });
    const lines = out.split('\n').filter(line => line.trim());
    
    const suspicious = lines.filter(line =>
      line.includes('success') &&
      !line.match(/test|deprecated|error|ErrorEnvelope|SuccessEnvelope|comment|\/\/|#|successfully|unsuccessful/i) &&
      line.includes(':') // Only lines with actual code
    );
    
    if (suspicious.length > 0) {
      console.warn('⚠️  WARNING: Potential success field usage in backend 2xx responses:');
      console.warn('');
      suspicious.forEach(line => {
        console.warn(`   ${line.trim()}`);
      });
      console.warn('');
      console.warn('These should be reviewed to ensure they are not 2xx response success fields.');
      console.warn('Phase A: This is a warning only. Will become an error in Phase B.');
    } else {
      console.log('✅ No suspicious success field usage found in backend');
    }
    
    return suspicious.length;
  } catch (error) {
    console.error('❌ Error checking backend success usage:', error.message);
    return 0; // Don't fail on search errors in Phase A
  }
}

function checkFrontendEnvelopeUsage() {
  try {
    const out = execSync(`grep -R "extractResponseData\\|normalizeResponse" src/ || true`, { encoding: 'utf-8' });
    const lines = out.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      console.warn('⚠️  INFO: Found envelope extraction patterns in frontend:');
      console.warn(`   ${lines.length} files still use extractResponseData/normalizeResponse`);
      console.warn('   These will be migrated as part of the rollout plan.');
    } else {
      console.log('✅ No envelope extraction patterns found in frontend');
    }
    
    return lines.length;
  } catch (error) {
    console.error('❌ Error checking frontend envelope usage:', error.message);
    return 0;
  }
}

function main() {
  console.log('🔍 Checking success key usage in 2xx responses...');
  
  const backendSuspiciousCount = checkBackendSuccessUsage();
  const frontendEnvelopeCount = checkFrontendEnvelopeUsage();
  
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Backend suspicious success usage: ${backendSuspiciousCount}`);
  console.log(`   Frontend envelope extraction usage: ${frontendEnvelopeCount}`);
  
  // Phase A: Warning only, don't fail build
  console.log('');
  console.log('✅ Phase A: All checks passed (warnings only)');
  process.exit(0);
}

if (require.main === module) {
  main();
}
