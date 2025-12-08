/**
 * Tests for CampaignCreateWizard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRouter } from 'next/navigation';
import CampaignCreateWizard from '../campaign/CampaignCreateWizard';
import { campaignApi } from '@/store/api/campaignApi';
import { useCampaignFormData } from '@/lib/hooks/useCampaignFormData';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

const mockUseCreateCampaignMutation = jest.fn();
const mockUseUpdateCampaignModeMutation = jest.fn();
const mockUseStartPhaseStandaloneMutation = jest.fn();
const mockUseConfigurePhaseStandaloneMutation = jest.fn();
const mockUpdateCampaignMode = jest.fn();
const mockStartPhase = jest.fn();
const mockConfigurePhase = jest.fn();

jest.mock('@/store/api/campaignApi', () => ({
  useCreateCampaignMutation: () => mockUseCreateCampaignMutation(),
  useUpdateCampaignModeMutation: () => mockUseUpdateCampaignModeMutation(),
  useStartPhaseStandaloneMutation: () => mockUseStartPhaseStandaloneMutation(),
  useConfigurePhaseStandaloneMutation: () => mockUseConfigurePhaseStandaloneMutation(),
  campaignApi: {
    reducerPath: 'campaignApi',
    reducer: jest.fn(),
    middleware: jest.fn(() => () => (next: unknown) => (action: unknown) => next(action))
  }
}));

jest.mock('@/lib/hooks/useCampaignFormData', () => ({
  useCampaignFormData: jest.fn(),
}));

// Mock router
const mockPush = jest.fn();
const mockReplace = jest.fn();

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    replace: mockReplace
  });
});

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [campaignApi.reducerPath]: (state = {}) => state
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(campaignApi.middleware as unknown)
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  return <Provider store={store}>{children}</Provider>;
};

const selectManualMode = async (user?: ReturnType<typeof userEvent.setup>) => {
  const manualRadio = screen.getByLabelText(/manual \(step-by-step\)/i);
  if (user) {
    await user.click(manualRadio);
  } else {
    fireEvent.click(manualRadio);
  }
  await waitFor(() => expect(manualRadio).toBeChecked());
};

const getMaxDomainsInput = (): HTMLInputElement => {
  const labelElement = screen.getByText('Max Domains');
  const container = labelElement.parentElement;
  const input = container?.querySelector('input');
  if (!input || !(input instanceof HTMLInputElement)) {
    throw new Error('Max Domains input not found');
  }
  return input;
};

describe('CampaignCreateWizard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const createUnwrap = jest.fn().mockResolvedValue({ id: 'new-campaign-id' });
    mockUseCreateCampaignMutation.mockReturnValue([
      jest.fn(() => ({ unwrap: createUnwrap })),
      { isLoading: false }
    ]);

    const updateUnwrap = jest.fn().mockResolvedValue({});
    mockUpdateCampaignMode.mockReturnValue({ unwrap: updateUnwrap });
    mockUseUpdateCampaignModeMutation.mockReturnValue([
      mockUpdateCampaignMode,
      { isLoading: false }
    ]);

    const startUnwrap = jest.fn().mockResolvedValue({ status: 'started' });
    mockStartPhase.mockReturnValue({ unwrap: startUnwrap });
    mockUseStartPhaseStandaloneMutation.mockReturnValue([
      mockStartPhase,
      { isLoading: false }
    ]);

    const configureUnwrap = jest.fn().mockResolvedValue({ status: 'configured' });
    mockConfigurePhase.mockReturnValue({ unwrap: configureUnwrap });
    mockUseConfigurePhaseStandaloneMutation.mockReturnValue([
      mockConfigurePhase,
      { isLoading: false }
    ]);

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
      isLoading: false,
      error: null,
      proxies: [],
      sourceCampaigns: [],
      refetch: jest.fn(),
    });
  });

  describe('Initial Render', () => {
    it('should render the wizard with initial step', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      expect(screen.getAllByText('Goal')).toHaveLength(2); // Step indicator and card title
      expect(screen.getByText('25% complete')).toBeInTheDocument();
    });

    it('should render all step indicators', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      expect(screen.getAllByText('Goal').length).toBeGreaterThan(0);
      expect(screen.getByText('Pattern')).toBeInTheDocument();
      expect(screen.getByText('Targeting')).toBeInTheDocument();
      expect(screen.getByText('Review & Launch')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should disable next button when required fields are empty', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable next button when campaign name is filled', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });

    it('should advance to next step when next is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Fill required field
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);

      // Click next
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should be on step 2
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
        expect(screen.getByText('50% complete')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first step', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should allow going back to previous steps', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Go to step 2
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Go back to step 1
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      });
    });
  });

  describe('Step Content', () => {
    it('should render goal step content', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Campaign Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    });

    it('should render pattern step content after navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Navigate to pattern step
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Constant Segment')).toBeInTheDocument();
        expect(screen.getByText('Max Domains')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate pattern step requirements', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Navigate to pattern step
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Next should be disabled without pattern and max domains
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });

      // Fill required fields
      const patternInput = screen.getByLabelText('Constant Segment');
      const maxDomainsInput = getMaxDomainsInput();

      await user.type(patternInput, 'brand');
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');

      // Next should now be enabled
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });
  });

  describe('Step Indicators', () => {
    it('should show current step as active', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const goalStep = screen.getByRole('button', { name: /goal define campaign basics/i });
      expect(goalStep).toHaveAttribute('aria-current', 'step');
    });

    it('should allow clicking on completed steps', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Complete goal step and go to pattern
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Click back to goal step via indicator
      const goalStep = screen.getByRole('button', { name: /goal define campaign basics/i });
      await user.click(goalStep);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Submission', () => {
    const setupCompleteWizard = async (user: ReturnType<typeof userEvent.setup>) => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Step 1: Goal
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await selectManualMode(user);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2: Pattern
      await waitFor(() => {
        expect(screen.getByLabelText('Constant Segment')).toBeInTheDocument();
      });

      const patternInput = screen.getByLabelText('Constant Segment');
      const maxDomainsInput = getMaxDomainsInput();
      await user.type(patternInput, 'brand');
      await user.clear(maxDomainsInput);
      await user.type(maxDomainsInput, '100');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Targeting (optional)
      await waitFor(() => {
        expect(screen.getByLabelText('Include Keywords')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Review
      await waitFor(() => {
        expect(screen.getByText(/Review your campaign settings/i)).toBeInTheDocument();
      });
    };

    it('should show create campaign button on final step', async () => {
      const user = userEvent.setup();
      await setupCompleteWizard(user);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toBeEnabled();
    });

    it('should call create campaign mutation on submit', async () => {
      const user = userEvent.setup();
      const mockCreateCampaign = jest.fn(() => ({
        unwrap: jest.fn().mockResolvedValue({ id: 'new-campaign-id' })
      }));

      mockUseCreateCampaignMutation.mockReturnValue([
        mockCreateCampaign,
        { isLoading: false }
      ]);

      await setupCompleteWizard(user);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateCampaign).toHaveBeenCalledWith({
          name: 'Test Campaign',
          description: '',
          configuration: undefined,
        });
      });
    });

    it('should redirect to campaign page after successful creation', async () => {
      const user = userEvent.setup();
      const mockCreateCampaign = jest.fn(() => ({
        unwrap: jest.fn().mockResolvedValue({ id: 'new-campaign-id' })
      }));

      mockUseCreateCampaignMutation.mockReturnValue([
        mockCreateCampaign,
        { isLoading: false }
      ]);

      await setupCompleteWizard(user);

      const createButton = screen.getByRole('button', { name: /create campaign/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/campaigns/new-campaign-id');
      });
    });

    it('should show loading state during creation', () => {
      mockUseCreateCampaignMutation.mockReturnValue([
        jest.fn(() => ({ unwrap: jest.fn() })),
        { isLoading: true }
      ]);

      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const createButton = screen.getByRole('button', { name: /creating/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Cancel Action', () => {
    it('should navigate to campaigns list when cancel is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/campaigns');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for step navigation', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const goalStep = screen.getByRole('button', { name: /goal define campaign basics/i });
      expect(goalStep).toHaveAttribute('aria-current', 'step');
    });

    it('should have proper form labels', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Campaign Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    });
  });
});