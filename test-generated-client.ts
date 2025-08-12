/**
 * BRUTAL REALITY CHECK: Do the auto-generated OpenAPI clients actually work?
 * 
 * This test will determine if we can use the generated clients directly
 * or if we're condemned to amateur wrapper hell.
 */

import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { Configuration } from '@/lib/api-client/configuration';

// Test 1: Can we instantiate the generated client?
console.log('=== TESTING GENERATED OPENAPI CLIENT ===');

try {
  const config = new Configuration({
    basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  });
  
  const campaignsApi = new CampaignsApi(config);
  console.log('✅ Generated client instantiated successfully');
  
  // Test 2: Check the available methods
  console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(campaignsApi)));
  
  // Test 3: Check method signatures
  console.log('createLeadGenerationCampaign method exists:', typeof campaignsApi.createLeadGenerationCampaign);
  console.log('getCampaignsStandalone method exists:', typeof campaignsApi.getCampaignsStandalone);
  
} catch (error) {
  console.error('❌ Generated client failed:', error);
}

export default function testGeneratedClients() {
  return 'Generated client reality check complete - see console';
}
