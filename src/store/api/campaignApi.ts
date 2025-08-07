import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { 
  ApiAPIResponse,
  ServicesCreateLeadGenerationCampaignRequest,
  ApiPhaseConfigureRequest,
  ApiBulkEnrichedDataRequest,
  ApiPatternOffsetRequest,
  ApiPatternOffsetResponse
} from '@/lib/api-client/models';
import type { CampaignCurrentPhaseEnum } from '@/lib/api-client/models/campaign';

// Create a single instance of the generated API client
const campaignsApiClient = new CampaignsApi();

// RTK Query API that wraps the generated OpenAPI client
export const campaignApi = createApi({
  reducerPath: 'campaignApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api', // This won't be used since we're calling the client directly
  }),
  tagTypes: ['Campaign', 'CampaignPhases', 'CampaignStatus'],
  endpoints: (builder) => ({
    // Create new campaign using generated client with proper type safety
    createCampaign: builder.mutation<ApiAPIResponse, ServicesCreateLeadGenerationCampaignRequest>({
      queryFn: async (campaign) => {
        try {
          const response = await (await campaignsApiClient.createLeadGenerationCampaign(campaign))();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['Campaign'],
    }),
    
        
    // Configure phase using generated client with proper type safety
    configurePhaseStandalone: builder.mutation<ApiAPIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
      config: ApiPhaseConfigureRequest 
    }>({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const response = await (await campaignsApiClient.configurePhaseStandalone(campaignId, phase, config))();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['CampaignPhases'],
    }),
    
    // Start phase using generated client with proper type safety
    startPhaseStandalone: builder.mutation<ApiAPIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await (await campaignsApiClient.startPhaseStandalone(campaignId, phase))();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        'CampaignPhases',
      ],
    }),
    
    // Get campaign progress using generated client with proper type safety
    getCampaignProgressStandalone: builder.query<ApiAPIResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await (await campaignsApiClient.getCampaignProgressStandalone(campaignId))();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignStatus', id: campaignId },
      ],
    }),
    
    // Get phase status using generated client with proper type safety
    getPhaseStatusStandalone: builder.query<ApiAPIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await (await campaignsApiClient.getPhaseStatusStandalone(campaignId, phase))();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, { campaignId, phase }) => [
        { type: 'CampaignPhases', id: `${campaignId}-${phase}` },
      ],
    }),
    
    // Get all campaigns using generated client - respects backend APIResponse wrapper
    getCampaignsStandalone: builder.query<APIResponse, void>({
      queryFn: async () => {
        try {
          const response = await campaignsApiClient.getCampaignsStandalone();
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success) {
            return { data: apiResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Failed to get campaigns' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: ['Campaign'],
    }),

    // Bulk enriched campaign data - respects backend APIResponse wrapper
    getBulkEnrichedCampaignData: builder.query<BulkEnrichedDataResponse, BulkEnrichedDataRequest>({
      queryFn: async (request) => {
        try {
          const response = await campaignsApiClient.getBulkEnrichedCampaignData(request);
          // Backend returns: { success: true, data: BulkEnrichedDataResponse, requestId: "..." }
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as BulkEnrichedDataResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Unknown error' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, { campaignIds }) => [
        'Campaign',
        ...(campaignIds || []).map(id => ({ type: 'Campaign' as const, id }))
      ],
    }),

    // Pattern offset calculation - respects backend APIResponse wrapper
    getPatternOffset: builder.query<PatternOffsetResponse, PatternOffsetRequest>({
      queryFn: async (request) => {
        try {
          const response = await campaignsApiClient.getPatternOffset(request);
          // Backend returns: { success: true, data: PatternOffsetResponse, requestId: "..." }
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as PatternOffsetResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Unknown error' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
    }),
  }),
});

export const {
  useCreateCampaignMutation,
  useConfigurePhaseStandaloneMutation,
  useStartPhaseStandaloneMutation,
  useGetCampaignProgressStandaloneQuery,
  useGetPhaseStatusStandaloneQuery,
  useGetCampaignsStandaloneQuery,
  useGetBulkEnrichedCampaignDataQuery,
  useGetPatternOffsetQuery,
} = campaignApi;
