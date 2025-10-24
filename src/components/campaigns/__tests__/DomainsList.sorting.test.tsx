import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DomainsList } from '../../campaigns/DomainsList';

// Mock hooks used for data fetching
jest.mock('@/store/api/campaignApi', () => ({
  useGetCampaignEnrichedQuery: () => ({ data: undefined })
}));
jest.mock('@/store/api/scoringApi', () => ({
  useListScoringProfilesQuery: () => ({ data: { items: [] } })
}));
jest.mock('@/hooks/useCampaignSSE', () => ({ useCampaignSSE: () => {} }));

// Mock pagination hook to supply static items
jest.mock('@/lib/hooks/usePaginatedDomains', () => ({
  usePaginatedDomains: (_cid: string, _opts: unknown) => ([{
    items: [
      { domain: 'a.com', features: { richness: { score: 0.4 }, microcrawl: { gain_ratio: 0.1 }, keywords: { unique_count: 2 } } },
      { domain: 'b.com', features: { richness: { score: 0.9 }, microcrawl: { gain_ratio: 0.3 }, keywords: { unique_count: 5 } } },
      { domain: 'c.com', features: { richness: { score: 0.7 }, microcrawl: { gain_ratio: 0.2 }, keywords: { unique_count: 4 } } }
    ],
    page: 1, pageCount: 1, total: 3, loading: false, hasNext: false, hasPrev: false, infinite: false, shouldVirtualize: false, cursorMode: false
  }, {
    first: jest.fn(), refresh: jest.fn(), setPageSize: jest.fn(), prev: jest.fn(), next: jest.fn(), last: jest.fn(), toggleInfinite: jest.fn()
  }])
}));

describe('DomainsList sorting', () => {
  test('sorts by richness descending default then toggles', () => {
    render(<DomainsList campaignId="x" />);
    const rows = () => screen.getAllByTestId('campaign-domains-row');
    // Default: richness desc -> domains order b.com (0.9), c.com (0.7), a.com (0.4)
    expect(rows()[0]).toHaveTextContent('b.com');
    expect(rows()[1]).toHaveTextContent('c.com');
    expect(rows()[2]).toHaveTextContent('a.com');
    const richnessBtn = screen.getByTestId('campaign-domains-sort-richness');
    fireEvent.click(richnessBtn); // toggle to asc
    expect(rows()[0]).toHaveTextContent('a.com');
    expect(rows()[2]).toHaveTextContent('b.com');
  });

  test('switch to microcrawl sort', () => {
    render(<DomainsList campaignId="y" />);
    const microBtn = screen.getByTestId('campaign-domains-sort-microcrawl');
    fireEvent.click(microBtn); // first click sets key, default desc
    const rows = screen.getAllByTestId('campaign-domains-row');
    // microcrawl desc: 0.3 b.com, 0.2 c.com, 0.1 a.com
    expect(rows[0]).toHaveTextContent('b.com');
    expect(rows[1]).toHaveTextContent('c.com');
    expect(rows[2]).toHaveTextContent('a.com');
  });

  test('keywords sort asc toggle works', () => {
    render(<DomainsList campaignId="z" />);
    const kwBtn = screen.getByTestId('campaign-domains-sort-keywords');
    fireEvent.click(kwBtn); // first click sets key desc (5,4,2)
    let rows = screen.getAllByTestId('campaign-domains-row');
    expect(rows[0]).toHaveTextContent('b.com');
    expect(rows[2]).toHaveTextContent('a.com');
    fireEvent.click(kwBtn); // toggle to asc (2,4,5)
    rows = screen.getAllByTestId('campaign-domains-row');
    expect(rows[0]).toHaveTextContent('a.com');
    expect(rows[2]).toHaveTextContent('b.com');
  });
});
