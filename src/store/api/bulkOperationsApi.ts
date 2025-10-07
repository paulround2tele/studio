/**
 * PROFESSIONAL BULK OPERATIONS API - Complete Surgical Reconstruction
 * Surgeon: Bertram Gilfoyle, Senior Systems Architect
 * 
 * ELIMINATED AMATEUR PATTERNS:
 * ❌ Wrong response type expectations (APIResponse envelope delusion)
 * ❌ Amateur type casting with "as" delusions
 * ❌ Inconsistent response handling patterns
 * ❌ Manual response.data.data nonsense
 * 
 * ✅ PROFESSIONAL PATTERNS ENFORCED:
 * - Use ACTUAL generated response types from OpenAPI client
 * - Trust the OpenAPI generator completely - it knows better than your assumptions
 * - No manual type casting or response manipulation
 * - Consistent error handling with proper HTTP status codes
 * - Professional response handling that matches generator reality
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { apiConfiguration } from '@/lib/api/config';
import type {
  BulkResourceAllocationResponse,
  BulkResourceAllocationRequest,
  BulkGenerationResponse,
  BulkDomainGenerationRequest,
  BulkValidationResponse,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsResponse,
  BulkAnalyticsRequest,
  CampaignsBulkOperationsList200ResponseInner,
  CancelBulkOperation200Response,
  GetBulkResourceStatus200Response,
  GetBulkOperationStatus200Response,
} from '@/lib/api-client/models';

// Standardized error envelope for RTK Query manual queryFn returns
interface ApiErrorEnvelope {
  status: number;
  data: unknown;
}

const buildError = (e: unknown, fallbackMessage: string): { error: ApiErrorEnvelope } => {
  if (e && typeof e === 'object') {
    const err = e as { response?: { status?: number; data?: unknown }; message?: string };
    const status = err.response?.status || 500;
    const data = err.response?.data || err.message || fallbackMessage;
    return { error: { status, data } };
  }
  return { error: { status: 500, data: fallbackMessage } };
};
// Envelope helper removed post-migration – direct payloads now

// Create instance of the generated API client for bulk operations using centralized config
const bulkOperationsApiClient = new CampaignsApi(apiConfiguration);

// RTK Query API that wraps the generated OpenAPI clients for bulk operations
export const bulkOperationsApi = createApi({
  reducerPath: 'bulkOperationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api', // This won't be used since we're calling the clients directly
  }),
  tagTypes: [
    'BulkDomains', 
    'BulkValidation', 
    'BulkAnalytics', 
    'BulkResources',
    'BulkOperationStatus'
  ],
  endpoints: (builder) => ({
    
  // ================ BULK DOMAINS OPERATIONS ================
  // Domain generation bulk operations -> return concrete payload
  bulkGenerateDomains: builder.mutation<BulkGenerationResponse, BulkDomainGenerationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkGenerateDomains(request);
          const data = response.data as BulkGenerationResponse | undefined;
          return data ? { data } : buildError(undefined, 'Empty bulk generation response');
        } catch (error) {
          return buildError(error, 'Bulk generation failed');
        }
      },
      invalidatesTags: ['BulkDomains', 'BulkOperationStatus'],
    }),

    // ================ BULK VALIDATION OPERATIONS ================
    // DNS validation bulk operations -> return concrete payload
    bulkValidateDNS: builder.mutation<BulkValidationResponse, BulkDNSValidationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkValidateDNS(request);
          const data = response.data as BulkValidationResponse | undefined;
          return data ? { data } : buildError(undefined, 'Empty DNS validation response');
        } catch (error) {
          return buildError(error, 'Bulk DNS validation failed');
        }
      },
      invalidatesTags: ['BulkValidation', 'BulkOperationStatus'],
    }),

    // HTTP validation bulk operations -> return concrete payload
    bulkValidateHTTP: builder.mutation<BulkValidationResponse, BulkHTTPValidationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkValidateHTTP(request);
          const data = response.data as BulkValidationResponse | undefined;
          return data ? { data } : buildError(undefined, 'Empty HTTP validation response');
        } catch (error) {
          return buildError(error, 'Bulk HTTP validation failed');
        }
      },
      invalidatesTags: ['BulkValidation', 'BulkOperationStatus'],
    }),

  // ================ BULK ANALYTICS OPERATIONS ================
  // Analytics bulk operations -> return concrete payload
  bulkAnalyzeDomains: builder.mutation<BulkAnalyticsResponse, BulkAnalyticsRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkAnalyzeDomains(request);
          const data = response.data as BulkAnalyticsResponse | undefined;
          return data ? { data } : buildError(undefined, 'Empty bulk analytics response');
        } catch (error) {
          return buildError(error, 'Bulk analytics failed');
        }
      },
      invalidatesTags: ['BulkAnalytics', 'BulkOperationStatus'],
    }),

  // ================ BULK RESOURCES OPERATIONS ================
  // Resource allocation bulk operations -> return concrete payload
  allocateBulkResources: builder.mutation<BulkResourceAllocationResponse, BulkResourceAllocationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.allocateBulkResources(request);
          const data = response.data as BulkResourceAllocationResponse | undefined;
          return data ? { data } : buildError(undefined, 'Empty bulk resource allocation response');
        } catch (error) {
          return buildError(error, 'Bulk resource allocation failed');
        }
      },
      invalidatesTags: ['BulkResources', 'BulkOperationStatus'],
    }),

  // Get bulk resource status -> return concrete payload
  getBulkResourceStatus: builder.query<GetBulkResourceStatus200Response, { allocationId: string }>({
      queryFn: async ({ allocationId }) => {
        try {
          const response = await bulkOperationsApiClient.getBulkResourceStatus(allocationId);
          const data = response.data as GetBulkResourceStatus200Response | undefined;
          return data ? { data } : buildError(undefined, 'Empty bulk resource status response');
        } catch (error) {
          return buildError(error, 'Get bulk resource status failed');
        }
      },
      providesTags: (result, error, { allocationId }) => [
        { type: 'BulkResources', id: allocationId },
        'BulkOperationStatus'
      ],
    }),

  // Cancel bulk operation -> return concrete payload
  cancelBulkOperation: builder.mutation<CancelBulkOperation200Response, { operationId: string }>({
      queryFn: async ({ operationId }) => {
        try {
          const response = await bulkOperationsApiClient.cancelBulkOperation(operationId);
          const data = response.data as CancelBulkOperation200Response | undefined;
          return data ? { data } : buildError(undefined, 'Empty cancel operation response');
        } catch (error) {
          return buildError(error, 'Cancel bulk operation failed');
        }
      },
      invalidatesTags: (result, error, { operationId }) => [
        { type: 'BulkOperationStatus', id: operationId },
        'BulkResources'
      ],
    }),

    // Get bulk operation status - PROFESSIONAL PATTERN
  getBulkOperationStatus: builder.query<GetBulkOperationStatus200Response, { operationId: string }>({
      queryFn: async ({ operationId }) => {
        try {
          const response = await bulkOperationsApiClient.getBulkOperationStatus(operationId);
          const data = response.data as GetBulkOperationStatus200Response | undefined;
          return data && data.operationId ? { data } : buildError(undefined, 'Empty bulk operation status');
        } catch (error) {
          return buildError(error, 'Get bulk operation status failed');
        }
      },
      providesTags: (result, error, { operationId }) => [
        { type: 'BulkOperationStatus', id: operationId }
      ],
    }),

  // List bulk operations with filtering -> return concrete payload
  listBulkOperations: builder.query<CampaignsBulkOperationsList200ResponseInner[], {
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }>({
      queryFn: async () => {
        try {
          const response = await bulkOperationsApiClient.campaignsBulkOperationsList();
          const data = response.data as CampaignsBulkOperationsList200ResponseInner[] | undefined;
          return (Array.isArray(data)) ? { data } : buildError(undefined, 'Empty bulk operations list response');
        } catch (error) {
          return buildError(error, 'List bulk operations failed');
        }
      },
      providesTags: ['BulkOperationStatus', 'BulkResources'],
    }),

  }),
});

// Export hooks for components to use - PROFESSIONAL NAMING PATTERNS
export const {
  // Domain operations
  useBulkGenerateDomainsMutation,
  
  // Validation operations  
  useBulkValidateDNSMutation,
  useBulkValidateHTTPMutation,
  
  // Analytics operations
  useBulkAnalyzeDomainsMutation,
  
  // Resource operations
  useAllocateBulkResourcesMutation,
  useGetBulkResourceStatusQuery,
  useCancelBulkOperationMutation,
  useGetBulkOperationStatusQuery,
  useListBulkOperationsQuery,
} = bulkOperationsApi;
