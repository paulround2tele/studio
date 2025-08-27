// Thin, hand-maintained compatibility layer to cushion churn from regenerated clients.
// Do NOT import this from generated files. Import it from app code only.

export * from './index'; // re-export generated api, configuration, and models

// Common old-to-new type aliases to unblock the app without touching generated code
export type ApiAPIResponse = import('./models').SuccessEnvelope;
export type ApiPersonaResponse = import('./models').PersonaResponse;
export type BulkEnrichedDataResponse = any; // no longer modeled explicitly
export type EnrichedCampaignData = any;
export type GeneratedDomain = any;
export type LeadItem = any;
export type Campaign = import('./models').CampaignResponse;
export type PageInfo = import('./models').Pagination;
export type UUID = string;

// Export frequently used DTOs under their former names if they still exist
export type {
  CreateCampaignRequest as ServicesCreateLeadGenerationCampaignRequest,
  PhaseConfigurationRequest as ApiPhaseConfigureRequest,
} from './models';

// Convenience: expose initialized clients similar to previous client.ts exports
import { Configuration } from './configuration';
import { AuthApi } from './apis/auth-api';
import { CampaignsApi } from './apis/campaigns-api';
import { FeatureFlagsApi } from './apis/feature-flags-api';
import { ProxiesApi } from './apis/proxies-api';
import { ProxyPoolsApi } from './apis/proxy-pools-api';
import { PersonasApi } from './apis/personas-api';
import { KeywordSetsApi } from './apis/keyword-sets-api';

const _config = new Configuration({ basePath: process.env.NEXT_PUBLIC_API_URL });
export const authApi = new AuthApi(_config);
export const campaignsApi = new CampaignsApi(_config);
export const featureFlagsApi = new FeatureFlagsApi(_config);
export const proxiesApi = new ProxiesApi(_config);
export const proxyPoolsApi = new ProxyPoolsApi(_config);
export const personasApi = new PersonasApi(_config);
export const keywordSetsApi = new KeywordSetsApi(_config);
export const apiClient = { authApi, campaignsApi, featureFlagsApi, proxiesApi, proxyPoolsApi, personasApi, keywordSetsApi };
