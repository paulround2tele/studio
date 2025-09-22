/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRouter } from 'next/navigation';
import { CampaignCreateWizard } from '../CampaignCreateWizard';
import { campaignApi } from '@/store/api/campaignApi';
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

// Create proper mock implementations
const mockUseCreateCampaignMutation = jest.fn();
const mockUseUpdateCampaignModeMutation = jest.fn();
const mockUseStartPhaseStandaloneMutation = jest.fn();

jest.mock('@/store/api/campaignApi', () => ({
  campaignApi: {
    reducer: jest.fn(),
    middleware: [],
    endpoints: {},
  },
  useCreateCampaignMutation: () => mockUseCreateCampaignMutation(),
  useUpdateCampaignModeMutation: () => mockUseUpdateCampaignModeMutation(),
  useStartPhaseStandaloneMutation: () => mockUseStartPhaseStandaloneMutation(),
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
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
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
  });

  describe('Auto-start Logic', () => {
    it('should automatically start discovery phase when creating campaign in auto mode', async () => {
      const user = userEvent.setup();
      
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
      const autoModeRadio = screen.getByLabelText(/Full Auto/i);
      await user.click(autoModeRadio);

      // Next to pattern step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Fill in pattern step
      const patternInput = screen.getByPlaceholderText(/e\.g\., example-\{variation\}\.com/);
      await user.type(patternInput, 'test-{variation}.com');

      const maxDomainsInput = screen.getByPlaceholderText('1000');
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      // Next to targeting step
      await user.click(nextButton);

      // Step 3: Skip targeting (optional)
      await user.click(nextButton);

      // Step 4: Review and create
      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        // Verify campaign creation was called
        expect(mockCreateCampaign).toHaveBeenCalled();
        
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
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Campaign Created & Started',
          description: expect.stringContaining('auto mode and the discovery phase has started automatically'),
        });
        
        // Verify redirect
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      });
    });

    it('should handle auto-start failure gracefully', async () => {
      const user = userEvent.setup();
      
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

      const autoModeRadio = screen.getByLabelText(/Full Auto/i);
      await user.click(autoModeRadio);

      // Navigate through steps
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText(/e\.g\., example-\{variation\}\.com/);
      await user.type(patternInput, 'test-{variation}.com');

      const maxDomainsInput = screen.getByPlaceholderText('1000');
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        // Verify campaign was still created
        expect(mockCreateCampaign).toHaveBeenCalled();
        expect(mockUpdateCampaignMode).toHaveBeenCalled();
        
        // Verify auto-start was attempted
        expect(mockStartPhase).toHaveBeenCalled();
        
        // Verify warning toast about auto-start failure
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Campaign Created',
          description: expect.stringContaining('but auto-start failed. You can start the discovery phase manually'),
          variant: 'default',
        });
        
        // Verify redirect still happens
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      });
    });

    it('should not attempt auto-start for manual mode', async () => {
      const user = userEvent.setup();
      
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
      const manualModeRadio = screen.getByLabelText(/Manual/i);
      await user.click(manualModeRadio);

      // Navigate through steps
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText(/e\.g\., example-\{variation\}\.com/);
      await user.type(patternInput, 'test-{variation}.com');

      const maxDomainsInput = screen.getByPlaceholderText('1000');
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
        
        // Verify auto-start was NOT attempted
        expect(mockStartPhase).not.toHaveBeenCalled();
        
        // Verify regular success toast
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Campaign Created Successfully',
          description: expect.stringContaining('manual mode'),
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show "Starting Campaign..." when auto-starting', async () => {
      const user = userEvent.setup();
      
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

      // Mock isLoading states
      jest.doMock('@/store/api/campaignApi', () => ({
        ...jest.requireActual('@/store/api/campaignApi'),
        useCreateCampaignMutation: () => [mockCreateCampaign, { isLoading: false }],
        useUpdateCampaignModeMutation: () => [mockUpdateCampaignMode, { isLoading: false }],
        useStartPhaseStandaloneMutation: () => [mockStartPhase, { isLoading: true }],
      }));

      renderWithProviders(<CampaignCreateWizard />);

      // Navigate to final step and create
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Auto Campaign');

      const autoModeRadio = screen.getByLabelText(/Full Auto/i);
      await user.click(autoModeRadio);

      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const patternInput = screen.getByPlaceholderText(/e\.g\., example-\{variation\}\.com/);
      await user.type(patternInput, 'test-{variation}.com');

      const maxDomainsInput = screen.getByPlaceholderText('1000');
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      // Should show loading state during start phase
      await waitFor(() => {
        expect(screen.getByText('Starting Campaign...')).toBeInTheDocument();
      });

      // Resolve the start phase
      startPhaseResolve!();
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/campaigns/test-campaign-id');
      });
    });
  });
});