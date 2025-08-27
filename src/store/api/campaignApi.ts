/**
 * Professional Campaign API - RTK Query wrapper around generated OpenAPI client
 * Unlike the previous amateur "decommissioning", this provides proper RTK Query hooks
 * while using the generated API client underneath like a professional
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi, Configuration } from '@/lib/api-client';
import type {
  ServicesCreateLeadGenerationCampaignRequest,
} from '@/lib/api-client';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type {
  CampaignsList200Response,
  SuccessEnvelope,
} from '@/lib/api-client/models';

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
      SuccessEnvelope,
      ServicesCreateLeadGenerationCampaignRequest
    >({
      queryFn: async (request) => {
        try {
          // New generated method name
          const response = await campaignsApi.campaignsCreate(request as any);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      invalidatesTags: ['Campaign', 'CampaignList'],
    }),

    // Campaign listing
    getCampaignsStandalone: builder.query<CampaignsList200Response, void>({
      queryFn: async () => {
        try {
          // New generated method name
          const response = await campaignsApi.campaignsList();
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: ['CampaignList'],
    }),

    // Bulk enriched campaign data
    getBulkEnrichedCampaignData: builder.query<
      { campaigns: Record<string, any>; totalCount: number },
      { campaignIds: string[]; limit?: number; offset?: number }
    >({
      queryFn: async (request) => {
        try {
          // Endpoint not present in OpenAPI spec; call directly
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
          const res = await fetch(`${apiUrl}/campaigns/bulk/enriched-data`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err } as any;
          }
          const data = await res.json();
          // Expecting shape: { campaigns: { [id]: {...} }, totalCount: number }
          return { data } as any;
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: ['Campaign'],
    }),

    // Campaign progress tracking
    getCampaignProgressStandalone: builder.query<SuccessEnvelope, string>({
      queryFn: async (campaignId) => {
        try {
          // New generated method name
          const response = await campaignsApi.campaignsProgress(campaignId);
          return { data: response.data };
        } catch (error: any) {
          return { error: error.response?.data || error.message };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    // Phase management operations
    configurePhaseStandalone: builder.mutation<
      SuccessEnvelope,
      { campaignId: string; phase: string; config: PhaseConfigurationRequest }
    >({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const response = await campaignsApi.campaignsPhaseConfigure(
            campaignId,
            phase as any,
            config as any,
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
      SuccessEnvelope,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApi.campaignsPhaseStart(campaignId, phase as any);
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
      SuccessEnvelope,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const response = await campaignsApi.campaignsPhaseStatus(campaignId, phase as any);
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
    getPatternOffset: builder.query<
      { success?: boolean; data?: { currentOffset?: number } },
      { patternType: string; variableLength: number; characterSet: string; constantString: string; tld: string }
    >({
      queryFn: async (request) => {
        try {
          // Endpoint not present in OpenAPI spec; call directly
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
          const res = await fetch(`${apiUrl}/campaigns/domain-generation/pattern-offset`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            return { error: err } as any;
          }
          const data = await res.json();
          return { data } as any;
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
  useConfigurePhaseStandaloneMutation,
  useStartPhaseStandaloneMutation,
  useGetPhaseStatusStandaloneQuery,
  useGetPatternOffsetQuery,
} = campaignApi;

// Export the reducer for the store configuration
export default campaignApi.reducer;
