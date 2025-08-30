/**
 * REALITY CHECK PART 2: Test actual API calls with generated client
 */

import { CampaignsApi } from '@/lib/api-client';
import { createApiConfiguration } from '@/lib/api/config';

async function testRealApiCall() {
  try {
  // Ensure basePath targets /api/v2
  const campaignsApi = new CampaignsApi(createApiConfiguration());
    
    console.log('=== TESTING REAL API CALL ===');
    
  // Test actual campaignsList call
  const response = await campaignsApi.campaignsList();
    
    console.log('✅ API call successful!');
    console.log('Response type:', typeof response);
    console.log('Response data keys:', Object.keys(response));
    
    if (response.data) {
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data));
    }
    
    return response;
    
  } catch (error: any) {
    console.error('❌ API call failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw error;
  }
}

testRealApiCall().then(_result => {
  console.log('=== TEST COMPLETE ===');
  process.exit(0);
}).catch(_error => {
  console.log('=== TEST FAILED ===');
  process.exit(1);
});
