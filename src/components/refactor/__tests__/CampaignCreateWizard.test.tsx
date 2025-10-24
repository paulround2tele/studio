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

jest.mock('@/store/api/campaignApi', () => ({
  useCreateCampaignMutation: () => mockUseCreateCampaignMutation(),
  campaignApi: {
    reducerPath: 'campaignApi',
    reducer: jest.fn(),
    middleware: jest.fn(() => () => (next: unknown) => (action: unknown) => next(action))
  }
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

describe('CampaignCreateWizard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateCampaignMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false }
    ]);
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

    it('should show link to legacy form', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      const legacyLink = screen.getByText('Use Legacy Form');
      expect(legacyLink).toBeInTheDocument();
      
      fireEvent.click(legacyLink);
      expect(mockPush).toHaveBeenCalledWith('/campaigns/new/legacy');
    });

    it('should render all step indicators', () => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      expect(screen.getByText('Goal')).toBeInTheDocument();
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

      // Click next
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should be on step 2
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
        expect(screen.getByText('25% complete')).toBeInTheDocument();
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
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Base Pattern *')).toBeInTheDocument();
        expect(screen.getByLabelText('Maximum Domains *')).toBeInTheDocument();
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
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Next should be disabled without pattern and max domains
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).toBeDisabled();
      });

      // Fill required fields
      const patternInput = screen.getByPlaceholderText('e.g., example-{variation}.com');
      const maxDomainsInput = screen.getByPlaceholderText('1000');
      
      await user.type(patternInput, 'test-{variation}.com');
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
    const setupCompleteWizard = async (user: unknown) => {
      render(
        <TestWrapper>
          <CampaignCreateWizard />
        </TestWrapper>
      );

      // Step 1: Goal
      const nameInput = screen.getByPlaceholderText('Enter a descriptive name for your campaign');
      await user.type(nameInput, 'Test Campaign');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2: Pattern
      await waitFor(() => {
        expect(screen.getByLabelText('Base Pattern *')).toBeInTheDocument();
      });
      
      const patternInput = screen.getByPlaceholderText('e.g., example-{variation}.com');
      const maxDomainsInput = screen.getByPlaceholderText('1000');
      await user.type(patternInput, 'test-{variation}.com');
      await user.type(maxDomainsInput, '100');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Targeting (optional)
      await waitFor(() => {
        expect(screen.getByLabelText('Include Keywords')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Review
      await waitFor(() => {
        expect(screen.getByText('Review your campaign settings')).toBeInTheDocument();
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
      const mockCreateCampaign = jest.fn().mockResolvedValue({
        unwrap: () => Promise.resolve({ id: 'new-campaign-id' })
      });
      
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
          description: ''
        });
      });
    });

    it('should redirect to campaign page after successful creation', async () => {
      const user = userEvent.setup();
      const mockCreateCampaign = jest.fn().mockResolvedValue({
        unwrap: () => Promise.resolve({ id: 'new-campaign-id' })
      });
      
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

    it('should show loading state during creation', async () => {
      const user = userEvent.setup();
      
      mockUseCreateCampaignMutation.mockReturnValue([
        jest.fn(),
        { isLoading: true }
      ]);

      await setupCompleteWizard(user);

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