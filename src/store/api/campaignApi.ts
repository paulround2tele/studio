/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This RTK Query wrapper was a CRIMINAL WASTE that added unnecessary
 * abstraction layers over the perfectly working generated OpenAPI clients.
 * 
 * The professional approach uses generated clients directly:
 * 
 * ✅ PROFESSIONAL:
 * import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
 * const api = new CampaignsApi(config);
 * const result = await api.createLeadGenerationCampaign(request);
 * 
 * ❌ CRIMINAL (this file):
 * const [createCampaign] = useCreateCampaignMutation();
 * 
 * This wrapper has been professionally decommissioned.
 */

/**
 * @deprecated Criminal RTK Query wrapper eliminated
 * Use the generated CampaignsApi directly instead
 */
export const campaignApi = {
  decommissioned: true,
  message: 'Use CampaignsApi from @/lib/api-client/apis/campaigns-api directly'
};

export default campaignApi;
