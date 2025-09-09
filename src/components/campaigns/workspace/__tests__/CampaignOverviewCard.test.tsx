import React from 'react';
import { render, screen } from '@testing-library/react';
import { CampaignOverviewCard } from '../CampaignOverviewCard';
import { Provider } from 'react-redux';
import { store as appStore } from '@/store';

// Mock API client configuration to bypass openapi configuration constructor in test env
jest.mock('@/lib/api/config', () => ({
  createApiConfiguration: () => ({ basePath: 'http://localhost', baseOptions: {} }),
}));

describe('CampaignOverviewCard', () => {
  it('renders metrics placeholders', () => {
  render(<Provider store={appStore}><CampaignOverviewCard campaignId="test-campaign" /></Provider>);
    expect(screen.getByText(/Campaign Overview/)).toBeInTheDocument();
  });
});
