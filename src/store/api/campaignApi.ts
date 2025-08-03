import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { 
  CreateLeadGenerationCampaignRequest,
  PhaseConfigureRequest,
  APIResponse,
  LeadGenerationCampaignResponse,
  BulkEnrichedDataRequest,
  BulkEnrichedDataResponse,
  PatternOffsetRequest,
  PatternOffsetResponse
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
    // Create new campaign using generated client - respects backend APIResponse wrapper
    createCampaign: builder.mutation<LeadGenerationCampaignResponse, CreateLeadGenerationCampaignRequest>({
      queryFn: async (campaign) => {
        try {
          const response = await campaignsApiClient.createLeadGenerationCampaign(campaign);
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data as LeadGenerationCampaignResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Campaign creation failed' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['Campaign'],
    }),
    
    // Configure phase using generated client - respects backend APIResponse wrapper
    configurePhaseStandalone: builder.mutation<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
      config: PhaseConfigureRequest 
    }>({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const response = await campaignsApiClient.configurePhaseStandalone(campaignId, phase, config);
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success) {
            return { data: apiResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Phase configuration failed' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignPhases', id: campaignId },
      ],
    }),
    
        // Start phase using generated client - respects backend APIResponse wrapper
    startPhaseStandalone: builder.mutation<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApiClient.startPhaseStandalone(campaignId, phase);
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success) {
            return { data: apiResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Phase start failed' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        'CampaignPhases',
      ],
    }),
    
    // Get campaign progress using generated client - respects backend APIResponse wrapper
    getCampaignProgressStandalone: builder.query<APIResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApiClient.getCampaignProgressStandalone(campaignId);
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success) {
            return { data: apiResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Failed to get campaign progress' } };
          }
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignStatus', id: campaignId },
      ],
    }),
    
    // Get phase status using generated client - respects backend APIResponse wrapper
    getPhaseStatusStandalone: builder.query<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApiClient.getPhaseStatusStandalone(campaignId, phase);
          const apiResponse = response.data as APIResponse;
          if (apiResponse.success) {
            return { data: apiResponse };
          } else {
            return { error: { status: 500, data: apiResponse.error?.message || 'Failed to get phase status' } };
          }
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
