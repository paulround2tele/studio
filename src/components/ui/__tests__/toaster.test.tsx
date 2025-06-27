import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toaster, ToastQueue } from '../toaster';
import { useToast } from '@/hooks/use-toast';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('Toaster Component Tests', () => {
  const mockToasts = [
    {
      id: '1',
      title: 'Test Toast 1',
      description: 'First test toast',
      variant: 'default' as const,
    },
    {
      id: '2', 
      title: 'Test Toast 2',
      description: 'Second test toast',
      variant: 'success' as const,
    },
    {
      id: '3',
      title: 'Test Toast 3', 
      description: 'Third test toast',
      variant: 'warning' as const,
    },
  ];

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toasts: [],
      toast: jest.fn(),
      dismiss: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders nothing when no toasts', () => {
      mockUseToast.mockReturnValue({
        toasts: [],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster />);
      expect(container.firstChild).toBeNull();
    });

    test('renders toasts when available', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster />);
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
      expect(screen.getByText('First test toast')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    test('applies top-left positioning correctly', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster position="top-left" />);
      const toasterDiv = container.querySelector('div');
      
      expect(toasterDiv).toHaveClass('top-0');
      expect(toasterDiv).toHaveClass('left-0');
      expect(toasterDiv).toHaveClass('flex-col');
    });

    test('applies top-center positioning correctly', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster position="top-center" />);
      const toasterDiv = container.querySelector('div');
      
      expect(toasterDiv).toHaveClass('top-0');
      expect(toasterDiv).toHaveClass('left-1/2');
      expect(toasterDiv).toHaveClass('-translate-x-1/2');
    });

    test('applies bottom-right positioning correctly (default)', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster />);
      const toasterDiv = container.querySelector('div');
      
      expect(toasterDiv).toHaveClass('bottom-0');
      expect(toasterDiv).toHaveClass('right-0');
      expect(toasterDiv).toHaveClass('flex-col-reverse');
    });

    test('applies all positioning variants correctly', () => {
      const positions = [
        'top-left', 'top-center', 'top-right', 
        'bottom-left', 'bottom-center', 'bottom-right'
      ] as const;

      positions.forEach(position => {
        mockUseToast.mockReturnValue({
          toasts: [mockToasts[0]],
          toast: jest.fn(), 
          dismiss: jest.fn(),
        });

        const { container, unmount } = render(<Toaster position={position} />);
        const toasterDiv = container.querySelector('div');
        
        expect(toasterDiv).toBeInTheDocument();
        expect(toasterDiv).toHaveClass('fixed');
        expect(toasterDiv).toHaveClass('z-[100]');
        
        unmount();
      });
    });
  });

  describe('Toast Limiting', () => {
    test('limits toasts to specified limit', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster limit={2} />);
      
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Test Toast 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Toast 3')).not.toBeInTheDocument();
    });

    test('shows all toasts when limit is higher than toast count', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0], mockToasts[1]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster limit={5} />);
      
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Test Toast 2')).toBeInTheDocument();
    });

    test('shows all toasts when limit is 0 or undefined', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster limit={0} />);
      
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Test Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Test Toast 3')).toBeInTheDocument();
    });
  });

  describe('Rich Colors and Expand Mode', () => {
    test('applies rich colors when enabled', () => {
      mockUseToast.mockReturnValue({
        toasts: [
          { ...mockToasts[0], variant: 'success' },
          { ...mockToasts[1], variant: 'warning' }
        ],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster richColors={true} />);
      
      // Check that success icon is rendered
      expect(screen.getByText('✓')).toBeInTheDocument();
      // Check that warning icon is rendered
      expect(screen.getByText('⚠')).toBeInTheDocument();
    });

    test('does not apply rich colors when disabled', () => {
      mockUseToast.mockReturnValue({
        toasts: [{ ...mockToasts[0], variant: 'success' }],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster richColors={false} />);
      
      // Success icon should not be rendered when richColors is false
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });

    test('applies expand mode correctly', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster expand={true} />);
      const toasts = container.querySelectorAll('[data-state]');
      
      // When expanded, all toasts should be fully visible (no opacity/scale reduction)
      toasts.forEach(toast => {
        expect(toast).not.toHaveClass('scale-95');
        expect(toast).not.toHaveClass('opacity-60');
      });
    });
  });

  describe('Stacking and Z-Index', () => {
    test('applies correct z-index stacking', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster />);
      const toastElements = container.querySelectorAll('[data-state]');
      
      // Check that z-index decreases for subsequent toasts
      expect(toastElements[0]).toHaveStyle('z-index: 3'); // First toast gets highest z-index
      expect(toastElements[1]).toHaveStyle('z-index: 2'); // Second toast gets medium z-index
      expect(toastElements[2]).toHaveStyle('z-index: 1'); // Third toast gets lowest z-index
    });

    test('applies visual offset for non-expanded toasts', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster expand={false} />);
      const toastElements = container.querySelectorAll('[data-state]');
      
      // First 3 toasts should be expanded, others should have offset
      expect(toastElements[0]).not.toHaveClass('scale-95'); // Index 0 - expanded
      expect(toastElements[1]).not.toHaveClass('scale-95'); // Index 1 - expanded  
      expect(toastElements[2]).not.toHaveClass('scale-95'); // Index 2 - expanded
    });
  });

  describe('Duration and Close Button', () => {
    test('passes duration to ToastProvider', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster duration={3000} />);
      
      // ToastProvider should receive the duration prop
      // This is tested indirectly by checking the component renders without errors
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
    });

    test('shows close button when enabled', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster closeButton={true} />);
      
      // Should have a close button (X icon)
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    test('hides close button when disabled', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      render(<Toaster closeButton={false} />);
      
      // Should not have a close button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    test('applies custom className', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        toast: jest.fn(),
        dismiss: jest.fn(),
      });

      const { container } = render(<Toaster className="custom-toaster-class" />);
      const toasterDiv = container.querySelector('div');
      
      expect(toasterDiv).toHaveClass('custom-toaster-class');
    });
  });
});

describe('ToastQueue Class Tests', () => {
  let toastQueue: ToastQueue;

  beforeEach(() => {
    // Get fresh instance and clear it
    toastQueue = ToastQueue.getInstance();
    toastQueue.clear();
    toastQueue.setMaxConcurrent(3); // Reset to default
  });

  afterEach(() => {
    toastQueue.clear();
  });

  describe('Singleton Pattern', () => {
    test('returns same instance', () => {
      const instance1 = ToastQueue.getInstance();
      const instance2 = ToastQueue.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Queue Management', () => {
    test('adds toast to queue', () => {
      const toast = { id: '1', props: { title: 'Test' } };
      
      const length = toastQueue.add(toast);
      const queue = toastQueue.getQueue();
      
      expect(length).toBe(1);
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('1');
      expect(queue[0].props.title).toBe('Test');
      expect(queue[0].timestamp).toBeDefined();
    });

    test('removes toast from queue', () => {
      const toast1 = { id: '1', props: { title: 'Test 1' } };
      const toast2 = { id: '2', props: { title: 'Test 2' } };
      
      toastQueue.add(toast1);
      toastQueue.add(toast2);
      const length = toastQueue.remove('1');
      
      const queue = toastQueue.getQueue();
      expect(length).toBe(1);
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('2');
    });

    test('clears all toasts from queue', () => {
      toastQueue.add({ id: '1', props: { title: 'Test 1' } });
      toastQueue.add({ id: '2', props: { title: 'Test 2' } });
      
      toastQueue.clear();
      
      expect(toastQueue.getQueue()).toHaveLength(0);
    });

    test('returns immutable queue copy', () => {
      const toast = { id: '1', props: { title: 'Test' } };
      toastQueue.add(toast);
      
      const queue1 = toastQueue.getQueue();
      const queue2 = toastQueue.getQueue();
      
      expect(queue1).not.toBe(queue2); // Different references
      expect(queue1).toEqual(queue2); // Same content
    });
  });

  describe('Concurrency Management', () => {
    test('sets and gets max concurrent toasts', () => {
      expect(toastQueue.getMaxConcurrent()).toBe(3); // Default
      
      toastQueue.setMaxConcurrent(5);
      expect(toastQueue.getMaxConcurrent()).toBe(5);
    });

    test('enforces minimum of 1 for max concurrent', () => {
      toastQueue.setMaxConcurrent(-5);
      expect(toastQueue.getMaxConcurrent()).toBe(1);
      
      toastQueue.setMaxConcurrent(0);
      expect(toastQueue.getMaxConcurrent()).toBe(1);
    });
  });

  describe('Processing Logic', () => {
    test('processes queue synchronously', () => {
      const toast1 = { id: '1', props: { title: 'Test 1' } };
      const toast2 = { id: '2', props: { title: 'Test 2' } };
      
      toastQueue.add(toast1);
      toastQueue.add(toast2);
      
      const processed = toastQueue.processQueueSync();
      
      expect(processed).toHaveLength(2); // Should process both within max concurrent limit
      expect(processed[0].id).toBe('1');
      expect(processed[1].id).toBe('2');
      
      // Queue should be empty after processing
      expect(toastQueue.getQueue()).toHaveLength(0);
    });

    test('respects max concurrent limit', () => {
      toastQueue.setMaxConcurrent(2);
      
      const toast1 = { id: '1', props: { title: 'Test 1' } };
      const toast2 = { id: '2', props: { title: 'Test 2' } };
      const toast3 = { id: '3', props: { title: 'Test 3' } };
      
      toastQueue.add(toast1);
      toastQueue.add(toast2);
      toastQueue.add(toast3);
      
      const processed = toastQueue.processQueueSync();
      
      expect(processed).toHaveLength(2); // Should only process 2 due to limit
      expect(toastQueue.getQueue()).toHaveLength(1); // 1 should remain in queue
    });
  });
});
