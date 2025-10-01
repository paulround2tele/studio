import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ScoringApi } from '@/lib/api-client/apis/scoring-api';
import { apiConfiguration } from '@/lib/api/config';
import { toRtkError } from '@/lib/utils/toRtkError';

// Instantiate generated client
const scoringClient = new ScoringApi(apiConfiguration);

export const scoringApi = createApi({
  reducerPath: 'scoringApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['ScoringProfiles', 'CampaignScoring'],
  endpoints: (builder) => ({
    listScoringProfiles: builder.query<any, void>({
      queryFn: async () => {
        try {
          const resp = await (scoringClient as any).scoringProfilesList();
          const data = (resp?.data ?? resp) || { items: [] };
          return { data: data || { items: [] } };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      providesTags: ['ScoringProfiles']
    }),
    getScoringProfile: builder.query<any, string>({
      queryFn: async (profileId) => {
        try {
          const resp = await (scoringClient as any).scoringProfilesGet(profileId);
          const data = resp?.data ?? resp;
          if (!data) return { error: 'Profile not found' as any };
          return { data };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      providesTags: (r, e, id) => [{ type: 'ScoringProfiles', id }]
    }),
    createScoringProfile: builder.mutation<any, any>({
      queryFn: async (payload) => {
        try {
          const resp = await (scoringClient as any).scoringProfilesCreate(payload);
          const data = resp?.data ?? resp;
          if (!data) return { error: 'Create failed' as any };
          return { data };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      invalidatesTags: ['ScoringProfiles']
    }),
    updateScoringProfile: builder.mutation<any, { profileId: string; body: any }>({
      queryFn: async ({ profileId, body }) => {
        try {
          const resp = await (scoringClient as any).scoringProfilesUpdate(profileId, body);
          const data = resp?.data ?? resp;
          if (!data) return { error: 'Update failed' as any };
          return { data };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      invalidatesTags: (r, e, { profileId }) => [{ type: 'ScoringProfiles', id: profileId }]
    }),
    deleteScoringProfile: builder.mutation<any, string>({
      queryFn: async (profileId) => {
        try {
          await (scoringClient as any).scoringProfilesDelete(profileId);
          return { data: { ok: true } };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      invalidatesTags: (r, e, id) => [{ type: 'ScoringProfiles', id }]
    }),
    associateScoringProfile: builder.mutation<any, { campaignId: string; profileId: string }>({
      queryFn: async ({ campaignId, profileId }) => {
        try {
          const resp = await (scoringClient as any).campaignsScoringProfileAssociate(campaignId, { profileId });
          const data = (resp?.data ?? resp) || { profileId };
          return { data };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
      },
      invalidatesTags: (r, e, { campaignId }) => [
        { type: 'CampaignScoring', id: campaignId },
        'ScoringProfiles'
      ]
    }),
    rescoreCampaign: builder.mutation<any, { campaignId: string }>({
      queryFn: async ({ campaignId }) => {
        try {
          const resp = await (scoringClient as any).campaignsRescore(campaignId);
          const data = (resp?.data ?? resp) || { status: 'scheduled' };
          return { data };
        } catch (e: any) { return { error: toRtkError(e) as any }; }
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
