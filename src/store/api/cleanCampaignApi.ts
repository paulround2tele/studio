/**
 * Campaign API - Using migrated campaign endpoints  
 * Demonstrates clean, direct response format (no SuccessEnvelope)
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Direct import of new response types
import type { components } from '@/lib/api-client/types';

type CampaignResponse = components['schemas']['CampaignResponse'];
type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];

export const campaignApi = createApi({
  reducerPath: 'campaignApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2',
  }),
  tagTypes: ['Campaign'],
  endpoints: (builder) => ({
    // List campaigns - returns CampaignResponse[] directly (no envelope)
    listCampaigns: builder.query<CampaignResponse[], void>({
      query: () => '/campaigns',
      providesTags: ['Campaign'],
      // No transformResponse needed - direct response format!
    }),
    
    // Get campaign by ID - returns CampaignResponse directly (no envelope)  
    getCampaign: builder.query<CampaignResponse, string>({
      query: (campaignId) => `/campaigns/${campaignId}`,
      providesTags: (result, error, campaignId) => [{ type: 'Campaign', id: campaignId }],
      // No transformResponse needed - direct response format!
    }),
    
    // Create campaign - returns CampaignResponse directly (no envelope)
    createCampaign: builder.mutation<CampaignResponse, CreateCampaignRequest>({
      query: (body) => ({
        url: '/campaigns',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Campaign'],
      // No transformResponse needed - direct response format!
    }),
  }),
});

export const {
  useListCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
} = campaignApi;

// Note: Compare this to the old pattern which required:
// - extractResponseData() calls everywhere
// - Manual unwrapping of { success, data } envelopes  
// - Type casting with 'as any'
// - Complex error handling for envelope structure
//
// Now we have clean, direct types that match the actual API responses!