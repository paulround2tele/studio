/**
 * Professional Campaign API - RTK Query wrapper around generated OpenAPI client
 * Unlike the previous amateur "decommissioning", this provides proper RTK Query hooks
 * while using the generated API client underneath like a professional
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi, Configuration } from '@/lib/api-client';
import type {
  ServicesCreateLeadGenerationCampaignRequest,
  ApiBulkEnrichedDataRequest,
  ApiPhaseConfigureRequest,
  ApiPatternOffsetRequest,
  ApiCampaignsListAPIResponse,
  ApiAPIResponse,
  ApiPatternOffsetResponse
} from '@/lib/api-client';

// Professional API configuration
const config = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
});

const campaignsApi = new CampaignsApi(config);

export const campaignApi = createApi({
  reducerPath: 'campaignApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/', // Base URL handled by the generated client
  }),
  tagTypes: ['Campaign', 'CampaignList', 'CampaignProgress', 'CampaignDomains'],
  endpoints: (builder) => ({
    // Campaign CRUD operations
    createCampaign: builder.mutation<
      ApiAPIResponse,
      ServicesCreateLeadGenerationCampaignRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await campaignsApi.createLeadGenerationCampaign(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Campaign', 'CampaignList'],
    }),

    // Campaign listing
    getCampaignsStandalone: builder.query<ApiCampaignsListAPIResponse, void>({
      queryFn: async () => {
        try {
          const response = await campaignsApi.getCampaignsStandalone();
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: ['CampaignList'],
    }),

    // Bulk enriched campaign data
    getBulkEnrichedCampaignData: builder.query<
      ApiAPIResponse,
      ApiBulkEnrichedDataRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await campaignsApi.getBulkEnrichedCampaignData(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: ['Campaign'],
    }),

    // Campaign progress tracking
    getCampaignProgressStandalone: builder.query<ApiAPIResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.getCampaignProgressStandalone(campaignId);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    // Campaign domains status
    getCampaignDomainsStatus: builder.query<ApiAPIResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.getCampaignDomainsStatus(campaignId);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignDomains', id: campaignId }
      ],
    }),

    // Phase management operations
    configurePhaseStandalone: builder.mutation<
      ApiAPIResponse,
      { campaignId: string; phase: string; config: ApiPhaseConfigureRequest }
    >({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const response = await campaignsApi.configurePhaseStandalone(
            campaignId, 
            phase as any, // Type assertion for enum
            config
          );
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    startPhaseStandalone: builder.mutation<
      ApiAPIResponse,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApi.startPhaseStandalone(
            campaignId,
            phase as any // Type assertion for enum
          );
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    getPhaseStatusStandalone: builder.query<
      ApiAPIResponse,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApi.getPhaseStatusStandalone(
            campaignId,
            phase as any // Type assertion for enum
          );
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    // Pattern offset utility
    getPatternOffset: builder.query<ApiPatternOffsetResponse, ApiPatternOffsetRequest>({
      queryFn: async (request) => {
        try {
          const response = await campaignsApi.getPatternOffset(request);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
    }),
  }),
});

// Export hooks for components to use like civilized developers
export const {
  useCreateCampaignMutation,
  useGetCampaignsStandaloneQuery,
  useGetBulkEnrichedCampaignDataQuery,
  useGetCampaignProgressStandaloneQuery,
  useGetCampaignDomainsStatusQuery,
  useConfigurePhaseStandaloneMutation,
  useStartPhaseStandaloneMutation,
  useGetPhaseStatusStandaloneQuery,
  useGetPatternOffsetQuery,
} = campaignApi;

// Export the reducer for the store configuration
export default campaignApi.reducer;
