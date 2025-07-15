// src/lib/services/proxyService.ts
// Production Proxy Service - Direct OpenAPI integration without adapters

import { ProxiesApi, Configuration } from '@/lib/api-client';
import {
  CreateProxyRequest,
  UpdateProxyRequest,
  Proxy as ProxyModel,
} from '@/lib/api-client/models';
import { getApiBaseUrlSync } from '@/lib/config/environment';
import type { FrontendProxy } from '@/lib/types/frontend-safe-types';
import { transformSqlNullString, transformSqlNullInt32 } from '@/lib/utils/sqlNullTransformers';

// Create configured ProxiesApi instance with authentication
const config = new Configuration({
  basePath: getApiBaseUrlSync(),
  baseOptions: {
    withCredentials: true
  }
});
const proxiesApi = new ProxiesApi(config);

// Use OpenAPI types directly
// Removed circular type reference
export type ProxyModelCreationPayload = CreateProxyRequest;
export type ProxyModelUpdatePayload = UpdateProxyRequest;

// Protocol validation utilities
const validateProtocol = (protocol: string): string => {
  const validProtocols = ['http', 'https', 'socks5', 'socks4'];
  return validProtocols.includes(protocol) ? protocol : 'http';
};

// Service layer response wrappers using frontend-safe types
export interface ProxiesListResponse {
  status: 'success' | 'error';
  data: FrontendProxy[];
  message?: string;
}

export interface ProxyModelCreationResponse {
  status: 'success' | 'error';
  data?: FrontendProxy;
  message?: string;
}

export interface ProxyModelUpdateResponse {
  status: 'success' | 'error';
  data?: ProxyModel;
  message?: string;
}

export interface ProxyModelDeleteResponse {
  status: 'success' | 'error';
  data?: null;
  message?: string;
}

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';

// Define proxy status and test result types
export type ProxyModelStatus = 'Active' | 'Disabled' | 'Testing' | 'Failed';
export interface ProxyModelTestResult {
  success: boolean;
  message: string;
  latency?: number;
}


class ProxyModelService {
  private static instance: ProxyModelService;

  static getInstance(): ProxyModelService {
    if (!ProxyModelService.instance) {
      ProxyModelService.instance = new ProxyModelService();
    }
    return ProxyModelService.instance;
  }

  async getProxies(): Promise<ProxiesListResponse> {
    try {
      const response = await proxiesApi.listProxies();
      
      // Backend wraps response in APIResponse format: { success: true, data: Proxy[], requestId: string }
      let proxiesData: any[] = [];
      
      if (response && typeof response === 'object') {
        // Check if it's wrapped in APIResponse format
        if ('data' in response && Array.isArray((response as any).data)) {
          proxiesData = (response as any).data;
        } else if (Array.isArray(response.data)) {
          // Direct array response from axios
          proxiesData = response.data as any[];
        } else if (Array.isArray(response)) {
          // Direct array response
          proxiesData = response as any[];
        }
      }
      
      // Transform SQL null types to simple values for React
      const cleanedProxies: FrontendProxy[] = proxiesData.map((proxy: any) => ({
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

  async getProxyModelById(proxyId: string): Promise<ProxyModelCreationResponse> {
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

  async createProxy(payload: ProxyModelCreationPayload): Promise<ProxyModelCreationResponse> {
    try {
      const convertedPayload = {
        ...payload,
        protocol: validateProtocol(payload.protocol || 'http')
      };
      const response = await proxiesApi.addProxy({ data: convertedPayload });
      // Transform the response data to frontend-safe format
      const proxy = response.data as any;
      const transformedProxy: FrontendProxy = {
        id: proxy.id,
        name: proxy.name || "",
        description: transformSqlNullString(proxy.description) || "",
        address: proxy.address || "",
        protocol: proxy.protocol || "http",
        username: transformSqlNullString(proxy.username) || "",
        host: transformSqlNullString(proxy.host) || "",
        port: transformSqlNullInt32(proxy.port),
        isEnabled: proxy.isEnabled || false,
        isHealthy: proxy.isHealthy || false,
        lastStatus: transformSqlNullString(proxy.lastStatus) || "",
        lastCheckedAt: transformSqlNullString(proxy.lastCheckedAt),
        latencyMs: transformSqlNullInt32(proxy.latencyMs),
        city: transformSqlNullString(proxy.city) || "",
        countryCode: transformSqlNullString(proxy.countryCode) || "",
        provider: transformSqlNullString(proxy.provider) || "",
        createdAt: proxy.createdAt,
        updatedAt: proxy.updatedAt,
        status: !proxy.isEnabled ? 'Disabled' : (proxy.isHealthy ? 'Active' : 'Failed'),
        lastTested: transformSqlNullString(proxy.lastCheckedAt),
        successCount: 0,
        failureCount: 0,
        lastError: transformSqlNullString(proxy.lastStatus) || "",
        notes: transformSqlNullString(proxy.notes) || ""
      };
      return {
        status: 'success',
        data: transformedProxy,
        message: 'Proxy created successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProxy(proxyId: string, payload: ProxyModelUpdatePayload): Promise<ProxyModelUpdateResponse> {
    try {
      const { protocol, ...restPayload } = payload;
      const convertedPayload = {
        ...restPayload,
        ...(protocol && { protocol: validateProtocol(protocol) })
      };
      const response = await proxiesApi.updateProxy(proxyId, { data: convertedPayload });
      return {
        status: 'success',
        data: response.data as ProxyModel,
        message: 'Proxy updated successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProxy(proxyId: string): Promise<ProxyModelDeleteResponse> {
    try {
      await proxiesApi.deleteProxy(proxyId);
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
      const response = await proxiesApi.testProxy(proxyId);
      return {
        status: 'success',
        data: response.data,
        message: 'Proxy test completed successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async forceProxyModelHealthCheck(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await proxiesApi.forceCheckSingleProxy(proxyId);
      return {
        status: 'success',
        data: response.data,
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
      const response = await proxiesApi.forceCheckAllProxies();
      return {
        status: 'success',
        data: response.data,
        message: 'All proxies health check completed'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProxyModelStatuses(): Promise<ApiResponse<unknown>> {
    try {
      const response = await proxiesApi.getProxyStatuses();
      return {
        status: 'success',
        data: response.data,
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
      const proxy = await this.getProxyModelById(proxyId);
      if (proxy.status !== 'success' || !proxy.data) {
        return {
          status: 'error',
          message: 'Proxy not found'
        };
      }

      const updatePayload: ProxyModelUpdatePayload = {
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
      const proxy = await this.getProxyModelById(proxyId);
      if (proxy.status !== 'success' || !proxy.data) {
        return {
          status: 'error',
          message: 'Proxy not found'
        };
      }

      const updatePayload: ProxyModelUpdatePayload = {
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
export const proxyService = ProxyModelService.getInstance();

export const getProxies = () => proxyService.getProxies();
export const getProxyModelById = (proxyId: string) => proxyService.getProxyModelById(proxyId);
export const createProxy = (payload: ProxyModelCreationPayload) => proxyService.createProxy(payload);
export const updateProxy = (proxyId: string, payload: ProxyModelUpdatePayload) => proxyService.updateProxy(proxyId, payload);
export const deleteProxy = (proxyId: string) => proxyService.deleteProxy(proxyId);
export const testProxy = (proxyId: string) => proxyService.testProxy(proxyId);
export const enableProxy = (proxyId: string) => proxyService.enableProxy(proxyId);
export const disableProxy = (proxyId: string) => proxyService.disableProxy(proxyId);
export const forceProxyModelHealthCheck = (proxyId: string) => proxyService.forceProxyModelHealthCheck(proxyId);
export const forceAllProxiesHealthCheck = () => proxyService.forceAllProxiesHealthCheck();
export const getProxyModelStatuses = () => proxyService.getProxyModelStatuses();

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
