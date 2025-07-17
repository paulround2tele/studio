// src/lib/services/proxyService.ts
// Production Proxy Service - Direct OpenAPI integration without adapters

import { ProxiesApi, Configuration } from '@/lib/api-client';
import {
  CreateProxyRequest,
  UpdateProxyRequest,
  Proxy as ProxyModel,
  CreateProxyRequestProtocolEnum,
  UpdateProxyRequestProtocolEnum,
} from '@/lib/api-client/models';
import type { components } from '@/lib/api-client/types';
import { getApiBaseUrlSync } from '@/lib/config/environment';
import { transformProxyData } from '@/lib/utils/sqlNullTransformers';

// Use direct OpenAPI types
type FrontendProxy = components['schemas']['Proxy'];
import {
  extractResponseData
} from '@/lib/utils/apiResponseHelpers';

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
const validateProtocol = (protocol: string): CreateProxyRequestProtocolEnum => {
  const validProtocols = ['http', 'https', 'socks5', 'socks4'];
  const validatedProtocol = validProtocols.includes(protocol) ? protocol : 'http';
  return validatedProtocol as CreateProxyRequestProtocolEnum;
};

const validateUpdateProtocol = (protocol: string): UpdateProxyRequestProtocolEnum => {
  const validProtocols = ['http', 'https', 'socks5', 'socks4'];
  const validatedProtocol = validProtocols.includes(protocol) ? protocol : 'http';
  return validatedProtocol as UpdateProxyRequestProtocolEnum;
};

// Service layer response wrappers aligned with unified backend envelope format
export interface ProxiesListResponse {
  success: boolean;
  data: FrontendProxy[];
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyModelCreationResponse {
  success: boolean;
  data?: FrontendProxy;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyModelUpdateResponse {
  success: boolean;
  data?: ProxyModel;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface ProxyModelDeleteResponse {
  success: boolean;
  data?: null;
  error: string | null;
  requestId: string;
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
      const axiosResponse = await proxiesApi.listProxies();
      const proxiesData = extractResponseData<any[]>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `proxies-${Date.now()}`;
      
      // Transform backend Proxy[] to frontend-safe format using comprehensive transformer
      const cleanedProxies: FrontendProxy[] = (proxiesData || []).map((proxy: any) => {
        const transformed = transformProxyData(proxy);
        return {
          id: transformed.id,
          name: transformed.name || "",
          description: transformed.description || "",
          address: transformed.address || "",
          protocol: transformed.protocol || "http",
          username: transformed.username || "",
          host: transformed.host || "",
          port: transformed.port,
          isEnabled: transformed.isEnabled || false,
          isHealthy: transformed.isHealthy || false,
          lastStatus: transformed.lastStatus || "",
          lastCheckedAt: transformed.lastCheckedAt,
          latencyMs: transformed.latencyMs,
          city: transformed.city || "",
          countryCode: transformed.countryCode || "",
          provider: transformed.provider || "",
          createdAt: transformed.createdAt,
          updatedAt: transformed.updatedAt,
          status: !transformed.isEnabled ? 'Disabled' : (transformed.isHealthy ? 'Active' : 'Failed'),
          lastTested: transformed.lastCheckedAt,
          successCount: "0",
          failureCount: "0",
          lastError: transformed.lastStatus || "",
          notes: transformed.notes || ""
        };
      });
      
      return {
        success: true,
        data: cleanedProxies,
        error: null,
        requestId,
        message: 'Proxies retrieved successfully'
      };
    } catch (error: any) {
      console.error('[ProxyService] Error getting proxies:', error);
      return {
        success: false,
        data: [],
        error: error.message || 'Failed to get proxies',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to get proxies'
      };
    }
  }

  async getProxyModelById(proxyId: string): Promise<ProxyModelCreationResponse> {
    // Backend doesn't have individual GET endpoint, fetch from list
    const response = await this.getProxies();
    const proxy = response.data?.find(p => p.id === proxyId);
    
    if (!proxy) {
      return {
        success: false,
        error: `Proxy with ID ${proxyId} not found`,
        requestId: response.requestId || (globalThis.crypto?.randomUUID?.() || Math.random().toString(36))
      };
    }
    
    return {
      ...response,
      data: proxy
    };
  }

  async createProxy(payload: ProxyModelCreationPayload): Promise<ProxyModelCreationResponse> {
    try {
      const convertedPayload = {
        ...payload,
        protocol: validateProtocol(payload.protocol || 'http')
      };
      
      const axiosResponse = await proxiesApi.addProxy(convertedPayload);
      const proxy = extractResponseData<any>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `create-proxy-${Date.now()}`;
      
      // Transform the response data to frontend-safe format using comprehensive transformer
      const transformed = transformProxyData(proxy);
      const transformedProxy: FrontendProxy = {
        id: transformed.id,
        name: transformed.name || "",
        description: transformed.description || "",
        address: transformed.address || "",
        protocol: transformed.protocol || "http",
        username: transformed.username || "",
        host: transformed.host || "",
        port: transformed.port,
        isEnabled: transformed.isEnabled || false,
        isHealthy: transformed.isHealthy || false,
        lastStatus: transformed.lastStatus || "",
        lastCheckedAt: transformed.lastCheckedAt,
        latencyMs: transformed.latencyMs,
        city: transformed.city || "",
        countryCode: transformed.countryCode || "",
        provider: transformed.provider || "",
        createdAt: transformed.createdAt,
        updatedAt: transformed.updatedAt,
        status: !transformed.isEnabled ? 'Disabled' : (transformed.isHealthy ? 'Active' : 'Failed'),
        lastTested: transformed.lastCheckedAt,
        successCount: "0",
        failureCount: "0",
        lastError: transformed.lastStatus || "",
        notes: transformed.notes || ""
      };
      
      return {
        success: true,
        data: transformedProxy,
        error: null,
        requestId,
        message: 'Proxy created successfully'
      };
    } catch (error: any) {
      console.error('[ProxyService] Error creating proxy:', error);
      return {
        success: false,
        data: undefined,
        error: error.message || 'Failed to create proxy',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error.message || 'Failed to create proxy'
      };
    }
  }

  async updateProxy(proxyId: string, payload: ProxyModelUpdatePayload): Promise<ProxyModelUpdateResponse> {
    try {
      const { protocol, ...restPayload } = payload;
      const convertedPayload = {
        ...restPayload,
        ...(protocol && { protocol: validateUpdateProtocol(protocol) })
      };
      
      const axiosResponse = await proxiesApi.updateProxy(proxyId, convertedPayload);
      const proxy = extractResponseData<ProxyModel>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `update-proxy-${Date.now()}`;
      
      return {
        success: true,
        data: proxy!,
        error: null,
        requestId
      };
    } catch (error: any) {
      console.error('[ProxyService] Error updating proxy:', error);
      return {
        success: false,
        data: undefined as any,
        error: error.message || 'Failed to update proxy',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
      };
    }
  }

  async deleteProxy(proxyId: string): Promise<ProxyModelDeleteResponse> {
    try {
      const axiosResponse = await proxiesApi.deleteProxy(proxyId);
      extractResponseData<null>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `delete-proxy-${Date.now()}`;
      
      return {
        success: true,
        data: null,
        error: null,
        requestId
      };
    } catch (error: any) {
      console.error('[ProxyService] Error deleting proxy:', error);
      return {
        success: false,
        data: undefined as any,
        error: error.message || 'Failed to delete proxy',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
      };
    }
  }

  async testProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const axiosResponse = await proxiesApi.testProxy(proxyId);
      const result = extractResponseData<unknown>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `test-proxy-${Date.now()}`;
      
      return {
        success: true,
        data: result,
        error: null,
        requestId
      };
    } catch (error: any) {
      console.error('[ProxyService] Error testing proxy:', error);
      return {
        success: false,
        data: undefined as any,
        error: error.message || 'Failed to test proxy',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
      };
    }
  }

  async forceProxyModelHealthCheck(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await proxiesApi.forceCheckSingleProxy(proxyId);
      return {
        success: true,
        data: response.data,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36),
        message: 'Proxy health check completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
      };
    }
  }

  async forceAllProxiesHealthCheck(): Promise<ApiResponse<unknown>> {
    try {
      const response = await proxiesApi.forceCheckAllProxies({});
      return {
        success: true,
        data: response.data,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36),
        message: 'All proxies health check completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
      };
    }
  }

  async getProxyModelStatuses(): Promise<ApiResponse<unknown>> {
    try {
      const response = await proxiesApi.getProxyStatuses();
      return {
        success: true,
        data: response.data,
        error: null,
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36),
        message: 'Proxy statuses retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
      };
    }
  }

  // Helper methods for enable/disable via update
  async enableProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const proxy = await this.getProxyModelById(proxyId);
      if (!proxy.success || !proxy.data) {
        return {
          success: false,
          error: 'Proxy not found',
          requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
        };
      }

      const updatePayload: ProxyModelUpdatePayload = {
        isEnabled: true
      };

      const result = await this.updateProxy(proxyId, updatePayload);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        requestId: result.requestId,
        message: result.success ? 'Proxy enabled successfully' : (result.error || 'Unknown error')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
      };
    }
  }

  async disableProxy(proxyId: string): Promise<ApiResponse<unknown>> {
    try {
      const proxy = await this.getProxyModelById(proxyId);
      if (!proxy.success || !proxy.data) {
        return {
          success: false,
          error: 'Proxy not found',
          requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
        };
      }

      const updatePayload: ProxyModelUpdatePayload = {
        isEnabled: false
      };

      const result = await this.updateProxy(proxyId, updatePayload);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        requestId: result.requestId,
        message: result.success ? 'Proxy disabled successfully' : (result.error || 'Unknown error')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36)
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
    
    if (!response.success || !response.data) {
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
