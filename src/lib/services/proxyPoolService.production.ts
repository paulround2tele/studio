// src/lib/services/proxyPoolService.ts
// Production Proxy Pool Service - Clean backend integration with generated types

import { ProxyPoolsApi, Configuration } from '@/lib/api-client';
import type { components } from '@/lib/api-client/types';

// Import types directly from models
import type { ProxyPoolRequest } from '@/lib/api-client/models/proxy-pool-request';
import type { AddProxyToPoolRequest } from '@/lib/api-client/models/add-proxy-to-pool-request';
import { getApiBaseUrlSync } from '@/lib/config/environment';
import { safeApiCall } from '@/lib/utils/apiResponseHelpers';

// Create configured ProxyPoolsApi instance with authentication
const config = new Configuration({
  basePath: getApiBaseUrlSync(),
  baseOptions: {
    withCredentials: true
  }
});
const proxyPoolsApi = new ProxyPoolsApi(config);

// Use generated types with correct package-prefixed names
export type ProxyPool = components['schemas']['ProxyPool'];
export type ProxyPoolCreationPayload = ProxyPoolRequest;
export type Proxy = components['schemas']['Proxy'];
export type ProxyPoolMembership = components['schemas']['ProxyPoolMembership'];

// Export the imported types for use in other files
export type { ProxyPoolRequest, AddProxyToPoolRequest };

// Service layer response wrappers aligned with unified backend envelope format
export interface ProxyPoolListResponse {
  success: boolean;
  data: ProxyPool[];
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyPoolDetailResponse {
  success: boolean;
  data?: ProxyPool;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyPoolCreationResponse {
  success: boolean;
  data?: ProxyPool;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyPoolUpdateResponse {
  success: boolean;
  data?: ProxyPool;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyPoolDeleteResponse {
  success: boolean;
  data?: unknown;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyPoolMembershipResponse {
  success: boolean;
  data?: ProxyPoolMembership;
  error: string | null;
  requestId: string;
  message?: string;
}


class ProxyPoolService {
  private static instance: ProxyPoolService;

  static getInstance(): ProxyPoolService {
    if (!ProxyPoolService.instance) {
      ProxyPoolService.instance = new ProxyPoolService();
    }
    return ProxyPoolService.instance;
  }

  async listPools(): Promise<ProxyPoolListResponse> {
    const result = await safeApiCall<ProxyPool[]>(
      () => proxyPoolsApi.listProxyPools(),
      'Getting proxy pools'
    );
    
    return {
      ...result,
      data: result.data || []
    };
  }

  async getPoolById(poolId: string): Promise<ProxyPoolDetailResponse> {
    // Backend doesn't have individual GET endpoint, fetch from list
    const response = await this.listPools();
    const pool = response.data?.find(p => p.id === poolId);
    
    if (!pool) {
      return {
        success: false,
        error: `Proxy pool with ID ${poolId} not found`,
        requestId: response.requestId || (globalThis.crypto?.randomUUID?.() || Math.random().toString(36))
      };
    }
    
    return {
      ...response,
      data: pool
    };
  }

  async createPool(payload: ProxyPoolCreationPayload): Promise<ProxyPoolCreationResponse> {
    return await safeApiCall<ProxyPool>(
      () => proxyPoolsApi.createProxyPool(payload),
      'Creating proxy pool'
    );
  }

  async updatePool(poolId: string, payload: ProxyPoolCreationPayload): Promise<ProxyPoolUpdateResponse> {
    return await safeApiCall<ProxyPool>(
      () => proxyPoolsApi.updateProxyPool(poolId, payload),
      'Updating proxy pool'
    );
  }

  async deletePool(poolId: string): Promise<ProxyPoolDeleteResponse> {
    return await safeApiCall<{ deleted: boolean; id: string }>(
      () => proxyPoolsApi.deleteProxyPool(poolId),
      'Deleting proxy pool'
    );
  }

  async addProxy(poolId: string, proxyId: string, weight?: number): Promise<ProxyPoolMembershipResponse> {
    return await safeApiCall<ProxyPoolMembership>(
      () => proxyPoolsApi.addProxyToPool(poolId, { proxyId, weight }),
      'Adding proxy to pool'
    );
  }

  async removeProxy(poolId: string, proxyId: string): Promise<ProxyPoolDeleteResponse> {
    return await safeApiCall<{ removed: boolean }>(
      () => proxyPoolsApi.removeProxyFromPool(poolId, proxyId),
      'Removing proxy from pool'
    );
  }
}

// Export singleton and functions
export const proxyPoolService = ProxyPoolService.getInstance();

export const listProxyPools = () => proxyPoolService.listPools();
export const getProxyPoolById = (poolId: string) => proxyPoolService.getPoolById(poolId);
export const createProxyPool = (payload: ProxyPoolCreationPayload) => proxyPoolService.createPool(payload);
export const updateProxyPool = (poolId: string, payload: ProxyPoolCreationPayload) => 
  proxyPoolService.updatePool(poolId, payload);
export const deleteProxyPool = (poolId: string) => proxyPoolService.deletePool(poolId);
export const addProxyToPool = (poolId: string, proxyId: string, weight?: number) =>
  proxyPoolService.addProxy(poolId, proxyId, weight);
export const removeProxyFromPool = (poolId: string, proxyId: string) => 
  proxyPoolService.removeProxy(poolId, proxyId);

export default proxyPoolService;
