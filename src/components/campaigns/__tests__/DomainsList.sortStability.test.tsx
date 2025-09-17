import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DomainsList } from '../../campaigns/DomainsList';

jest.mock('@/store/api/campaignApi', () => ({ useGetCampaignEnrichedQuery: () => ({ data: undefined }) }));
jest.mock('@/store/api/scoringApi', () => ({ useListScoringProfilesQuery: () => ({ data: { items: [] } }) }));
jest.mock('@/hooks/useCampaignSSE', () => ({ useCampaignSSE: () => {} }));

const items = [
  { domain: 'equal1.com', features: { richness: { score: 0.5 }, microcrawl: { gain_ratio: 0.2 }, keywords: { unique_count: 3 } } },
  { domain: 'equal2.com', features: { richness: { score: 0.5 }, microcrawl: { gain_ratio: 0.2 }, keywords: { unique_count: 4 } } },
  { domain: 'missing.com', features: { microcrawl: { gain_ratio: 0.1 }, keywords: { unique_count: 2 } } },
  { domain: 'high.com', features: { richness: { score: 0.9 }, microcrawl: { gain_ratio: 0.3 }, keywords: { unique_count: 10 } } },
];

jest.mock('@/lib/hooks/usePaginatedDomains', () => ({
  usePaginatedDomains: () => ([{
    items,
    page: 1, pageCount: 1, total: items.length, loading: false, hasNext: false, hasPrev: false, infinite: false, shouldVirtualize: false, cursorMode: false
  }, { first: jest.fn(), refresh: jest.fn(), setPageSize: jest.fn(), prev: jest.fn(), next: jest.fn(), last: jest.fn(), toggleInfinite: jest.fn() }])
}));

describe('DomainsList sorting stability & null handling', () => {
  test('default richness desc order places high first, missing last', () => {
    render(<DomainsList campaignId="c2" />);
    const domains = screen.getAllByTestId('campaign-domains-row').map(r=>r.querySelector('[data-testid="campaign-domains-cell-domain"]')!.textContent);
    expect(domains[0]).toBe('high.com');
    expect(domains[domains.length-1]).toBe('missing.com');
  });

  test('equal richness order stable when toggling asc then desc', () => {
    render(<DomainsList campaignId="c2" />);
    const richnessBtn = screen.getByTestId('campaign-domains-sort-richness');
    // Toggle to asc
    fireEvent.click(richnessBtn);
    let domainsAsc = screen.getAllByTestId('campaign-domains-row').map(r=>r.querySelector('[data-testid="campaign-domains-cell-domain"]')!.textContent);
    // Ascending: missing (no score) should be first due to -Infinity, then equal1/equal2 (stable), then high
    expect(domainsAsc[0]).toBe('missing.com');
    const eqPairAsc = domainsAsc.slice(1,3);
    expect(eqPairAsc).toEqual(['equal1.com','equal2.com']);
    // Toggle back to desc
    fireEvent.click(richnessBtn);
    const domainsDesc = screen.getAllByTestId('campaign-domains-row').map(r=>r.querySelector('[data-testid="campaign-domains-cell-domain"]')!.textContent);
    // Desc: high first, equal1 before equal2 (stable by original index) still, missing last
    const eqPairDesc = domainsDesc.slice(1,3);
    expect(domainsDesc[0]).toBe('high.com');
    expect(eqPairDesc).toEqual(['equal1.com','equal2.com']);
    expect(domainsDesc[domainsDesc.length-1]).toBe('missing.com');
  });
});
