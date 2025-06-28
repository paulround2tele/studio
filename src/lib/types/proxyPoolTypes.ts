import type { UUID, ISODateString } from "./branded";
import type { Proxy } from "./aligned/aligned-models";

export interface ProxyPool {
  id: UUID;
  name: string;
  description?: string;
  isEnabled: boolean;
  poolStrategy?: string;
  healthCheckEnabled: boolean;
  healthCheckIntervalSeconds?: number;
  maxRetries?: number;
  timeoutSeconds?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  proxies?: Proxy[];
}

export interface ProxyPoolMembership {
  poolId: UUID;
  proxyId: UUID;
  weight?: number;
  isActive: boolean;
  addedAt: ISODateString;
}
