/**
 * Professional Proxy API - RTK Query wrapper around generated OpenAPI client
 * Unlike amateur hand-rolled API clients, this uses our generated types
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ProxiesApi } from '@/lib/api-client';
import type { AxiosError } from 'axios';
import { apiConfiguration } from '@/lib/api/config';
import type {
  BulkDeleteProxiesRequest,
  ProxiesBulkTestRequest,
  BulkUpdateProxiesRequest,
  BulkProxyTestResponse,
  ProxyTestResponse,
  BulkProxyOperationResponse,
  Proxy,
  ErrorEnvelope,
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
    bulkDeleteProxies: builder.mutation<void, BulkDeleteProxiesRequest>({
      queryFn: async (request) => {
        try {
          await proxiesApi.proxiesBulkDelete(request);
          return { data: undefined };
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Bulk delete failed' };
          return { error: { status, data } };
        }
      },
      invalidatesTags: ['Proxy', 'BulkOperation'],
    }),

    bulkTestProxies: builder.mutation<BulkProxyTestResponse, ProxiesBulkTestRequest>({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkTest(request);
          return { data: response.data };
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Bulk test failed' };
          return { error: { status, data } };
        }
      },
      invalidatesTags: ['BulkOperation'],
    }),

    bulkUpdateProxies: builder.mutation<BulkProxyOperationResponse, BulkUpdateProxiesRequest>({
      queryFn: async (request) => {
        try {
          const response = await proxiesApi.proxiesBulkUpdate(request);
          return { data: response.data };
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Bulk update failed' };
          return { error: { status, data } };
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
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Delete failed' };
          return { error: { status, data } };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    updateProxy: builder.mutation<Proxy, { proxyId: string; request: UpdateProxyRequestAPI }>({
      queryFn: async ({ proxyId, request }) => {
        try {
          const response = await proxiesApi.proxiesUpdate(proxyId, request);
          return { data: response.data };
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Update failed' };
          return { error: { status, data } };
        }
      },
      invalidatesTags: ['Proxy'],
    }),

    testProxy: builder.mutation<ProxyTestResponse, string>({
      queryFn: async (proxyId) => {
        try {
          const response = await proxiesApi.proxiesTest(proxyId);
          return { data: response.data };
        } catch (error) {
          const err = error as AxiosError<ErrorEnvelope>;
          const status = err.response?.status ?? 500;
          const data = (err.response?.data as ErrorEnvelope | undefined) ?? { message: err.message || 'Test failed' };
          return { error: { status, data } };
        }
      },
      // Don't invalidate anything - testing doesn't change state
    }),

    // Clean proxies operation - maps to bulk delete for cleaning inactive/failed proxies
    cleanProxies: builder.mutation<{ success: boolean; cleaned: number }, void>({
      queryFn: async () => {
        // No remote call yet – placeholder for future implementation
        return { data: { success: true, cleaned: 0 } };
      },
      invalidatesTags: ['Proxy'],
    }),
  }),
});

// Export hooks for components
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
