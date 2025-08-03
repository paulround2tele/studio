import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { 
  CreateLeadGenerationCampaignRequest,
  PhaseConfigureRequest,
  APIResponse,
  CreateLeadGenerationCampaign200Response
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
    // Create new campaign using generated client
    createCampaign: builder.mutation<CreateLeadGenerationCampaign200Response, CreateLeadGenerationCampaignRequest>({
      queryFn: async (campaign) => {
        try {
          const response = await campaignsApiClient.createLeadGenerationCampaign(campaign);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: ['Campaign'],
    }),
    
    // Configure phase using generated client
    configurePhaseStandalone: builder.mutation<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
      config: PhaseConfigureRequest 
    }>({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const response = await campaignsApiClient.configurePhaseStandalone(campaignId, phase, config);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignPhases', id: campaignId },
      ],
    }),
    
    // Start phase using generated client
    startPhaseStandalone: builder.mutation<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApiClient.startPhaseStandalone(campaignId, phase);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignPhases', id: campaignId },
        { type: 'CampaignStatus', id: campaignId },
      ],
    }),
    
    // Update campaign using generated client (placeholder - needs proper backend endpoint)
    updateCampaign: builder.mutation<APIResponse, { 
      campaignId: string; 
      updates: any; 
    }>({
      queryFn: async ({ campaignId, updates }) => {
        try {
          // This is a placeholder since there's no updateCampaign endpoint in the generated API
          // TODO: Add proper update endpoint to backend API
          console.warn('updateCampaign not implemented in backend API yet');
          return { data: { success: true, message: 'Update not implemented' } };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),
    
    // Get campaign progress using generated client
    getCampaignProgressStandalone: builder.query<APIResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApiClient.getCampaignProgressStandalone(campaignId);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignStatus', id: campaignId },
      ],
    }),
    
    // Get phase status using generated client
    getPhaseStatusStandalone: builder.query<APIResponse, { 
      campaignId: string; 
      phase: CampaignCurrentPhaseEnum; 
    }>({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApiClient.getPhaseStatusStandalone(campaignId, phase);
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: (result, error, { campaignId, phase }) => [
        { type: 'CampaignPhases', id: `${campaignId}-${phase}` },
      ],
    }),
    
    // Get all campaigns using generated client
    getCampaignsStandalone: builder.query<APIResponse, void>({
      queryFn: async () => {
        try {
          const response = await campaignsApiClient.getCampaignsStandalone();
          return { data: response.data };
        } catch (error: any) {
          return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
        }
      },
      providesTags: ['Campaign'],
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
} = campaignApi;
