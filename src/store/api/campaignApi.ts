/**
 * Professional Campaign API - RTK Query wrapper around generated OpenAPI client
 * Unlike the previous amateur "decommissioning", this provides proper RTK Query hooks
 * while using the generated API client underneath like a professional
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import {
  CampaignsPhaseConfigurePhaseEnum,
  CampaignsPhaseStartPhaseEnum,
  CampaignsPhaseStatusPhaseEnum,
} from '@/lib/api-client/apis/campaigns-api';
import { apiConfiguration } from '@/lib/api/config';
import type { CreateCampaignRequest } from '@/lib/api-client/models/create-campaign-request';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
import type { CampaignProgressResponse } from '@/lib/api-client/models/campaign-progress-response';
import type { PhaseStatusResponse } from '@/lib/api-client/models/phase-status-response';
import type { PatternOffsetRequest } from '@/lib/api-client/models/pattern-offset-request';
import type { PatternOffsetResponse } from '@/lib/api-client/models/pattern-offset-response';
import type { EnrichedCampaignResponse } from '@/lib/api-client/models/enriched-campaign-response';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { CampaignDomainsListResponse } from '@/lib/api-client/models/campaign-domains-list-response';
import { toRtkError } from '@/lib/utils/toRtkError';

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
  createCampaign: builder.mutation<CampaignResponse, CreateCampaignRequest>({
      queryFn: async (request) => {
        try {
          const resp = await campaignsApi.campaignsCreate(request) as any;
          // Post-migration: direct CampaignResponse (OR axios response .data during transition)
          const data: CampaignResponse | undefined = resp?.data ?? resp;
          if (!data || !data.id) return { error: 'Empty campaign response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      invalidatesTags: ['Campaign', 'CampaignList'],
    }),

  // Enriched campaign detail (read-optimized)
  getCampaignEnriched: builder.query<EnrichedCampaignResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsEnrichedGet(campaignId);
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty enriched campaign response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const resp = await campaignsApi.campaignsList() as any;
          // Direct array (or axios response wrapper) after envelope removal
          const list: CampaignResponse[] = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
          return { data: list };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: ['CampaignList'],
    }),

    // Domains list for a campaign (replaces legacy bulk enriched-data usage for domains)
    getCampaignDomains: builder.query<CampaignDomainsListResponse, { campaignId: string; limit?: number; offset?: number }>({
      queryFn: async ({ campaignId, limit, offset }) => {
        try {
          const response = await campaignsApi.campaignsDomainsList(campaignId, limit, offset);
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty domains list response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty progress response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty phase configure response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty phase start response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty phase status response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
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
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty pattern offset response' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
    }),

    // Bulk export all domains for a campaign by traversing paginated results client-side.
    exportCampaignDomains: builder.mutation<string, string>({
      queryFn: async (campaignId) => {
        try {
          let all: DomainListItem[] = [];
          let offset = 0;
          const limit = 1000; // Large page size for efficiency
          let total = Infinity;
          // Safeguard to prevent infinite loops
          const MAX_PAGES = 500;
          let pages = 0;
          while (all.length < total && pages < MAX_PAGES) {
            const resp = await campaignsApi.campaignsDomainsList(campaignId, limit, offset);
            const payload = (resp as any)?.data ?? resp;
            if (!payload) break;
            const items = payload.items || [];
            total = payload.total || items.length;
            if (!items.length) break;
            all = all.concat(items);
            offset += items.length;
            pages += 1;
          }
          const text = all.map(d => d.domain).filter(Boolean).join('\n');
          return { data: text };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
    }),

    // Update campaign execution mode (full_sequence vs step_by_step) - now using typed extraction
    updateCampaignMode: builder.mutation<
      { mode: string },
      { campaignId: string; mode: 'full_sequence' | 'step_by_step' }
    >({
      queryFn: async ({ campaignId, mode }) => {
        try {
          const response = await (campaignsApi as any).campaignsModeUpdate(campaignId, { mode });
          const extracted = ((response as any)?.data ?? response) || { mode };
          return { data: { mode: (extracted as any).mode || mode } };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId },
      ],
    }),

    // Domain score breakdown (analysis insight) - lazy usage
    getCampaignDomainScoreBreakdown: builder.query<
      any,
      { campaignId: string; domain: string }
    >({
      queryFn: async ({ campaignId, domain }) => {
        try {
          // Generated method name inferred from path /campaigns/{id}/domains/score-breakdown?domain=
          // If spec uses different naming, this will need alignment.
          const fn: any = (campaignsApi as any).campaignsDomainScoreBreakdown;
          if (!fn) return { error: 'Domain score breakdown endpoint missing in client' as any };
          const response = await fn(campaignId, domain);
          const data = (response as any)?.data ?? response;
          if (!data) return { error: 'Empty score breakdown' as any };
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    // New UX Refactor endpoints (Phase A)
    getCampaignFunnel: builder.query<any, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsFunnelGet(campaignId);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignMetrics: builder.query<any, string>({
      queryFn: async (campaignId) => {
        try {
          const resp = await campaignsApi.campaignsMetricsGet(campaignId) as any;
          const data = resp?.data ?? resp; // Direct object after migration
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignClassifications: builder.query<any, { campaignId: string; limit?: number }>({
      queryFn: async ({ campaignId, limit }) => {
        try {
          const response = await campaignsApi.campaignsClassificationsGet(campaignId, limit);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignMomentum: builder.query<any, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsMomentumGet(campaignId);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignRecommendations: builder.query<any, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsRecommendationsGet(campaignId);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignStatus: builder.query<any, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsStatusGet(campaignId);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    duplicateCampaign: builder.mutation<any, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsDuplicatePost(campaignId);
          const data = (response as any)?.data ?? response;
          return { data };
        } catch (error: any) {
          return { error: toRtkError(error) as any };
        }
      },
      invalidatesTags: ['CampaignList'],
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
  useExportCampaignDomainsMutation,
  useUpdateCampaignModeMutation,
  useGetCampaignDomainScoreBreakdownQuery,
  // New UX Refactor hooks
  useGetCampaignFunnelQuery,
  useGetCampaignMetricsQuery,
  useGetCampaignClassificationsQuery,
  useGetCampaignMomentumQuery,
  useGetCampaignRecommendationsQuery,
  useGetCampaignStatusQuery,
  useDuplicateCampaignMutation,
} = campaignApi;

// Export the reducer for the store configuration
export default campaignApi.reducer;
