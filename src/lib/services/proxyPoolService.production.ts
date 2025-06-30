// src/lib/services/proxyPoolService.ts
// Production Proxy Pool Service - Clean backend integration with generated types

import { apiClient, type components } from '@/lib/api-client/client';

// Use generated types
export type ProxyPool = components['schemas']['ProxyPool'];
export type ProxyPoolCreationPayload = components['schemas']['ProxyPoolRequest'];
export type Proxy = components['schemas']['Proxy'];
export type ProxyPoolMembership = components['schemas']['ProxyPoolMembership'];

// Response wrapper types
export interface ProxyPoolListResponse {
  status: 'success' | 'error';
  data?: ProxyPool[];
  error?: string;
  message?: string;
}

export interface ProxyPoolDetailResponse {
  status: 'success' | 'error';
  data?: ProxyPool;
  error?: string;
  message?: string;
}

export interface ProxyPoolCreationResponse {
  status: 'success' | 'error';
  data?: ProxyPool;
  error?: string;
  message?: string;
}

export interface ProxyPoolUpdateResponse {
  status: 'success' | 'error';
  data?: ProxyPool;
  error?: string;
  message?: string;
}

export interface ProxyPoolDeleteResponse {
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
  message?: string;
}

export interface ProxyPoolMembershipResponse {
  status: 'success' | 'error';
  data?: ProxyPoolMembership;
  error?: string;
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
    try {
      const result = await apiClient.listProxyPools();
      return {
        status: 'success',
        data: result as ProxyPool[],
        message: 'Proxy pools retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async getPoolById(poolId: string): Promise<ProxyPoolDetailResponse> {
    // Backend doesn't have individual GET endpoint, fetch from list
    try {
      const response = await this.listPools();
      const pool = response.data?.find(p => p.id === poolId);
      
      if (!pool) {
        return {
          status: 'error',
          error: `Proxy pool with ID ${poolId} not found`
        };
      }
      
      return {
        status: 'success',
        data: pool,
        message: 'Proxy pool retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createPool(payload: ProxyPoolCreationPayload): Promise<ProxyPoolCreationResponse> {
    try {
      const result = await apiClient.createProxyPool(payload);
      return {
        status: 'success',
        data: result as ProxyPool,
        message: 'Proxy pool created successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updatePool(poolId: string, payload: ProxyPoolCreationPayload): Promise<ProxyPoolUpdateResponse> {
    try {
      const result = await apiClient.updateProxyPool(poolId, payload);
      return {
        status: 'success',
        data: result as ProxyPool,
        message: 'Proxy pool updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deletePool(poolId: string): Promise<ProxyPoolDeleteResponse> {
    try {
      await apiClient.deleteProxyPool(poolId);
      return {
        status: 'success',
        data: { success: true },
        message: 'Proxy pool deleted successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addProxy(poolId: string, proxyId: string, weight?: number): Promise<ProxyPoolMembershipResponse> {
    try {
      const result = await apiClient.addProxyToPool(poolId, { proxyId, weight });
      return {
        status: 'success',
        data: result as ProxyPoolMembership,
        message: 'Proxy added to pool successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async removeProxy(poolId: string, proxyId: string): Promise<ProxyPoolDeleteResponse> {
    try {
      await apiClient.removeProxyFromPool(poolId, proxyId);
      return {
        status: 'success',
        data: { success: true },
        message: 'Proxy removed from pool successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
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
