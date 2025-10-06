import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ScoringApi } from '@/lib/api-client/apis/scoring-api';
import { apiConfiguration } from '@/lib/api/config';
import { toRtkError } from '@/lib/utils/toRtkError';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';
import type { ScoringProfile } from '@/lib/api-client/models/scoring-profile';
import type { CreateScoringProfileRequest } from '@/lib/api-client/models/create-scoring-profile-request';
import type { AssociateScoringProfileRequest } from '@/lib/api-client/models/associate-scoring-profile-request';

interface ScoringProfilesListResponse { items: ScoringProfile[] }
interface AssociateResult { profileId: string }
interface RescoreCampaignStatus { status: string }

// Instantiate generated client
const scoringClient = new ScoringApi(apiConfiguration);

export const scoringApi = createApi({
  reducerPath: 'scoringApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['ScoringProfiles', 'CampaignScoring'],
  endpoints: (builder) => ({
    listScoringProfiles: builder.query<ScoringProfilesListResponse, void>({
      queryFn: async () => {
        try {
          const resp = await scoringClient.scoringProfilesList();
          const data = unwrapApiResponse<ScoringProfilesListResponse>(resp) || { items: [] };
          return { data: data || { items: [] } };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      providesTags: ['ScoringProfiles']
    }),
    getScoringProfile: builder.query<ScoringProfile, string>({
      queryFn: async (profileId) => {
        try {
          const resp = await scoringClient.scoringProfilesGet(profileId);
          const data = unwrapApiResponse<ScoringProfile>(resp);
          if (!data) return { error: { status: 404, data: { message: 'Profile not found' } } };
          return { data };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      providesTags: (r, e, id) => [{ type: 'ScoringProfiles', id }]
    }),
    createScoringProfile: builder.mutation<ScoringProfile, CreateScoringProfileRequest>({
      queryFn: async (payload: CreateScoringProfileRequest) => {
        try {
          const resp = await scoringClient.scoringProfilesCreate(payload);
          const data = unwrapApiResponse<ScoringProfile>(resp);
          if (!data) return { error: { status: 500, data: { message: 'Create failed' } } };
          return { data };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      invalidatesTags: ['ScoringProfiles']
    }),
    updateScoringProfile: builder.mutation<ScoringProfile, { profileId: string; body: Partial<CreateScoringProfileRequest> }>({
      queryFn: async ({ profileId, body }) => {
        try {
          const resp = await scoringClient.scoringProfilesUpdate(profileId, body as CreateScoringProfileRequest);
          const data = unwrapApiResponse<ScoringProfile>(resp);
          if (!data) return { error: { status: 500, data: { message: 'Update failed' } } };
          return { data };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      invalidatesTags: (r, e, { profileId }) => [{ type: 'ScoringProfiles', id: profileId }]
    }),
    deleteScoringProfile: builder.mutation<{ ok: true }, string>({
      queryFn: async (profileId) => {
        try {
          await scoringClient.scoringProfilesDelete(profileId);
          return { data: { ok: true } };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      invalidatesTags: (r, e, id) => [{ type: 'ScoringProfiles', id }]
    }),
    associateScoringProfile: builder.mutation<AssociateResult, { campaignId: string; profileId: string }>({
      queryFn: async ({ campaignId, profileId }) => {
        try {
          const resp = await scoringClient.campaignsScoringProfileAssociate(campaignId, { profileId } as AssociateScoringProfileRequest);
          const data = unwrapApiResponse<AssociateResult>(resp) || { profileId };
          return { data };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      invalidatesTags: (r, e, { campaignId }) => [
        { type: 'CampaignScoring', id: campaignId },
        'ScoringProfiles'
      ]
    }),
    rescoreCampaign: builder.mutation<RescoreCampaignStatus, { campaignId: string }>({
      queryFn: async ({ campaignId }) => {
        try {
          const resp = await scoringClient.campaignsRescore(campaignId);
          const data = unwrapApiResponse<RescoreCampaignStatus>(resp) || { status: 'scheduled' };
          return { data };
        } catch (e) { const norm = toRtkError(e); return { error: { status: norm.status ?? 500, data: norm } }; }
      },
      invalidatesTags: (r, e, { campaignId }) => [
        { type: 'CampaignScoring', id: campaignId }
      ]
    })
  })
});

export const {
  useListScoringProfilesQuery,
  useGetScoringProfileQuery,
  useCreateScoringProfileMutation,
  useUpdateScoringProfileMutation,
  useDeleteScoringProfileMutation,
  useAssociateScoringProfileMutation,
  useRescoreCampaignMutation,
} = scoringApi;
