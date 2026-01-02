/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRouter } from 'next/navigation';
import { CampaignCreateWizard } from '../CampaignCreateWizard';
import { campaignApi } from '@/store/api/campaignApi';
import { useCampaignFormData } from '@/lib/hooks/useCampaignFormData';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock the API mutations
const mockCreateCampaign = jest.fn();
const mockUpdateCampaignMode = jest.fn();
const mockStartPhase = jest.fn();
const mockConfigurePhase = jest.fn();

// Create proper mock implementations
const mockUseCreateCampaignMutation = jest.fn();
const mockUseUpdateCampaignModeMutation = jest.fn();
const mockUseStartPhaseStandaloneMutation = jest.fn();
const mockUseConfigurePhaseStandaloneMutation = jest.fn();

jest.mock('@/store/api/campaignApi', () => {
  const actualModule = jest.requireActual('@/store/api/campaignApi');

  return {
    ...actualModule,
    useCreateCampaignMutation: () => mockUseCreateCampaignMutation(),
    useUpdateCampaignModeMutation: () => mockUseUpdateCampaignModeMutation(),
    useStartPhaseStandaloneMutation: () => mockUseStartPhaseStandaloneMutation(),
    useConfigurePhaseStandaloneMutation: () => mockUseConfigurePhaseStandaloneMutation(),
  };
});

jest.mock('@/lib/hooks/useCampaignFormData', () => ({
  useCampaignFormData: jest.fn(),
}));

const mockPush = jest.fn();
const mockToast = jest.fn();

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      campaignApi: campaignApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(campaignApi.middleware),
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  const utils = render(
    <Provider store={store}>
      {component}
    </Provider>
  );

  return {
    store,
    ...utils,
    rerender: (nextComponent: React.ReactElement) =>
      utils.rerender(
        <Provider store={store}>
          {nextComponent}
        </Provider>
      ),
  };
};

const getMaxDomainsInput = (): HTMLInputElement => {
  const labelElement = screen.getByText('Max Domains');
  const container = labelElement.parentElement ?? labelElement.closest('div');
  const input = container?.querySelector('input');
  if (!input || !(input instanceof HTMLInputElement)) {
    throw new Error('Max Domains input not found');
  }
  return input;
};

describe('CampaignCreateWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    
    // Setup mock returns for hooks
    mockUseCreateCampaignMutation.mockReturnValue([mockCreateCampaign, { isLoading: false }]);
    mockUseUpdateCampaignModeMutation.mockReturnValue([mockUpdateCampaignMode, { isLoading: false }]);
    mockUseStartPhaseStandaloneMutation.mockReturnValue([mockStartPhase, { isLoading: false }]);
    mockUseConfigurePhaseStandaloneMutation.mockReturnValue([mockConfigurePhase, { isLoading: false }]);

    mockCreateCampaign.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ id: 'test-campaign-id' }),
    });
    mockUpdateCampaignMode.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({}),
    });
    mockStartPhase.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ status: 'started' }),
    });
    mockConfigurePhase.mockImplementation(() => ({
      unwrap: jest.fn().mockResolvedValue({ status: 'configured' }),
    }));

    (useCampaignFormData as jest.Mock).mockReturnValue({
      dnsPersonas: [
        { id: 'dns-persona-1', name: 'DNS Persona 1' },
      ],
      httpPersonas: [
        { id: 'http-persona-1', name: 'HTTP Persona 1' },
      ],
      keywordSets: [
        { id: 'kw-set-1', name: 'Default Keyword Set', ruleCount: 4, isEnabled: true, createdAt: '', updatedAt: '' },
      ],
      proxies: [],
      sourceCampaigns: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('Auto-start Logic', () => {
    // Increase timeout for these complex multi-step wizard tests
    jest.setTimeout(15000);
    
    it('should automatically start discovery phase when creating campaign in auto mode', async () => {
      const user = userEvent.setup({ delay: null });
      
      // Mock successful API responses
      mockCreateCampaign.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'test-campaign-id' }),
      });
      mockUpdateCampaignMode.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({}),
      });
      mockStartPhase.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({}),
      });

      renderWithProviders(<CampaignCreateWizard />);

      // Step 1: Fill in goal step
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Auto Campaign');

      // Select auto mode
      const autoModeRadio = screen.getByRole('radio', { name: /Full Auto/i });
      await user.click(autoModeRadio);

      // Next to pattern step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Fill in pattern step
      const patternInput = screen.getByPlaceholderText('brand');
      await user.type(patternInput, 'brand');

      const maxDomainsInput = getMaxDomainsInput();
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      // Next to targeting step
      await user.click(nextButton);

    // Step 3: Provide required targeting inputs for auto mode
    const includeKeywordsInput = screen.getByLabelText(/Include Keywords/i);
    await user.clear(includeKeywordsInput);
    await user.type(includeKeywordsInput, 'growth');

    await user.click(nextButton);

      // Step 4: Review and create
      const createButton = screen.getByRole('button', { name: /create & start campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        // Verify campaign creation was called
        expect(mockCreateCampaign).toHaveBeenCalled();

        // Verify phases were configured before auto-start
        const configuredPhases = mockConfigurePhase.mock.calls.map(([args]) => args.phase);
        expect(configuredPhases).toEqual([
          'discovery',
          'validation',
          'extraction',
          'analysis',
          'enrichment',
        ]);
        
        // Verify mode was updated to full_sequence
        expect(mockUpdateCampaignMode).toHaveBeenCalledWith({
          campaignId: 'test-campaign-id',
          mode: 'full_sequence',
        });
        
        // Verify auto-start was triggered
        expect(mockStartPhase).toHaveBeenCalledWith({
          campaignId: 'test-campaign-id',
          phase: 'discovery',
        });
        
        // Verify success toast
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Campaign Created & Started',
          description: expect.stringContaining('auto mode'),
        }));
        
        // Verify redirect
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      }, { timeout: 3000 });
    });

    it('should handle auto-start failure gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      
      // Mock successful campaign creation but failed auto-start
      mockCreateCampaign.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'test-campaign-id' }),
      });
      mockUpdateCampaignMode.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({}),
      });
      mockStartPhase.mockReturnValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Start phase failed')),
      });

      renderWithProviders(<CampaignCreateWizard />);

      // Go through wizard steps quickly
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Auto Campaign');

      const autoModeRadio = screen.getByRole('radio', { name: /Full Auto/i });
      await user.click(autoModeRadio);

    // Navigate through steps
    let nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText('brand');
      await user.type(patternInput, 'brand');

      const maxDomainsInput = getMaxDomainsInput();
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    const includeKeywordsInput = screen.getByLabelText(/Include Keywords/i);
    await user.clear(includeKeywordsInput);
    await user.type(includeKeywordsInput, 'growth');

    nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

      const createButton = screen.getByRole('button', { name: /create & start campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        // Verify campaign was still created
        expect(mockCreateCampaign).toHaveBeenCalled();
        expect(mockUpdateCampaignMode).toHaveBeenCalled();
        
    // Verify phases were configured and auto-start was attempted
    expect(mockConfigurePhase).toHaveBeenCalledTimes(5);
    expect(mockStartPhase).toHaveBeenCalled();
        
        // Verify warning toast about auto-start failure
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Campaign Created',
          description: expect.stringContaining('auto-start failed'),
        }));
        
        // Verify redirect still happens
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      }, { timeout: 3000 });
    });

    it('should not attempt auto-start for manual mode', async () => {
      const user = userEvent.setup({ delay: null });
      
      mockCreateCampaign.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'test-campaign-id' }),
      });
      mockUpdateCampaignMode.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({}),
      });

      renderWithProviders(<CampaignCreateWizard />);

      // Fill in required fields
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Manual Campaign');

      // Select manual mode
      const manualModeRadio = screen.getByRole('radio', { name: /Manual \(Step-by-Step\)/i });
      await user.click(manualModeRadio);

      // Navigate through steps
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText('brand');
      await user.type(patternInput, 'brand');

      const maxDomainsInput = getMaxDomainsInput();
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        // Verify campaign creation
        expect(mockCreateCampaign).toHaveBeenCalled();
        
        // Verify mode was set to step_by_step
        expect(mockUpdateCampaignMode).toHaveBeenCalledWith({
          campaignId: 'test-campaign-id',
          mode: 'step_by_step',
        });
        
        // Verify auto-start was NOT attempted (configurePhase may still be called for manual mode to pre-configure discovery)
        expect(mockStartPhase).not.toHaveBeenCalled();
        
        // Verify success toast mentions manual mode
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Campaign Ready',
          description: expect.stringContaining('manual mode'),
        }));
      });
    });
  });

  describe('Loading States', () => {
    it('should show "Starting Campaign..." when auto-starting', async () => {
      const user = userEvent.setup({ delay: null });
      
      // Mock APIs with delays to test loading states
      mockCreateCampaign.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({ id: 'test-campaign-id' }),
      });
      mockUpdateCampaignMode.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({}),
      });
      
      // Mock start phase with delay
      let startPhaseResolve: () => void;
      const startPhasePromise = new Promise<void>((resolve) => {
        startPhaseResolve = resolve;
      });
      mockStartPhase.mockReturnValue({
        unwrap: jest.fn().mockReturnValue(startPhasePromise),
      });

      // Force start phase hook to indicate loading state
      let startPhaseLoading = false;
      mockUseStartPhaseStandaloneMutation.mockImplementation(() => [
        mockStartPhase,
        { isLoading: startPhaseLoading },
      ]);

      const { rerender } = renderWithProviders(<CampaignCreateWizard />);

      // Navigate to final step and create
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Auto Campaign');

      const autoModeRadio = screen.getByRole('radio', { name: /Full Auto/i });
      await user.click(autoModeRadio);

      let nextButton = screen.getByRole('button', { name: /^Next/i });
      await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText('brand');
      await user.type(patternInput, 'brand');

      const maxDomainsInput = getMaxDomainsInput();
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      nextButton = screen.getByRole('button', { name: /next/i });
  await user.click(nextButton);

  const includeKeywordsInput = screen.getByLabelText(/Include Keywords/i);
  await user.clear(includeKeywordsInput);
  await user.type(includeKeywordsInput, 'growth');

  await user.click(nextButton);

      const createButton = screen.getByRole('button', { name: /create & start campaign/i });
      await user.click(createButton);

      startPhaseLoading = true;
      rerender(<CampaignCreateWizard />);

      // Should show loading state during start phase
      await waitFor(() => {
        expect(screen.getByText('Starting Auto Campaign...')).toBeInTheDocument();
      });

      // Resolve the start phase
      startPhaseResolve!();
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      });
    });
  });
});