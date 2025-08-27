/**
 * REALITY CHECK PART 2: Test actual API calls with generated client
 */

import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { Configuration } from '@/lib/api-client/configuration';

async function testRealApiCall() {
  try {
    const config = new Configuration({
      basePath: 'http://localhost:8080' // Backend server
    });
    
    const campaignsApi = new CampaignsApi(config);
    
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

testRealApiCall().then(result => {
  console.log('=== TEST COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.log('=== TEST FAILED ===');
  process.exit(1);
});
