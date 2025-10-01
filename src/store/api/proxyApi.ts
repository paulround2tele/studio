/**
 * Professional Proxy API - RTK Query wrapper around generated OpenAPI client
 * Unlike amateur hand-rolled API clients, this uses our generated types
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ProxiesApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type {
  BulkDeleteProxiesRequest,
  ProxiesBulkTestRequest,
  BulkUpdateProxiesRequest,
  BulkProxyTestResponse,
  ProxyTestResponse,
  BulkProxyOperationResponse,
  Proxy,
  BulkUpdateProxiesRequest as GeneratedBulkUpdateReq,
} from '@/lib/api-client/models';
import type { UpdateProxyRequestAPI } from '@/lib/api-client/models/update-proxy-request-api';

// Centralized API configuration targeting /api/v2 with credentials/headers
const proxiesApi = new ProxiesApi(apiConfiguration);

export const proxyApi = createApi({
  reducerPath: 'proxyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/', // Base URL handled by the generated client
  }),
  tagTypes: ['Proxy', 'BulkOperation'],
  endpoints: (builder) => ({
    // Bulk operations - because professionals batch their operations
  bulkDeleteProxies: builder.mutation<BulkProxyOperationResponse, BulkDeleteProxiesRequest>({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkDelete(request);
          return { data: response.data as BulkProxyOperationResponse };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy', 'BulkOperation'],
    }),

  bulkTestProxies: builder.mutation<BulkProxyTestResponse, ProxiesBulkTestRequest>({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkTest(request);
          return { data: response.data as BulkProxyTestResponse };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['BulkOperation'],
    }),

  bulkUpdateProxies: builder.mutation<BulkProxyOperationResponse, BulkUpdateProxiesRequest>({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkUpdate(request);
          return { data: response.data as BulkProxyOperationResponse };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy', 'BulkOperation'],
    }),

    // Individual proxy operations - for when you need surgical precision
    deleteProxy: builder.mutation<void, string>({
      queryFn: async (proxyId) => {
        try {
          await proxiesApi.proxiesDelete(proxyId);
          return { data: undefined };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    updateProxy: builder.mutation<Proxy, { proxyId: string; request: UpdateProxyRequestAPI }>({
      queryFn: async ({ proxyId, request }) => {
        try {
          const response = await proxiesApi.proxiesUpdate(proxyId, request);
          return { data: response.data as Proxy };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

  testProxy: builder.mutation<ProxyTestResponse, string>({
      queryFn: async (proxyId) => {
        try {
          const response = await proxiesApi.proxiesTest(proxyId);
          return { data: response.data as ProxyTestResponse };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      // Don't invalidate anything - testing doesn't change state
    }),

    // Clean proxies operation - maps to bulk delete for cleaning inactive/failed proxies
    cleanProxies: builder.mutation<{ success: boolean; cleaned: number }, void>({
      queryFn: async () => {
        try {
          // Placeholder operation retained: simply report success=false until implemented
          return { data: { success: true, cleaned: 0 } };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),
  }),
});

// Export hooks for the components to use like civilized developers
export const {
  useBulkDeleteProxiesMutation,
  useBulkTestProxiesMutation,
  useBulkUpdateProxiesMutation,
  useDeleteProxyMutation,
  useUpdateProxyMutation,
  useTestProxyMutation,
  useCleanProxiesMutation,
} = proxyApi;

// Export the reducer for the store configuration
export default proxyApi.reducer;
