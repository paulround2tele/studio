import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BulkOperationsApi } from '@/lib/api-client/apis/bulk-operations-api';
import type { 
  BulkDomainGenerationRequest,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsRequest,
  BulkResourceRequest,
  BulkAnalyzeDomains200Response,
  BulkOperationStatus,
  BulkOperationListResponse,
  OperationCancellationResponse,
  BulkResourceStatusResponse,
  APIResponse,
  BulkValidationResponse,
  BulkDomainGenerationResponse
} from '@/lib/api-client/models';

// Create instance of the generated API client for bulk operations
const bulkOperationsApiClient = new BulkOperationsApi();

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
    // Domain generation bulk operations
    bulkGenerateDomains: builder.mutation<BulkDomainGenerationResponse, BulkDomainGenerationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkGenerateDomains(request);
          const apiResponse = response.data as APIResponse;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as BulkDomainGenerationResponse };
          } else {
            return { 
              error: { 
                status: 500, 
                data: apiResponse.error?.message || 'Bulk domain generation failed' 
              } 
            };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['BulkDomains', 'BulkOperationStatus'],
    }),

    // ================ BULK VALIDATION OPERATIONS ================
    // DNS validation bulk operations  
    bulkValidateDNS: builder.mutation<BulkValidationResponse, BulkDNSValidationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkValidateDNS(request);
          const apiResponse = response.data as APIResponse;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as BulkValidationResponse };
          } else {
            return { 
              error: { 
                status: 500, 
                data: apiResponse.error?.message || 'Bulk DNS validation failed' 
              } 
            };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['BulkValidation', 'BulkOperationStatus'],
    }),

    // HTTP validation bulk operations
    bulkValidateHTTP: builder.mutation<BulkValidationResponse, BulkHTTPValidationRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkValidateHTTP(request);
          const apiResponse = response.data as APIResponse;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as BulkValidationResponse };
          } else {
            return { 
              error: { 
                status: 500, 
                data: apiResponse.error?.message || 'Bulk HTTP validation failed' 
              } 
            };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['BulkValidation', 'BulkOperationStatus'],
    }),

    // ================ BULK ANALYTICS OPERATIONS ================
    // Analytics bulk operations
    bulkAnalyzeDomains: builder.mutation<BulkAnalyzeDomains200Response, BulkAnalyticsRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.bulkAnalyzeDomains(request);
          const apiResponse = response.data as APIResponse;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as BulkAnalyzeDomains200Response };
          } else {
            return { 
              error: { 
                status: 500, 
                data: apiResponse.error?.message || 'Bulk domain analysis failed' 
              } 
            };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['BulkAnalytics', 'BulkOperationStatus'],
    }),

    // ================ BULK RESOURCES OPERATIONS ================
    // Resource allocation bulk operations
    allocateBulkResources: builder.mutation<BulkAnalyzeDomains200Response, BulkResourceRequest>({
      queryFn: async (request) => {
        try {
          const response = await bulkOperationsApiClient.allocateBulkResources(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['BulkResources', 'BulkOperationStatus'],
    }),

    // Get bulk resource status
    getBulkResourceStatus: builder.query<BulkResourceStatusResponse, { allocationId: string }>({
      queryFn: async ({ allocationId }) => {
        try {
          const response = await bulkOperationsApiClient.getBulkResourceStatus(allocationId);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, { allocationId }) => [
        { type: 'BulkResources', id: allocationId },
        'BulkOperationStatus'
      ],
    }),

    // Cancel bulk operation
    cancelBulkOperation: builder.mutation<OperationCancellationResponse, { operationId: string }>({
      queryFn: async ({ operationId }) => {
        try {
          const response = await bulkOperationsApiClient.cancelBulkOperation(operationId);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { operationId }) => [
        { type: 'BulkOperationStatus', id: operationId },
        'BulkResources'
      ],
    }),

    // Get bulk operation status
    getBulkOperationStatus: builder.query<BulkOperationStatus, { operationId: string }>({
      queryFn: async ({ operationId }) => {
        try {
          const response = await bulkOperationsApiClient.getBulkOperationStatus(operationId);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, { operationId }) => [
        { type: 'BulkOperationStatus', id: operationId }
      ],
    }),

    // List bulk operations with filtering
    listBulkOperations: builder.query<BulkOperationListResponse, { 
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }>({
      queryFn: async ({ status, type, limit, offset }) => {
        try {
          const response = await bulkOperationsApiClient.listBulkOperations(status, type, limit, offset);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: ['BulkOperationStatus', 'BulkResources'],
    }),

  }),
});

// Export hooks for components to use
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
