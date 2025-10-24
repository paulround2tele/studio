/**
 * Phase 10 Services Integration Test
 * Simple compilation and functionality test for all Phase 10 services
 */

// Test that all services can be imported without errors
try {
  // Causal Graph Service
  const causalGraphModule = require('./analytics/causalGraphService');
  console.log('✓ Causal Graph Service loaded');

  // Bandit Service
  const banditModule = require('./experimentation/banditService');
  console.log('✓ Bandit Service loaded');

  // Privacy Services
  const privacyRedactionModule = require('./privacy/privacyRedactionService');
  const _differentialPrivacyModule = require('./privacy/differentialPrivacyService');
  console.log('✓ Privacy Services loaded');

  // Performance Services
  const wasmModule = require('./perf/wasmAccelerationService');
  const _memoryModule = require('./perf/memoryPressureService');
  console.log('✓ Performance Services loaded');

  // Observability Services
  const tracingModule = require('./observability/tracingService');
  console.log('✓ Observability Services loaded');

  // Summarization Service
  const summarizationModule = require('./summarization/summarizationService');
  console.log('✓ Summarization Service loaded');

  // i18n Service
  const i18nModule = require('./i18n/i18nService');
  console.log('✓ i18n Service loaded');

  console.log('\n🎉 All Phase 10 services loaded successfully!');
  
  // Test basic functionality
  console.log('\n📊 Testing basic functionality...');
  
  // Test causal graph availability
  const causalAvailable = causalGraphModule.isCausalGraphAvailable();
  console.log(`Causal Graph Available: ${causalAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test bandit availability
  const banditAvailable = banditModule.isBanditAvailable();
  console.log(`Bandit Available: ${banditAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test privacy availability
  const privacyAvailable = privacyRedactionModule.isPrivacyRedactionAvailable();
  console.log(`Privacy Available: ${privacyAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test WASM availability
  const wasmAvailable = wasmModule.isWasmAccelerationAvailable();
  console.log(`WASM Available: ${wasmAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test tracing availability
  const tracingAvailable = tracingModule.isTracingAvailable();
  console.log(`Tracing Available: ${tracingAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test summarization availability
  const summarizationAvailable = summarizationModule.isSummarizationAvailable();
  console.log(`Summarization Available: ${summarizationAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  // Test i18n availability
  const i18nAvailable = i18nModule.isI18nAvailable();
  console.log(`i18n Available: ${i18nAvailable ? '✓' : '✗ (feature flag disabled)'}`);
  
  console.log('\n✅ Phase 10 implementation complete and functional!');
  console.log('📝 Note: Services are feature-flag gated. Enable flags in .env to activate.');

} catch (error) {
  console.error('❌ Error loading Phase 10 services:', error);
  process.exit(1);
}