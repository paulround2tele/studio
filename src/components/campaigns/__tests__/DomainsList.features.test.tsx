import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { campaignApi } from '@/store/api/campaignApi';
import DomainsList from '../DomainsList';

// Minimal store with RTK Query reducer
function makeStore() {
  return configureStore({
    reducer: { [campaignApi.reducerPath]: campaignApi.reducer },
    middleware: (gDM) => gDM().concat(campaignApi.middleware),
  });
}

// Mock generated API client method used by campaignApi endpoint
jest.mock('@/lib/api-client/apis/campaigns-api', () => {
  const actual = jest.requireActual('@/lib/api-client/apis/campaigns-api');
  return {
    ...actual,
    CampaignsApi: class MockCampaignsApi {
      async campaignsEnrichedGet(campaignId: string) {
        return { data: { data: { campaign: { id: campaignId } }, success: true } } as any;
      }
      async campaignsDomainsList(campaignId: string, limit?: number, offset?: number) {
        return {
          data: {
            data: {
              campaignId,
              items: [
                {
                  id: '11111111-1111-1111-1111-111111111111',
                  domain: 'example.com',
                  dnsStatus: 'valid',
                  httpStatus: 'ok',
                  leadStatus: 'new',
                  features: {
                    richness: { score: 0.82, version: 2, diversity_norm: 0.4, prominence_norm: 0.5, enrichment_norm: 0.6 },
                    keywords: { unique_count: 5, hits_total: 9, top3: ['alpha','beta','gamma'], signal_distribution: { alpha: 3, beta: 2 } },
                    microcrawl: { gain_ratio: 0.27 },
                  },
                },
              ],
              total: 1,
            },
            success: true,
          },
        } as any;
      }
    },
  };
});

describe('DomainsList features integration', () => {
  it('renders richness badge and top keywords from features', async () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <DomainsList campaignId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" />
      </Provider>
    );
    // Domain row
    expect(await screen.findByTestId('campaign-domains-row')).toBeInTheDocument();
    // Richness badge displays score
    const badge = await screen.findByTestId('richness-badge');
    expect(badge.textContent).toMatch(/0\.82/);
    // Top keywords list displays first keyword
    const kwCell = await screen.findByTestId('campaign-domains-cell-topkeywords');
    expect(kwCell.textContent).toMatch(/alpha/);
  });
});
