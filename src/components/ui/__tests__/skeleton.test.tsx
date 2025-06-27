import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard 
} from '../skeleton';

describe('Skeleton Component Tests', () => {
  test('renders with default props', () => {
    render(<Skeleton data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
    expect(skeleton).toHaveClass('bg-muted');
    expect(skeleton).toHaveClass('h-6'); // default md size
  });

  test('supports different variants', () => {
    const { rerender } = render(<Skeleton variant="shimmer" data-testid="skeleton" />);
    let skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('bg-gradient-to-r');
    expect(skeleton).toHaveClass('animate-shimmer');

    rerender(<Skeleton variant="wave" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('bg-gradient-to-r');
    expect(skeleton).toHaveClass('animate-wave');

    rerender(<Skeleton variant="pulse" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('bg-muted');
  });

  test('supports different shapes', () => {
    const { rerender } = render(<Skeleton shape="circle" data-testid="skeleton" />);
    let skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('rounded-full');

    rerender(<Skeleton shape="square" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('rounded-none');

    rerender(<Skeleton shape="rounded" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('rounded-lg');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Skeleton size="sm" data-testid="skeleton" />);
    let skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('h-4');

    rerender(<Skeleton size="lg" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('h-8');

    rerender(<Skeleton size="xl" data-testid="skeleton" />);
    skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('h-10');
  });

  test('supports custom width and height', () => {
    render(<Skeleton width={200} height={100} data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '100px',
    });
  });

  test('supports string width and height', () => {
    render(<Skeleton width="50%" height="2rem" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle({
      width: '50%',
      height: '2rem',
    });
  });

  test('supports multiple lines', () => {
    render(<Skeleton lines={3} data-testid="skeleton" />);
    
    // Should render a container with multiple skeleton lines
    const container = screen.getByTestId('skeleton');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('space-y-2'); // normal spacing
    
    // Should have 3 child skeleton divs
    const skeletonLines = container.querySelectorAll('div');
    expect(skeletonLines).toHaveLength(3);
    
    // Last line should be shorter (3/4 width)
    const lastLine = skeletonLines[skeletonLines.length - 1];
    expect(lastLine).toHaveClass('w-3/4');
  });

  test('supports different line spacing', () => {
    const { rerender } = render(
      <Skeleton lines={2} spacing="tight" data-testid="skeleton" />
    );
    let container = screen.getByTestId('skeleton');
    expect(container).toHaveClass('space-y-1');

    rerender(<Skeleton lines={2} spacing="loose" data-testid="skeleton" />);
    container = screen.getByTestId('skeleton');
    expect(container).toHaveClass('space-y-3');
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} data-testid="skeleton" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Skeleton className="custom-skeleton-class" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('custom-skeleton-class');
  });

  test('combines variants, shapes, and sizes correctly', () => {
    render(
      <Skeleton 
        variant="shimmer" 
        shape="circle" 
        size="lg" 
        data-testid="skeleton" 
      />
    );
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('bg-gradient-to-r');
    expect(skeleton).toHaveClass('animate-shimmer');
    expect(skeleton).toHaveClass('rounded-full');
    expect(skeleton).toHaveClass('h-8');
  });
});

describe('SkeletonText Component Tests', () => {
  test('renders with default 3 lines', () => {
    render(<SkeletonText data-testid="skeleton-text" />);
    
    const container = screen.getByTestId('skeleton-text');
    const lines = container.querySelectorAll('div');
    expect(lines).toHaveLength(3);
  });

  test('supports custom number of lines', () => {
    render(<SkeletonText lines={5} data-testid="skeleton-text" />);
    
    const container = screen.getByTestId('skeleton-text');
    const lines = container.querySelectorAll('div');
    expect(lines).toHaveLength(5);
  });

  test('forwards props to underlying Skeleton', () => {
    render(<SkeletonText variant="shimmer" spacing="tight" data-testid="skeleton-text" />);
    
    const container = screen.getByTestId('skeleton-text');
    expect(container).toHaveClass('space-y-1');
    
    const lines = container.querySelectorAll('div');
    expect(lines[0]).toHaveClass('animate-shimmer');
  });
});

describe('SkeletonAvatar Component Tests', () => {
  test('renders as circle by default', () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" />);
    
    const avatar = screen.getByTestId('skeleton-avatar');
    expect(avatar).toHaveClass('rounded-full');
  });

  test('supports different sizes', () => {
    const { rerender } = render(<SkeletonAvatar size="sm" data-testid="skeleton-avatar" />);
    let avatar = screen.getByTestId('skeleton-avatar');
    expect(avatar).toHaveStyle({ width: '32px', height: '32px' });

    rerender(<SkeletonAvatar size="lg" data-testid="skeleton-avatar" />);
    avatar = screen.getByTestId('skeleton-avatar');
    expect(avatar).toHaveStyle({ width: '48px', height: '48px' });

    rerender(<SkeletonAvatar size="xl" data-testid="skeleton-avatar" />);
    avatar = screen.getByTestId('skeleton-avatar');
    expect(avatar).toHaveStyle({ width: '64px', height: '64px' });
  });

  test('forwards props to underlying Skeleton', () => {
    render(<SkeletonAvatar variant="shimmer" data-testid="skeleton-avatar" />);
    
    const avatar = screen.getByTestId('skeleton-avatar');
    expect(avatar).toHaveClass('animate-shimmer');
  });
});

describe('SkeletonCard Component Tests', () => {
  test('renders card structure with avatar and text', () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    
    const card = screen.getByTestId('skeleton-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('space-y-3');
    expect(card).toHaveClass('p-4');
    
    // Should contain avatar and text skeletons
    const skeletons = card.querySelectorAll('div[class*="animate-pulse"], div[class*="animate-shimmer"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('forwards props and applies custom className', () => {
    render(<SkeletonCard className="custom-card" data-testid="skeleton-card" />);
    
    const card = screen.getByTestId('skeleton-card');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveClass('space-y-3');
    expect(card).toHaveClass('p-4');
  });
});

describe('Skeleton Accessibility Tests', () => {
  test('has appropriate aria attributes', () => {
    render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
  });

  test('supports role attribute', () => {
    render(<Skeleton role="status" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
  });
});
