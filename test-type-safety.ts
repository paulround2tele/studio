/**
 * REALITY CHECK PART 3: Type safety of generated client
 */

import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { ServicesCreateLeadGenerationCampaignRequest } from '@/lib/api-client/models';

// Test type safety
console.log('=== TESTING TYPE SAFETY ===');

const campaignRequest: ServicesCreateLeadGenerationCampaignRequest = {
  name: "Test Campaign",
  description: "Testing generated types",
  domainConfig: {
    patternType: "prefix",
    constantString: "test",
    characterSet: "abc",
    variableLength: 3,
    tlds: [".com", ".net"]
  }
};

console.log('✅ Generated types work perfectly!');
console.log('Request object:', campaignRequest);

// Check what the campaign API methods expect
const api = new CampaignsApi();
console.log('createLeadGenerationCampaign signature works:', typeof api.createLeadGenerationCampaign);

export { campaignRequest };
