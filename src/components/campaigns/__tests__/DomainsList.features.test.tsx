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
                // Domain that triggers Stuffing penalty (S)
                {
                  id: '22222222-2222-2222-2222-222222222222',
                  domain: 'stuffed.example',
                  dnsStatus: 'valid',
                  httpStatus: 'ok',
                  leadStatus: 'new',
                  features: {
                    richness: { score: 0.55, version: 2, diversity_norm: 0.3, prominence_norm: 0.42, enrichment_norm: 0.33, stuffing_penalty: 0.05 },
                    keywords: { unique_count: 3, hits_total: 12, top3: ['delta','epsilon','zeta'], signal_distribution: { delta: 6, epsilon: 3 } },
                    microcrawl: { gain_ratio: 0.10 },
                  },
                },
                // Domain that triggers high repetition (R)
                {
                  id: '33333333-3333-3333-3333-333333333333',
                  domain: 'repeat.example',
                  dnsStatus: 'valid',
                  httpStatus: 'ok',
                  leadStatus: 'new',
                  features: {
                    richness: { score: 0.60, version: 2, diversity_norm: 0.25, prominence_norm: 0.48, enrichment_norm: 0.40, repetition_index: 0.45 },
                    keywords: { unique_count: 4, hits_total: 14, top3: ['theta','iota','kappa'], signal_distribution: { theta: 5, iota: 4 } },
                    microcrawl: { gain_ratio: 0.18 },
                  },
                },
                // Domain that triggers high anchor share (A)
                {
                  id: '44444444-4444-4444-4444-444444444444',
                  domain: 'anchor.example',
                  dnsStatus: 'valid',
                  httpStatus: 'ok',
                  leadStatus: 'new',
                  features: {
                    richness: { score: 0.58, version: 2, diversity_norm: 0.31, prominence_norm: 0.46, enrichment_norm: 0.37, anchor_share: 0.55 },
                    keywords: { unique_count: 6, hits_total: 16, top3: ['lambda','mu','nu'], signal_distribution: { lambda: 5, mu: 4 } },
                    microcrawl: { gain_ratio: 0.22 },
                  },
                },
              ],
              total: 4,
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
  
  test('renders warnings column and all penalty indicators (S,R,A)', async () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <DomainsList campaignId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" />
      </Provider>
    );
    // Wait for table rows
    const rows = await screen.findAllByTestId('campaign-domains-row');
    expect(rows.length).toBeGreaterThanOrEqual(4);
    // Ensure warnings column exists
    expect(screen.getByTestId('campaign-domains-col-warnings')).toBeInTheDocument();
    // Assert each penalty indicator appears at least once
    expect(await screen.findByTestId('campaign-domains-warning-stuff')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-domains-warning-rep')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-domains-warning-anc')).toBeInTheDocument();
  });
});
