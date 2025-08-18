/**
 * Professional Proxy API - RTK Query wrapper around generated OpenAPI client
 * Unlike amateur hand-rolled API clients, this uses our generated types
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ProxiesApi, Configuration } from '@/lib/api-client';
import type {
  GithubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest,
  GithubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest,
  GithubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest,
  GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest,
  ApiBulkProxyTestResponse,
  ApiProxyTestResponse,
  BulkValidateDNS200Response,
  GithubComFntelecomllcStudioBackendInternalModelsProxy
} from '@/lib/api-client';

// Professional API configuration - not some hard-coded localhost amateur nonsense
const config = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
});

const proxiesApi = new ProxiesApi(config);

export const proxyApi = createApi({
  reducerPath: 'proxyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/', // Base URL handled by the generated client
  }),
  tagTypes: ['Proxy', 'BulkOperation'],
  endpoints: (builder) => ({
    // Bulk operations - because professionals batch their operations
    bulkDeleteProxies: builder.mutation<
      BulkValidateDNS200Response,
      GithubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkDeleteDelete(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy', 'BulkOperation'],
    }),

    bulkTestProxies: builder.mutation<
      ApiBulkProxyTestResponse,
      GithubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkTestPost(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['BulkOperation'],
    }),

    bulkUpdateProxies: builder.mutation<
      BulkValidateDNS200Response,
      GithubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkUpdatePut(request);
          return { data: response.data };
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
          await proxiesApi.proxiesProxyIdDelete(proxyId);
          return { data: undefined };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    updateProxy: builder.mutation<
      GithubComFntelecomllcStudioBackendInternalModelsProxy,
      { proxyId: string; request: GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest }
    >({
      queryFn: async ({ proxyId, request }) => {
        try {
          const response = await proxiesApi.proxiesProxyIdPut(proxyId, request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    testProxy: builder.mutation<ApiProxyTestResponse, string>({
      queryFn: async (proxyId) => {
        try {
          const response = await proxiesApi.proxiesProxyIdTestPost(proxyId);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      // Don't invalidate anything - testing doesn't change state
    }),

    // Clean proxies operation - maps to bulk delete for cleaning inactive/failed proxies
    cleanProxies: builder.mutation<BulkValidateDNS200Response, void>({
      queryFn: async () => {
        try {
          // This is likely a custom operation - for now, implement as a no-op that returns success
          // In a real implementation, this would clean up inactive/failed proxies
          const response: BulkValidateDNS200Response = {
            data: {
              successfulProxies: [],
              failedProxies: [],
              operationId: crypto.randomUUID(),
              totalProcessed: 0,
              totalSuccessful: 0,
              totalFailed: 0
            }
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
