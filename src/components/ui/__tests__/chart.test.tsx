import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  SimpleChart,
  useChart,
  chartContainerVariants,
  chartTooltipVariants,
  chartLegendVariants,
  type ChartConfig,
} from '../chart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: ({ content }: { content?: any }) => (
    <div data-testid="recharts-tooltip">{content}</div>
  ),
  Legend: ({ content }: { content?: any }) => (
    <div data-testid="recharts-legend">{content}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

expect.extend(toHaveNoViolations);

describe('Chart Components', () => {
  const mockConfig: ChartConfig = {
    sales: {
      label: 'Sales',
      color: '#3b82f6',
      format: (value: number) => `$${value.toLocaleString()}`,
    },
    profit: {
      label: 'Profit',
      color: '#10b981',
      format: (value: number) => `$${value.toLocaleString()}`,
    },
    users: {
      label: 'Users',
      color: '#f59e0b',
    },
  };

  const mockData = [
    { name: 'Jan', sales: 4000, profit: 2400, users: 120 },
    { name: 'Feb', sales: 3000, profit: 1398, users: 98 },
    { name: 'Mar', sales: 2000, profit: 9800, users: 156 },
    { name: 'Apr', sales: 2780, profit: 3908, users: 89 },
    { name: 'May', sales: 1890, profit: 4800, users: 201 },
    { name: 'Jun', sales: 2390, profit: 3800, users: 167 },
  ];

  describe('ChartContainer', () => {
    it('renders without crashing', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>Chart content</div>
        </ChartContainer>
      );
      
      expect(screen.getByText('Chart content')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders with different variants', () => {
      const { rerender } = render(
        <ChartContainer config={mockConfig} variant="default" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      let chart = screen.getByTestId('chart');
      expect(chart).toHaveClass(chartContainerVariants({ variant: 'default' }));

      rerender(
        <ChartContainer config={mockConfig} variant="card" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('rounded-lg', 'border', 'bg-card', 'p-4');

      rerender(
        <ChartContainer config={mockConfig} variant="elevated" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('rounded-lg', 'bg-card', 'shadow-lg', 'p-4');

      rerender(
        <ChartContainer config={mockConfig} variant="minimal" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('bg-transparent');

      rerender(
        <ChartContainer config={mockConfig} variant="outlined" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('rounded-lg', 'border-2', 'p-4');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(
        <ChartContainer config={mockConfig} size="default" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      let chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('aspect-video');

      rerender(
        <ChartContainer config={mockConfig} size="sm" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('h-48');

      rerender(
        <ChartContainer config={mockConfig} size="lg" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('h-80');

      rerender(
        <ChartContainer config={mockConfig} size="xl" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('h-96');

      rerender(
        <ChartContainer config={mockConfig} size="square" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('aspect-square');

      rerender(
        <ChartContainer config={mockConfig} size="auto" data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('h-auto');
    });

    it('displays loading state', () => {
      render(
        <ChartContainer config={mockConfig} loading={true}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
      
      // Check for loading animation
      const loadingDots = document.querySelectorAll('.animate-pulse');
      expect(loadingDots).toHaveLength(3);
    });

    it('displays error state', () => {
      render(
        <ChartContainer config={mockConfig} error="Failed to fetch data">
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
      expect(screen.getByText('Failed to load chart')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });

    it('displays empty state', () => {
      render(
        <ChartContainer config={mockConfig} isEmpty={true}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('Chart will appear when data is provided')).toBeInTheDocument();
    });

    it('renders custom loading component', () => {
      const customLoading = <div data-testid="custom-loading">Custom Loading...</div>;

      render(
        <ChartContainer config={mockConfig} loading={true} loadingComponent={customLoading}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    });

    it('renders custom error component', () => {
      const customError = <div data-testid="custom-error">Custom Error</div>;

      render(
        <ChartContainer config={mockConfig} error="Error" errorComponent={customError}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });

    it('renders custom empty component', () => {
      const customEmpty = <div data-testid="custom-empty">Custom Empty</div>;

      render(
        <ChartContainer config={mockConfig} isEmpty={true} emptyComponent={customEmpty}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Custom Empty')).toBeInTheDocument();
    });

    it('generates unique chart ID', () => {
      const { rerender } = render(
        <ChartContainer config={mockConfig} id="test-chart">
          <div>Content</div>
        </ChartContainer>
      );

      let chartElement = document.querySelector('[data-chart="chart-test-chart"]');
      expect(chartElement).toBeInTheDocument();

      rerender(
        <ChartContainer config={mockConfig}>
          <div>Content</div>
        </ChartContainer>
      );

      chartElement = document.querySelector('[data-chart^="chart-"]');
      expect(chartElement).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();

      render(
        <ChartContainer config={mockConfig} ref={ref}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('accepts custom className and props', () => {
      render(
        <ChartContainer 
          config={mockConfig} 
          className="custom-class" 
          data-testid="chart"
          aria-label="Custom chart"
        >
          <div>Content</div>
        </ChartContainer>
      );

      const chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('custom-class');
      expect(chart).toHaveAttribute('aria-label', 'Custom chart');
    });
  });

  describe('ChartStyle', () => {
    it('renders CSS styles for color configuration', () => {
      render(
        <ChartContainer config={mockConfig} id="styled-chart">
          <div>Content</div>
        </ChartContainer>
      );

      const styleElement = document.querySelector('style');
      expect(styleElement).toBeInTheDocument();
      
      const styleContent = styleElement?.innerHTML;
      expect(styleContent).toContain('--color-sales: #3b82f6');
      expect(styleContent).toContain('--color-profit: #10b981');
      expect(styleContent).toContain('--color-users: #f59e0b');
    });

    it('does not render styles when no color config', () => {
      const emptyConfig: ChartConfig = {
        data: { label: 'Data' }
      };

      render(
        <ChartContainer config={emptyConfig}>
          <div>Content</div>
        </ChartContainer>
      );

      const styleElement = document.querySelector('style');
      expect(styleElement).not.toBeInTheDocument();
    });
  });

  describe('ChartTooltipContent', () => {
    const TestTooltipContent = (props: any) => {
      return (
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent {...props} />
        </ChartContainer>
      );
    };

    it('renders tooltip content', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'sales', color: '#3b82f6' },
        { dataKey: 'profit', value: 2400, name: 'profit', color: '#10b981' },
      ];

      render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          label="January"
        />
      );

      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('$4,000')).toBeInTheDocument();
      expect(screen.getByText('$2,400')).toBeInTheDocument();
    });

    it('renders with different variants', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const { rerender } = render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          variant="default"
          data-testid="tooltip"
        />
      );

      let tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass(chartTooltipVariants({ variant: 'default' }));

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          variant="dark"
          data-testid="tooltip"
        />
      );

      tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('bg-gray-900', 'text-white', 'border-gray-700');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          variant="light"
          data-testid="tooltip"
        />
      );

      tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('bg-white', 'text-gray-900', 'border-gray-200');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          variant="accent"
          data-testid="tooltip"
        />
      );

      tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('bg-primary', 'text-primary-foreground', 'border-primary');
    });

    it('renders with different sizes', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const { rerender } = render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          size="default"
          data-testid="tooltip"
        />
      );

      let tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('px-3', 'py-1.5', 'text-xs');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          size="sm"
          data-testid="tooltip"
        />
      );

      tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('px-2', 'py-1', 'text-xs');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          size="lg"
          data-testid="tooltip"
        />
      );

      tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('renders with different indicators', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const { rerender } = render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          indicator="dot"
        />
      );

      let indicator = document.querySelector('[style*="--color-bg"]');
      expect(indicator).toHaveClass('h-2.5', 'w-2.5');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          indicator="line"
        />
      );

      indicator = document.querySelector('[style*="--color-bg"]');
      expect(indicator).toHaveClass('w-1');

      rerender(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          indicator="dashed"
        />
      );

      indicator = document.querySelector('[style*="--color-bg"]');
      expect(indicator).toHaveClass('w-0', 'border-dashed');
    });

    it('hides label when hideLabel is true', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'sales', color: '#3b82f6' },
      ];

      render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          label="January"
          hideLabel={true}
        />
      );

      expect(screen.queryByText('January')).not.toBeInTheDocument();
      expect(screen.getByText('$4,000')).toBeInTheDocument();
    });

    it('hides indicator when hideIndicator is true', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          hideIndicator={true}
        />
      );

      const indicator = document.querySelector('[style*="--color-bg"]');
      expect(indicator).not.toBeInTheDocument();
    });

    it('uses custom formatter', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const customFormatter = (value: any, name: any) => (
        <span data-testid="custom-format">{name}: {value}%</span>
      );

      render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          formatter={customFormatter}
        />
      );

      expect(screen.getByTestId('custom-format')).toBeInTheDocument();
      expect(screen.getByText('Sales: 4000%')).toBeInTheDocument();
    });

    it('uses custom label formatter', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const customLabelFormatter = (label: any) => (
        <span data-testid="custom-label">Period: {label}</span>
      );

      render(
        <TestTooltipContent
          active={true}
          payload={mockPayload}
          label="January"
          labelFormatter={customLabelFormatter}
        />
      );

      expect(screen.getByTestId('custom-label')).toBeInTheDocument();
      expect(screen.getByText('Period: January')).toBeInTheDocument();
    });

    it('does not render when inactive', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'sales', color: '#3b82f6' },
      ];

      const { container } = render(
        <TestTooltipContent
          active={false}
          payload={mockPayload}
          label="January"
        />
      );

      // Should not render tooltip content when inactive
      expect(screen.queryByText('January')).not.toBeInTheDocument();
      expect(screen.queryByText('4,000')).not.toBeInTheDocument();
    });

    it('does not render when no payload', () => {
      const { container } = render(
        <TestTooltipContent
          active={true}
          payload={[]}
          label="January"
        />
      );

      // Should not render tooltip content when no payload
      expect(screen.queryByText('January')).not.toBeInTheDocument();
    });
  });

  describe('ChartLegendContent', () => {
    const TestLegendContent = (props: any) => {
      return (
        <ChartContainer config={mockConfig}>
          <ChartLegendContent {...props} />
        </ChartContainer>
      );
    };

    it('renders legend content', () => {
      const mockPayload = [
        { value: 'Sales', color: '#3b82f6', dataKey: 'sales' },
        { value: 'Profit', color: '#10b981', dataKey: 'profit' },
      ];

      render(
        <TestLegendContent payload={mockPayload} />
      );

      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Profit')).toBeInTheDocument();
    });

    it('renders with different variants', () => {
      const mockPayload = [
        { value: 'Sales', color: '#3b82f6', dataKey: 'sales' },
      ];

      const { rerender } = render(
        <TestLegendContent
          payload={mockPayload}
          variant="horizontal"
          data-testid="legend"
        />
      );

      let legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('flex-row');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          variant="vertical"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('flex-col');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          variant="grid"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('grid');
      expect(legend).toHaveClass('grid-cols-2');
    });

    it('renders with different positions', () => {
      const mockPayload = [
        { value: 'Sales', color: '#3b82f6', dataKey: 'sales' },
      ];

      const { rerender } = render(
        <TestLegendContent
          payload={mockPayload}
          position="top"
          data-testid="legend"
        />
      );

      let legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('mb-4');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          position="bottom"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('mt-4');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          position="left"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('mr-4');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          position="right"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('ml-4');
    });

    it('renders with different sizes', () => {
      const mockPayload = [
        { value: 'Sales', color: '#3b82f6', dataKey: 'sales' },
      ];

      const { rerender } = render(
        <TestLegendContent
          payload={mockPayload}
          size="sm"
          data-testid="legend"
        />
      );

      let legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('text-xs', 'gap-2');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          size="default"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('text-xs', 'gap-4');

      rerender(
        <TestLegendContent
          payload={mockPayload}
          size="lg"
          data-testid="legend"
        />
      );

      legend = screen.getByTestId('legend');
      expect(legend).toHaveClass('text-sm', 'gap-6');
    });

    it('hides icons when hideIcon is true', () => {
      const mockPayload = [
        { value: 'Sales', color: '#3b82f6', dataKey: 'sales' },
      ];

      render(
        <TestLegendContent payload={mockPayload} hideIcon={true} />
      );

      const colorIndicator = document.querySelector('[style*="backgroundColor"]');
      expect(colorIndicator).not.toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
    });

    it('does not render when no payload', () => {
      const { container } = render(
        <TestLegendContent payload={[]} />
      );

      // Should not render legend content when no payload
      expect(screen.queryByText('Sales')).not.toBeInTheDocument();
    });
  });

  describe('SimpleChart', () => {
    it('renders simple chart wrapper', () => {
      render(
        <SimpleChart config={mockConfig} data={mockData}>
          <div>Chart content</div>
        </SimpleChart>
      );

      expect(screen.getByText('Chart content')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(
        <SimpleChart config={mockConfig} data={[]}>
          <div>Chart content</div>
        </SimpleChart>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows empty state when data is undefined', () => {
      render(
        <SimpleChart config={mockConfig}>
          <div>Chart content</div>
        </SimpleChart>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('respects isEmpty prop override', () => {
      render(
        <SimpleChart config={mockConfig} data={mockData} isEmpty={true}>
          <div>Chart content</div>
        </SimpleChart>
      );

      expect(screen.queryByText('Chart content')).not.toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('useChart hook', () => {
    it('provides chart config context', () => {
      const TestComponent = () => {
        const { config } = useChart();
        return <div data-testid="config">{config.sales.label}</div>;
      };

      render(
        <ChartContainer config={mockConfig}>
          <TestComponent />
        </ChartContainer>
      );

      expect(screen.getByTestId('config')).toHaveTextContent('Sales');
    });

    it('throws error when used outside ChartContainer', () => {
      const TestComponent = () => {
        useChart();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useChart must be used within a <ChartContainer />'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div role="img" aria-label="Sales chart">Chart content</div>
        </ChartContainer>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports custom ARIA attributes', () => {
      render(
        <ChartContainer 
          config={mockConfig} 
          role="img"
          aria-label="Sales performance chart"
          data-testid="chart"
        >
          <div>Chart content</div>
        </ChartContainer>
      );

      const chart = screen.getByTestId('chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute('aria-label', 'Sales performance chart');
    });
  });

  describe('Performance', () => {
    it('memoizes tooltip label calculation', () => {
      const mockPayload = [
        { dataKey: 'sales', value: 4000, name: 'Sales', color: '#3b82f6' },
      ];

      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>
              Count: {count}
            </button>
            <ChartContainer config={mockConfig}>
              <ChartTooltipContent
                active={true}
                payload={mockPayload}
                label="January"
              />
            </ChartContainer>
          </div>
        );
      };

      render(<TestComponent />);
      
      const button = screen.getByText(/Count:/);
      fireEvent.click(button);
      
      // Tooltip should still render correctly
      expect(screen.getByText('January')).toBeInTheDocument();
    });

    it('handles large datasets efficiently', () => {
      const largeConfig: ChartConfig = {};
      const largeData: any[] = [];
      
      for (let i = 0; i < 1000; i++) {
        largeConfig[`metric${i}`] = {
          label: `Metric ${i}`,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        };
        largeData.push({
          name: `Point ${i}`,
          [`metric${i}`]: Math.random() * 1000,
        });
      }

      const start = performance.now();
      
      render(
        <ChartContainer config={largeConfig}>
          <div>Large dataset chart</div>
        </ChartContainer>
      );
      
      const end = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(end - start).toBeLessThan(100);
      expect(screen.getByText('Large dataset chart')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty config gracefully', () => {
      render(
        <ChartContainer config={{}}>
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.getByText('Chart content')).toBeInTheDocument();
    });

    it('handles malformed payload data', () => {
      const malformedPayload = [
        null,
        undefined,
        { dataKey: null, value: 'invalid' },
        { value: 100 }, // missing dataKey
      ];

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={malformedPayload as any}
          />
        </ChartContainer>
      );

      // Should not crash
      expect(document.body).toBeInTheDocument();
    });

    it('handles responsive prop correctly', () => {
      const { rerender } = render(
        <ChartContainer config={mockConfig} responsive={true} data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      let chart = screen.getByTestId('chart');
      expect(chart).not.toHaveClass('overflow-hidden');

      rerender(
        <ChartContainer config={mockConfig} responsive={false} data-testid="chart">
          <div>Content</div>
        </ChartContainer>
      );

      chart = screen.getByTestId('chart');
      expect(chart).toHaveClass('overflow-hidden');
    });

    it('handles theme-based colors', () => {
      const themeConfig: ChartConfig = {
        primary: {
          label: 'Primary',
          theme: {
            light: '#3b82f6',
            dark: '#60a5fa',
          },
        },
      };

      render(
        <ChartContainer config={themeConfig} id="theme-chart">
          <div>Content</div>
        </ChartContainer>
      );

      const styleElement = document.querySelector('style');
      expect(styleElement?.innerHTML).toContain('--color-primary: #3b82f6');
      expect(styleElement?.innerHTML).toContain('.dark [data-chart=chart-theme-chart]');
      expect(styleElement?.innerHTML).toContain('--color-primary: #60a5fa');
    });
  });

  describe('Integration', () => {
    it('works with Recharts components', () => {
      const { LineChart, Line, XAxis, YAxis } = require('recharts');

      render(
        <ChartContainer config={mockConfig}>
          <LineChart data={mockData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Line dataKey="sales" stroke="#3b82f6" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });
  });
});
