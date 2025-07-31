// src/lib/services/proxyPoolService.ts
// Production Proxy Pool Service - Clean backend integration with generated types

import type { components } from '@/lib/api-client/types';
import type { UUID } from '@/lib/api-client/uuid-types';

// Import types directly from models
import type { ProxyPoolRequest } from '@/lib/api-client/models/proxy-pool-request';
import type { AddProxyToPoolRequest } from '@/lib/api-client/models/add-proxy-to-pool-request';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import { proxyPoolsApi } from '@/lib/api-client/client';

// Use generated types with correct package-prefixed names
export type ProxyPool = components['schemas']['ProxyPool'];
export type ProxyPoolCreationPayload = ProxyPoolRequest;
export type Proxy = components['schemas']['Proxy'];
export type ProxyPoolMembership = components['schemas']['ProxyPoolMembership'];

// Export the imported types for use in other files
export type { ProxyPoolRequest, AddProxyToPoolRequest };

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';


class ProxyPoolService {
  private static instance: ProxyPoolService;

  static getInstance(): ProxyPoolService {
    if (!ProxyPoolService.instance) {
      ProxyPoolService.instance = new ProxyPoolService();
    }
    return ProxyPoolService.instance;
  }

  async listPools(): Promise<ApiResponse<ProxyPool[]>> {
    try {
      const axiosResponse = await proxyPoolsApi.listProxyPools();
      const data = extractResponseData<ProxyPool[]>(axiosResponse);
      return {
        success: true,
        data: data || [],
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `listPools-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `listPools-error-${Date.now()}`,
        
      };
    }
  }

  async getPoolById(poolId: string): Promise<ApiResponse<ProxyPool>> {
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

  async createPool(payload: ProxyPoolCreationPayload): Promise<ApiResponse<ProxyPool>> {
    try {
      const axiosResponse = await proxyPoolsApi.createProxyPool(payload);
      const data = extractResponseData<ProxyPool>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `createPool-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `createPool-error-${Date.now()}`,
        
      };
    }
  }

  async updatePool(poolId: string, payload: ProxyPoolCreationPayload): Promise<ApiResponse<ProxyPool>> {
    try {
      const axiosResponse = await proxyPoolsApi.updateProxyPool(poolId, payload);
      const data = extractResponseData<ProxyPool>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `updatePool-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `updatePool-error-${Date.now()}`,
        
      };
    }
  }

  async deletePool(poolId: string): Promise<ApiResponse<{ deleted: boolean; id: string }>> {
    try {
      const axiosResponse = await proxyPoolsApi.deleteProxyPool(poolId);
      const data = extractResponseData<{ deleted: boolean; id: string }>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `deletePool-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `deletePool-error-${Date.now()}`,
        
      };
    }
  }

  async addProxy(poolId: string, proxyId: string, weight?: number): Promise<ApiResponse<ProxyPoolMembership>> {
    try {
      const axiosResponse = await proxyPoolsApi.addProxyToPool(poolId, { proxyId: proxyId as UUID, weight });
      const data = extractResponseData<ProxyPoolMembership>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `addProxy-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `addProxy-error-${Date.now()}`,
        
      };
    }
  }

  async removeProxy(poolId: string, proxyId: string): Promise<ApiResponse<{ removed: boolean }>> {
    try {
      const axiosResponse = await proxyPoolsApi.removeProxyFromPool(poolId, proxyId);
      const data = extractResponseData<{ removed: boolean }>(axiosResponse);
      return {
        success: true,
        data: data || undefined,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || `removeProxy-${Date.now()}`,
        
      };
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        requestId: globalThis.crypto?.randomUUID?.() || `removeProxy-error-${Date.now()}`,
        
      };
    }
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
