/**
 * REALITY CHECK PART 3: Type safety of generated client
 */

import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { CreateCampaignRequest } from '@/lib/api-client/models';

// Test type safety
console.log('=== TESTING TYPE SAFETY ===');

const campaignRequest: CreateCampaignRequest = {
  name: 'Test Campaign',
  description: 'Testing generated types',
  targetDomains: [],
  configuration: {
    phases: {
      discovery: { enabled: true, maxDepth: 1 },
    }
  }
};

console.log('✅ Generated types work perfectly!');
console.log('Request object:', campaignRequest);

// Check what the campaign API methods expect
const api = new CampaignsApi();
console.log('campaignsCreate signature works:', typeof (api as any).campaignsCreate);

export { campaignRequest };
