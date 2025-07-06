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
      
      // Backend wraps response in APIResponse format: { success: true, data: Proxy[], requestId: string }
      let proxiesData: any[] = [];
      
      if (result && typeof result === 'object') {
        // Check if it's wrapped in APIResponse format
        if ('data' in result && Array.isArray((result as any).data)) {
          proxiesData = (result as any).data;
        } else if (Array.isArray(result)) {
          // Direct array response
          proxiesData = result as any[];
        }
      }
      
      // Transform SQL null types to simple values for React
      const cleanedProxies = proxiesData.map((proxy: any) => ({
        id: proxy.id,
        name: proxy.name || "",
        description: (proxy.description?.String !== undefined ? proxy.description.String : proxy.description) || "",
        address: proxy.address || "",
        protocol: proxy.protocol || "http",
        username: (proxy.username?.String !== undefined ? proxy.username.String : proxy.username) || "",
        host: (proxy.host?.String !== undefined ? proxy.host.String : proxy.host) || "",
        port: (proxy.port?.Int32 !== undefined ? proxy.port.Int32 : proxy.port) || null,
        isEnabled: proxy.isEnabled || false,
        isHealthy: proxy.isHealthy || false,
        lastStatus: (proxy.lastStatus?.String !== undefined ? proxy.lastStatus.String : proxy.lastStatus) || "",
        lastCheckedAt: (proxy.lastCheckedAt?.Time !== undefined ? proxy.lastCheckedAt.Time : proxy.lastCheckedAt) || null,
        latencyMs: (proxy.latencyMs?.Int32 !== undefined ? proxy.latencyMs.Int32 : proxy.latencyMs) || null,
        city: (proxy.city?.String !== undefined ? proxy.city.String : proxy.city) || "",
        countryCode: (proxy.countryCode?.String !== undefined ? proxy.countryCode.String : proxy.countryCode) || "",
        provider: (proxy.provider?.String !== undefined ? proxy.provider.String : proxy.provider) || "",
        createdAt: proxy.createdAt,
        updatedAt: proxy.updatedAt,
        // Frontend expects these fields - status should reflect both enabled state AND health
        status: !proxy.isEnabled ? 'Disabled' : (proxy.isHealthy ? 'Active' : 'Failed'),
        lastTested: (proxy.lastCheckedAt?.Time !== undefined ? proxy.lastCheckedAt.Time : proxy.lastCheckedAt) || null,
        successCount: 0,
        failureCount: 0,
        lastError: (proxy.lastStatus?.String !== undefined ? proxy.lastStatus.String : proxy.lastStatus) || "",
        notes: ""
      }));
      
      return {
        status: 'success',
        data: cleanedProxies,
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
export const cleanProxies = async (): Promise<{ status: 'success' | 'error'; message: string }> => {
  try {
    // Get all proxies and filter for unhealthy ones
    const response = await proxyService.getProxies();
    
    if (response.status !== 'success' || !response.data) {
      return { status: 'error', message: 'Failed to fetch proxies for cleaning' };
    }

    // Filter for unhealthy proxies (not isHealthy)
    const unhealthyProxies = response.data.filter(proxy => !proxy.isHealthy);

    if (unhealthyProxies.length === 0) {
      return { status: 'success', message: 'No unhealthy proxies found to clean' };
    }

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each unhealthy proxy
    for (const proxy of unhealthyProxies) {
      try {
        if (!proxy.id) {
          errorCount++;
          console.error(`Proxy missing ID, skipping:`, proxy);
          continue;
        }
        await proxyService.deleteProxy(proxy.id);
        deletedCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to delete proxy ${proxy.id}:`, error);
      }
    }

    if (deletedCount > 0) {
      const message = errorCount > 0
        ? `Cleaned ${deletedCount} failed proxies (${errorCount} errors)`
        : `Successfully cleaned ${deletedCount} failed proxies`;
      return { status: 'success', message };
    } else {
      return { status: 'error', message: `Failed to clean proxies (${errorCount} errors)` };
    }
  } catch (error) {
    console.error('Error cleaning failed proxies:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred while cleaning proxies'
    };
  }
};

export default proxyService;
