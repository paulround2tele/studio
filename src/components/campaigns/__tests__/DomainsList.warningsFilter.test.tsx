import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DomainsList } from '../../campaigns/DomainsList';

jest.mock('@/store/api/campaignApi', () => ({ useGetCampaignEnrichedQuery: () => ({ data: undefined }) }));
jest.mock('@/store/api/scoringApi', () => ({ useListScoringProfilesQuery: () => ({ data: { items: [] } }) }));
jest.mock('@/hooks/useCampaignSSE', () => ({ useCampaignSSE: () => {} }));

const baseItems = [
  { domain: 'warn1.com', features: { richness: { score: 0.8, stuffing_penalty: 0.05 } } },
  { domain: 'clean.com', features: { richness: { score: 0.7 } } },
  { domain: 'warn2.com', features: { richness: { score: 0.6, repetition_index: 0.5 } } },
];

jest.mock('@/lib/hooks/usePaginatedDomains', () => ({
  usePaginatedDomains: () => ([{
    items: baseItems,
    page: 1, pageCount: 1, total: baseItems.length, loading: false, hasNext: false, hasPrev: false, infinite: false, shouldVirtualize: false, cursorMode: false
  }, { first: jest.fn(), refresh: jest.fn(), setPageSize: jest.fn(), prev: jest.fn(), next: jest.fn(), last: jest.fn(), toggleInfinite: jest.fn() }])
}));

describe('DomainsList warnings filter', () => {
  test('shows all by default', () => {
    render(<DomainsList campaignId="c1" />);
    const cells = screen.getAllByTestId('campaign-domains-cell-domain');
    expect(cells.map(c => c.textContent)).toEqual(expect.arrayContaining(['warn1.com','clean.com','warn2.com']));
  });

  test('filter: With warnings', async () => {
    const user = userEvent.setup();
    render(<DomainsList campaignId="c1" />);
    const select = screen.getByTestId('campaign-domains-warnings-filter');
    await user.selectOptions(select, 'with');
    const domains = screen.getAllByTestId('campaign-domains-cell-domain').map(cell => cell.textContent || '');
    expect(domains).toEqual(expect.arrayContaining(['warn1.com','warn2.com']));
    expect(domains.join(',')).not.toMatch(/clean\.com/);
  });

  test('filter: Without warnings', async () => {
    const user = userEvent.setup();
    render(<DomainsList campaignId="c1" />);
    const select = screen.getByTestId('campaign-domains-warnings-filter');
    await user.selectOptions(select, 'without');
    const domains = screen.getAllByTestId('campaign-domains-cell-domain').map(cell => cell.textContent || '');
    expect(domains).toEqual(expect.arrayContaining(['clean.com']));
    expect(domains.join(',')).not.toMatch(/warn1\.com|warn2\.com/);
  });
});
