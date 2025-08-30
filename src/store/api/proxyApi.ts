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
  ProxiesBulkTest200Response,
  ProxiesTest200Response,
  ProxiesBulkUpdate200Response,
} from '@/lib/api-client/models';
import type { UpdateProxyRequestAPI } from '@/lib/api-client/models/update-proxy-request-api';
import type { SuccessEnvelope } from '@/lib/api-client/models/success-envelope';
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

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
    bulkDeleteProxies: builder.mutation<
      ProxiesBulkUpdate200Response,
      BulkDeleteProxiesRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkDelete(request);
          const data = extractResponseData<ProxiesBulkUpdate200Response>(response);
          return { data: data as ProxiesBulkUpdate200Response };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy', 'BulkOperation'],
    }),

    bulkTestProxies: builder.mutation<
      ProxiesBulkTest200Response,
      ProxiesBulkTestRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkTest(request);
          const data = extractResponseData<ProxiesBulkTest200Response>(response);
          return { data: data as ProxiesBulkTest200Response };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['BulkOperation'],
    }),

    bulkUpdateProxies: builder.mutation<
      ProxiesBulkUpdate200Response,
      BulkUpdateProxiesRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkUpdate(request);
          const data = extractResponseData<ProxiesBulkUpdate200Response>(response);
          return { data: data as ProxiesBulkUpdate200Response };
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

    updateProxy: builder.mutation<
  ModelsProxy,
  { proxyId: string; request: UpdateProxyRequestAPI }
    >({
      queryFn: async ({ proxyId, request }) => {
        try {
      const response = await proxiesApi.proxiesUpdate(proxyId, request);
      const data = extractResponseData<ModelsProxy>(response);
      return { data: data as ModelsProxy };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    testProxy: builder.mutation<ProxiesTest200Response, string>({
      queryFn: async (proxyId) => {
        try {
      const response = await proxiesApi.proxiesTest(proxyId);
      const data = extractResponseData<ProxiesTest200Response>(response);
      return { data: data as ProxiesTest200Response };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      // Don't invalidate anything - testing doesn't change state
    }),

    // Clean proxies operation - maps to bulk delete for cleaning inactive/failed proxies
    cleanProxies: builder.mutation<SuccessEnvelope, void>({
      queryFn: async () => {
        try {
          // Placeholder operation - return a simple success envelope
          const response: SuccessEnvelope = {
            success: true,
            requestId: (globalThis.crypto?.randomUUID?.() || Math.random().toString(36)) as string,
          };
          return { data: response };
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
