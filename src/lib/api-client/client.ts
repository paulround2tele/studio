import { Configuration } from './configuration';
import { AuthApi } from './apis/auth-api';
import { CampaignsApi } from './apis/campaigns-api';
import { FeatureFlagsApi } from './apis/feature-flags-api';
import { ProxiesApi } from './apis/proxies-api';
import { ProxyPoolsApi } from './apis/proxy-pools-api';

// Minimal, typed API client factory used across the app
const config = new Configuration({});

export const authApi = new AuthApi(config);
export const campaignsApi = new CampaignsApi(config);
export const featureFlagsApi = new FeatureFlagsApi(config);
export const proxiesApi = new ProxiesApi(config);
export const proxyPoolsApi = new ProxyPoolsApi(config);

export const apiClient = { authApi, campaignsApi, featureFlagsApi, proxiesApi, proxyPoolsApi };
