// src/lib/services/proxyService.ts
// Production Proxy Service - Direct OpenAPI integration without adapters

import { apiClient } from '@/lib/api-client/client';
import type { components } from '@/lib/api-client/types';

// Use OpenAPI types directly
export type Proxy = components['schemas']['Proxy'];
export type ProxyCreationPayload = components['schemas']['CreateProxyRequest'];
export type ProxyUpdatePayload = components['schemas']['UpdateProxyRequest'];

// OpenAPI response types
export interface ProxiesListResponse {
  status: 'success' | 'error';
  data: Proxy[];
  message?: string;
}

export interface ProxyCreationResponse {
  status: 'success' | 'error';
  data?: Proxy;
  message?: string;
}

export interface ProxyUpdateResponse {
  status: 'success' | 'error';
  data?: Proxy;
  message?: string;
}

export interface ProxyDeleteResponse {
  status: 'success' | 'error';
  data?: null;
  message?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}


class ProxyService {
  private static instance: ProxyService;

  static getInstance(): ProxyService {
    if (!ProxyService.instance) {
      ProxyService.instance = new ProxyService();
    }
    return ProxyService.instance;
  }

  async getProxies(): Promise<ProxiesListResponse> {
    try {
      const result = await apiClient.listProxies();
      return {
        status: 'success',
        data: result as Proxy[],
        message: 'Proxies retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async getProxyById(proxyId: string): Promise<ProxyCreationResponse> {
    // Backend doesn't have individual GET endpoint, fetch from list
    try {
      const response = await this.getProxies();
      const proxy = response.data?.find(p => p.id === proxyId);
      
      if (!proxy) {
        return {
          status: 'error',
          message: `Proxy with ID ${proxyId} not found`
        };
      }
      
      return {
        status: 'success',
        data: proxy,
        message: 'Proxy retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createProxy(payload: ProxyCreationPayload): Promise<ProxyCreationResponse> {
    try {
      const result = await apiClient.createProxy(payload);
      return {
        status: 'success',
        data: result as Proxy,
        message: 'Proxy created successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProxy(proxyId: string, payload: ProxyUpdatePayload): Promise<ProxyUpdateResponse> {
    try {
      const result = await apiClient.updateProxy(proxyId, payload);
      return {
        status: 'success',
        data: result as Proxy,
        message: 'Proxy updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProxy(proxyId: string): Promise<ProxyDeleteResponse> {
    try {
      await apiClient.deleteProxy(proxyId);
      return {
        status: 'success',
        data: null,
        message: 'Proxy deleted successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const result = await apiClient.testProxy(proxyId);
      return {
        status: 'success',
        data: result,
        message: 'Proxy test completed successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async forceProxyHealthCheck(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const result = await apiClient.forceProxyHealthCheck(proxyId);
      return {
        status: 'success',
        data: result,
        message: 'Proxy health check completed'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async forceAllProxiesHealthCheck(): Promise<ApiResponse<unknown>> {
    try {
      const result = await apiClient.forceAllProxiesHealthCheck();
      return {
        status: 'success',
        data: result,
        message: 'All proxies health check completed'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProxyStatuses(): Promise<ApiResponse<unknown>> {
    try {
      const result = await apiClient.getProxyStatuses();
      return {
        status: 'success',
        data: result,
        message: 'Proxy statuses retrieved successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods for enable/disable via update
  async enableProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const proxy = await this.getProxyById(proxyId);
      if (proxy.status !== 'success' || !proxy.data) {
        return {
          status: 'error',
          message: 'Proxy not found'
        };
      }

      const updatePayload: ProxyUpdatePayload = {
        isEnabled: true
      };

      const result = await this.updateProxy(proxyId, updatePayload);

      return {
        status: result.status,
        data: result.data,
        message: result.status === 'success' ? 'Proxy enabled successfully' : result.message
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disableProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const proxy = await this.getProxyById(proxyId);
      if (proxy.status !== 'success' || !proxy.data) {
        return {
          status: 'error',
          message: 'Proxy not found'
        };
      }

      const updatePayload: ProxyUpdatePayload = {
        isEnabled: false
      };

      const result = await this.updateProxy(proxyId, updatePayload);

      return {
        status: result.status,
        data: result.data,
        message: result.status === 'success' ? 'Proxy disabled successfully' : result.message
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton and functions
export const proxyService = ProxyService.getInstance();

export const getProxies = () => proxyService.getProxies();
export const getProxyById = (proxyId: string) => proxyService.getProxyById(proxyId);
export const createProxy = (payload: ProxyCreationPayload) => proxyService.createProxy(payload);
export const updateProxy = (proxyId: string, payload: ProxyUpdatePayload) => proxyService.updateProxy(proxyId, payload);
export const deleteProxy = (proxyId: string) => proxyService.deleteProxy(proxyId);
export const testProxy = (proxyId: string) => proxyService.testProxy(proxyId);
export const enableProxy = (proxyId: string) => proxyService.enableProxy(proxyId);
export const disableProxy = (proxyId: string) => proxyService.disableProxy(proxyId);
export const forceProxyHealthCheck = (proxyId: string) => proxyService.forceProxyHealthCheck(proxyId);
export const forceAllProxiesHealthCheck = () => proxyService.forceAllProxiesHealthCheck();
export const getProxyStatuses = () => proxyService.getProxyStatuses();

// Bulk operations for backward compatibility
export const testAllProxies = forceAllProxiesHealthCheck;
export const cleanProxies = async (): Promise<{ status: 'error'; message: string }> => {
  console.warn('cleanProxies bulk operation not yet implemented in V2 API');
  return { status: 'error' as const, message: 'Bulk proxy cleanup not yet available' };
};

export default proxyService;
