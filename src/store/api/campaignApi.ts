/**
 * Professional Campaign API - RTK Query wrapper around generated OpenAPI client
 * Unlike the previous amateur "decommissioning", this provides proper RTK Query hooks
 * while using the generated API client underneath like a professional
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client';
import {
  CampaignsPhaseConfigurePhaseEnum,
  CampaignsPhaseStartPhaseEnum,
  CampaignsPhaseStatusPhaseEnum,
} from '@/lib/api-client/apis/campaigns-api';
import { apiConfiguration } from '@/lib/api/config';
import type {
  ServicesCreateLeadGenerationCampaignRequest,
} from '@/lib/api-client';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
import type { CampaignProgressResponse } from '@/lib/api-client/models/campaign-progress-response';
import type { PhaseStatusResponse } from '@/lib/api-client/models/phase-status-response';
import type { CampaignDomainsListResponse } from '@/lib/api-client/models/campaign-domains-list-response';
import type { PatternOffsetRequest } from '@/lib/api-client/models/pattern-offset-request';
import type { PatternOffsetResponse } from '@/lib/api-client/models/pattern-offset-response';
import type { EnrichedCampaignResponse } from '@/lib/api-client/models/enriched-campaign-response';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Centralized API configuration targeting /api/v2
const campaignsApi = new CampaignsApi(apiConfiguration);

export const campaignApi = createApi({
  reducerPath: 'campaignApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/', // Base URL handled by the generated client
  }),
  tagTypes: ['Campaign', 'CampaignList', 'CampaignProgress', 'CampaignDomains', 'CampaignPhase'],
  endpoints: (builder) => ({
    // Campaign CRUD operations
  createCampaign: builder.mutation<CampaignResponse, ServicesCreateLeadGenerationCampaignRequest>({
      queryFn: async (request) => {
        try {
          const response = await campaignsApi.campaignsCreate(request);
          const data = extractResponseData<CampaignResponse>(response);
          if (!data) return { error: 'Empty campaign response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      invalidatesTags: ['Campaign', 'CampaignList'],
    }),

  // Enriched campaign detail (read-optimized)
  getCampaignEnriched: builder.query<EnrichedCampaignResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsEnrichedGet(campaignId);
          const data = extractResponseData<EnrichedCampaignResponse>(response);
          if (!data) return { error: 'Empty enriched campaign response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId },
      ],
    }),

    // Campaign listing
    getCampaignsStandalone: builder.query<CampaignResponse[], void>({
      queryFn: async () => {
        try {
          const response = await campaignsApi.campaignsList();
          const data = extractResponseData<CampaignResponse[]>(response) || [];
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      providesTags: ['CampaignList'],
    }),

    // Domains list for a campaign (replaces legacy bulk enriched-data usage for domains)
    getCampaignDomains: builder.query<
      CampaignDomainsListResponse,
      { campaignId: string; limit?: number; offset?: number }
    >({
      queryFn: async ({ campaignId, limit, offset }) => {
        try {
          const response = await campaignsApi.campaignsDomainsList(campaignId, limit, offset);
          const data = extractResponseData<CampaignDomainsListResponse>(response);
          if (!data) return { error: 'Empty domains list response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'CampaignDomains', id: campaignId },
      ],
    }),

    // Campaign progress tracking
  getCampaignProgressStandalone: builder.query<CampaignProgressResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsProgress(campaignId);
          const data = extractResponseData<CampaignProgressResponse>(response);
          if (!data) return { error: 'Empty progress response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'CampaignProgress', id: campaignId }
      ],
    }),

    // Phase management operations
  configurePhaseStandalone: builder.mutation<
      PhaseStatusResponse,
      { campaignId: string; phase: string; config: PhaseConfigurationRequest }
    >({
      queryFn: async ({ campaignId, phase, config }) => {
        try {
          const phaseEnum: CampaignsPhaseConfigurePhaseEnum = (phase as CampaignsPhaseConfigurePhaseEnum);
          const response = await campaignsApi.campaignsPhaseConfigure(campaignId, phaseEnum, config);
          const data = extractResponseData<PhaseStatusResponse>(response);
          if (!data) return { error: 'Empty phase configure response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      invalidatesTags: (result, error, { campaignId, phase }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId },
        // Invalidate phase status cache so UI reflects configured state immediately
        { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
      ],
    }),

  startPhaseStandalone: builder.mutation<
      PhaseStatusResponse,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const phaseEnum: CampaignsPhaseStartPhaseEnum = (phase as CampaignsPhaseStartPhaseEnum);
          const response = await campaignsApi.campaignsPhaseStart(campaignId, phaseEnum);
          const data = extractResponseData<PhaseStatusResponse>(response);
          if (!data) return { error: 'Empty phase start response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      invalidatesTags: (result, error, { campaignId, phase }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId },
        // Ensure domains list refreshes after discovery starts/completes
        { type: 'CampaignDomains', id: campaignId },
        // Invalidate specific phase status as well
        { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
      ],
    }),

  getPhaseStatusStandalone: builder.query<
      PhaseStatusResponse,
      { campaignId: string; phase: string }
    >({
      queryFn: async ({ campaignId, phase }) => {
        try {
          const phaseEnum: CampaignsPhaseStatusPhaseEnum = (phase as CampaignsPhaseStatusPhaseEnum);
          const response = await campaignsApi.campaignsPhaseStatus(campaignId, phaseEnum);
          const data = extractResponseData<PhaseStatusResponse>(response);
          if (!data) return { error: 'Empty phase status response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
      providesTags: (result, error, { campaignId, phase }) => [
        { type: 'CampaignProgress', id: campaignId },
        { type: 'CampaignPhase', id: `${campaignId}:${phase}` },
      ],
    }),

    // Pattern offset utility (spec-compliant)
    getPatternOffset: builder.query<
      PatternOffsetResponse,
      PatternOffsetRequest
    >({
      queryFn: async (request) => {
        try {
          const response = await campaignsApi.campaignsDomainGenerationPatternOffset(request);
          const data = extractResponseData<PatternOffsetResponse>(response);
          if (!data) return { error: 'Empty pattern offset response' as any };
          return { data };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
    }),
  }),
});

// Export hooks for components to use
export const {
  useCreateCampaignMutation,
  useGetCampaignsStandaloneQuery,
  useGetCampaignDomainsQuery,
  useGetCampaignProgressStandaloneQuery,
  useConfigurePhaseStandaloneMutation,
  useStartPhaseStandaloneMutation,
  useGetPhaseStatusStandaloneQuery,
  useGetPatternOffsetQuery,
  useGetCampaignEnrichedQuery,
} = campaignApi;

// Export the reducer for the store configuration
export default campaignApi.reducer;
