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
import type { CampaignMomentumResponse } from '@/lib/api-client/models/campaign-momentum-response';
import type { CampaignRecommendationsResponse } from '@/lib/api-client/models/campaign-recommendations-response';
import type { CampaignMetricsResponse } from '@/lib/api-client/models/campaign-metrics-response';
import type { CampaignClassificationsResponse } from '@/lib/api-client/models/campaign-classifications-response';
import type { CampaignFunnelResponse } from '@/lib/api-client/models/campaign-funnel-response';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models/domain-score-breakdown-response';
import type { CampaignsModeUpdateRequest } from '@/lib/api-client/models/campaigns-mode-update-request';

// Helper for axios/fetch hybrid responses (no any)
const unwrap = <T>(resp: { data?: T } | T): T | undefined => {
  if (resp && typeof resp === 'object' && 'data' in resp && (resp as { data?: T }).data !== undefined) {
    return (resp as { data?: T }).data;
  }
  return resp as T;
};

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
          const resp = await campaignsApi.campaignsCreate(request);
          const data = unwrap<CampaignResponse>(resp);
          if (!data || !data.id) {
            return { error: { status: 500, data: { message: 'Empty campaign response' } } };
          }
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      invalidatesTags: ['Campaign', 'CampaignList'],
    }),

  // Enriched campaign detail (read-optimized)
  getCampaignEnriched: builder.query<EnrichedCampaignResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsEnrichedGet(campaignId);
          const data = unwrap<EnrichedCampaignResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty enriched campaign response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const resp = await campaignsApi.campaignsList();
          const raw = unwrap<CampaignResponse[] | unknown>(resp);
          const list: CampaignResponse[] = Array.isArray(raw) ? raw as CampaignResponse[] : [];
          return { data: list };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: ['CampaignList'],
    }),

    // Domains list for a campaign (replaces legacy bulk enriched-data usage for domains)
    getCampaignDomains: builder.query<CampaignDomainsListResponse, { campaignId: string; limit?: number; offset?: number }>({
      queryFn: async ({ campaignId, limit, offset }) => {
        try {
          const response = await campaignsApi.campaignsDomainsList(campaignId, limit, offset);
          const data = unwrap<CampaignDomainsListResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty domains list response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const data = unwrap<CampaignProgressResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty progress response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const data = unwrap<PhaseStatusResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty phase configure response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const data = unwrap<PhaseStatusResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty phase start response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const data = unwrap<PhaseStatusResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty phase status response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
          const data = unwrap<PatternOffsetResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty pattern offset response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
            const payload = unwrap<CampaignDomainsListResponse>(resp);
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
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
    }),

    // Update campaign execution mode (full_sequence vs step_by_step) - now using typed extraction
    updateCampaignMode: builder.mutation<{ mode: CampaignsModeUpdateRequest['mode'] }, { campaignId: string; mode: CampaignsModeUpdateRequest['mode'] }>({
      queryFn: async ({ campaignId, mode }) => {
        try {
          const request: CampaignsModeUpdateRequest = { mode };
          const response = await campaignsApi.campaignsModeUpdate(campaignId, request);
          // Response likely shape: { data: { mode: CampaignModeEnum } } or 200 model wrapper
          const raw = (response as { data?: { mode?: CampaignsModeUpdateRequest['mode'] } }).data;
          return { data: { mode: raw?.mode ?? request.mode } };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
        { type: 'CampaignProgress', id: campaignId },
      ],
    }),

    // Domain score breakdown (analysis insight) - lazy usage
    getCampaignDomainScoreBreakdown: builder.query<DomainScoreBreakdownResponse, { campaignId: string; domain: string }>({
      queryFn: async ({ campaignId, domain }) => {
        try {
          const hasFn = (obj: unknown): obj is { campaignsDomainScoreBreakdown: (id: string, d: string) => Promise<{ data?: DomainScoreBreakdownResponse }> } =>
            typeof obj === 'object' && obj !== null && 'campaignsDomainScoreBreakdown' in obj && typeof (obj as { campaignsDomainScoreBreakdown?: unknown }).campaignsDomainScoreBreakdown === 'function';
          if (!hasFn(campaignsApi)) {
            return { error: { status: 500, data: { message: 'Domain score breakdown endpoint missing in client' } } };
          }
          const response = await campaignsApi.campaignsDomainScoreBreakdown(campaignId, domain);
          const data = unwrap<DomainScoreBreakdownResponse>(response);
            if (!data) return { error: { status: 500, data: { message: 'Empty score breakdown' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    // New UX Refactor endpoints (Phase A)
    getCampaignFunnel: builder.query<CampaignFunnelResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsFunnelGet(campaignId);
          const data = unwrap<CampaignFunnelResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty funnel response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignMetrics: builder.query<CampaignMetricsResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const resp = await campaignsApi.campaignsMetricsGet(campaignId);
          const data = unwrap<CampaignMetricsResponse>(resp);
          if (!data) return { error: { status: 500, data: { message: 'Empty metrics response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignClassifications: builder.query<CampaignClassificationsResponse, { campaignId: string; limit?: number }>({
      queryFn: async ({ campaignId, limit }) => {
        try {
          const response = await campaignsApi.campaignsClassificationsGet(campaignId, limit);
          const data = unwrap<CampaignClassificationsResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty classifications response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignMomentum: builder.query<CampaignMomentumResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsMomentumGet(campaignId);
          const data = unwrap<CampaignMomentumResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty momentum response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    getCampaignRecommendations: builder.query<CampaignRecommendationsResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsRecommendationsGet(campaignId);
          const data = unwrap<CampaignRecommendationsResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty recommendations response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

  // Status endpoint returns a CampaignResponse-like shape (spec may later add dedicated status model)
  getCampaignStatus: builder.query<CampaignResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsStatusGet(campaignId);
          const data = unwrap<CampaignResponse | unknown>(response) as CampaignResponse | undefined;
          if (!data) return { error: { status: 500, data: { message: 'Empty status response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
        }
      },
      providesTags: (result, error, campaignId) => [
        { type: 'Campaign', id: campaignId },
      ],
    }),

    duplicateCampaign: builder.mutation<CampaignResponse, string>({
      queryFn: async (campaignId) => {
        try {
          const response = await campaignsApi.campaignsDuplicatePost(campaignId);
          const data = unwrap<CampaignResponse>(response);
          if (!data) return { error: { status: 500, data: { message: 'Empty duplicate response' } } };
          return { data };
        } catch (error) {
          const norm = toRtkError(error);
          return { error: { status: norm.status ?? 500, data: norm } };
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
