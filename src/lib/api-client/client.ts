import { apiConfiguration } from '@/lib/api/config';
import { AuthApi } from './apis/auth-api';
import { CampaignsApi } from './apis/campaigns-api';
import { FeatureFlagsApi } from './apis/feature-flags-api';
import { ProxiesApi } from './apis/proxies-api';
import { ProxyPoolsApi } from './apis/proxy-pools-api';

// Minimal, typed API client factory used across the app
export const authApi = new AuthApi(apiConfiguration);
export const campaignsApi = new CampaignsApi(apiConfiguration);
export const featureFlagsApi = new FeatureFlagsApi(apiConfiguration);
export const proxiesApi = new ProxiesApi(apiConfiguration);
export const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration);

export const apiClient = { authApi, campaignsApi, featureFlagsApi, proxiesApi, proxyPoolsApi };
