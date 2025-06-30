import type { Proxy } from "./aligned/aligned-models";

export interface ProxyPool {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  poolStrategy?: string;
  healthCheckEnabled: boolean;
  healthCheckIntervalSeconds?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
  createdAt: string;
  updatedAt: string;
  proxies?: Proxy[];
}

export interface ProxyPoolMembership {
  poolId: string;
  proxyId: string;
  weight?: number;
  isActive: boolean;
  addedAt: string;
}
