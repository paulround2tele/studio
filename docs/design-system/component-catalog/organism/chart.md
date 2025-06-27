# Chart

Data visualization components built on Recharts with customizable theming and responsive design.

## Overview

The Chart component provides a comprehensive solution for data visualization with support for multiple chart types, theming, loading states, and responsive design. Built on top of Recharts with enhanced styling and configuration options.

## Import

```typescript
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'

// Import specific chart types from recharts
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
```

## Basic Usage

```tsx
// Define chart configuration
const chartConfig: ChartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile", 
    color: "hsl(var(--chart-2))",
  },
}

// Sample data
const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

// Basic bar chart
<ChartContainer config={chartConfig} className="min-h-[200px]">
  <BarChart data={chartData}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="desktop" fill="var(--color-desktop)" />
    <Bar dataKey="mobile" fill="var(--color-mobile)" />
  </BarChart>
</ChartContainer>
```

## Chart Types

### Line Chart

```tsx
const chartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
}

<ChartContainer config={chartConfig}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
    <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} />
  </LineChart>
</ChartContainer>
```

### Area Chart

```tsx
const chartConfig: ChartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-1))",
  },
}

<ChartContainer config={chartConfig}>
  <AreaChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Area 
      type="monotone" 
      dataKey="visitors" 
      stroke="var(--color-visitors)" 
      fill="var(--color-visitors)" 
      fillOpacity={0.3}
    />
  </AreaChart>
</ChartContainer>
```

### Pie Chart

```tsx
const chartConfig: ChartConfig = {
  chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  firefox: {
    label: "Firefox",
    color: "hsl(var(--chart-3))",
  },
}

<ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
  <PieChart>
    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
    <Pie
      data={data}
      dataKey="visitors"
      nameKey="browser"
      cx="50%"
      cy="50%"
      outerRadius={80}
      fill="var(--color-chrome)"
    />
  </PieChart>
</ChartContainer>
```

## Variants and Styling

### Container Variants

```tsx
// Default minimal container
<ChartContainer variant="default" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Card-style with background
<ChartContainer variant="card" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Elevated with shadow
<ChartContainer variant="elevated" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Outlined border
<ChartContainer variant="outlined" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>
```

### Size Variants

```tsx
// Small chart
<ChartContainer size="sm" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Large chart
<ChartContainer size="lg" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Square aspect ratio
<ChartContainer size="square" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>

// Auto height
<ChartContainer size="auto" config={chartConfig}>
  {/* Chart content */}
</ChartContainer>
```

## States and Loading

### Loading State

```tsx
const [loading, setLoading] = useState(true)

<ChartContainer 
  config={chartConfig}
  loading={loading}
  loadingComponent={<div className="animate-pulse">Loading chart...</div>}
>
  <BarChart data={data}>
    {/* Chart configuration */}
  </BarChart>
</ChartContainer>
```

### Error State

```tsx
const [error, setError] = useState<string | null>(null)

<ChartContainer 
  config={chartConfig}
  error={error}
  errorComponent={<div className="text-red-500">Custom error message</div>}
>
  <BarChart data={data}>
    {/* Chart configuration */}
  </BarChart>
</ChartContainer>
```

### Empty State

```tsx
<ChartContainer 
  config={chartConfig}
  isEmpty={data.length === 0}
  emptyComponent={<div>No data to display</div>}
>
  <BarChart data={data}>
    {/* Chart configuration */}
  </BarChart>
</ChartContainer>
```

## Advanced Examples

### Dashboard Revenue Chart

```tsx
const revenueConfig: ChartConfig = {
  total: {
    label: "Total Revenue",
    color: "hsl(var(--primary))",
  },
  recurring: {
    label: "Recurring",
    color: "hsl(var(--chart-1))",
  },
  oneTime: {
    label: "One-time",
    color: "hsl(var(--chart-2))",
  },
}

const revenueData = [
  { month: "Jan", total: 45000, recurring: 30000, oneTime: 15000 },
  { month: "Feb", total: 52000, recurring: 35000, oneTime: 17000 },
  { month: "Mar", total: 48000, recurring: 32000, oneTime: 16000 },
  { month: "Apr", total: 61000, recurring: 40000, oneTime: 21000 },
  { month: "May", total: 55000, recurring: 38000, oneTime: 17000 },
  { month: "Jun", total: 67000, recurring: 45000, oneTime: 22000 },
]

<Card>
  <CardHeader>
    <CardTitle>Monthly Revenue</CardTitle>
    <CardDescription>Revenue breakdown by type</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer config={revenueConfig} variant="card">
      <AreaChart data={revenueData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
        <ChartTooltip 
          content={<ChartTooltipContent 
            formatter={(value) => [`$${value.toLocaleString()}`, ""]}
          />} 
        />
        <Area
          type="monotone"
          dataKey="recurring"
          stackId="1"
          stroke="var(--color-recurring)"
          fill="var(--color-recurring)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="oneTime"
          stackId="1"
          stroke="var(--color-oneTime)"
          fill="var(--color-oneTime)"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ChartContainer>
  </CardContent>
</Card>
```

### User Analytics Chart

```tsx
const analyticsConfig: ChartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-1))",
  },
  users: {
    label: "Users",
    color: "hsl(var(--chart-2))",
  },
  pageViews: {
    label: "Page Views",
    color: "hsl(var(--chart-3))",
  },
}

<div className="grid gap-4 md:grid-cols-2">
  {/* Sessions over time */}
  <Card>
    <CardHeader>
      <CardTitle>Sessions</CardTitle>
    </CardHeader>
    <CardContent>
      <ChartContainer config={analyticsConfig} size="sm">
        <LineChart data={analyticsData}>
          <XAxis dataKey="date" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line 
            type="monotone" 
            dataKey="sessions" 
            stroke="var(--color-sessions)" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </CardContent>
  </Card>

  {/* User comparison */}
  <Card>
    <CardHeader>
      <CardTitle>Users vs Sessions</CardTitle>
    </CardHeader>
    <CardContent>
      <ChartContainer config={analyticsConfig} size="sm">
        <BarChart data={analyticsData}>
          <XAxis dataKey="date" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="users" fill="var(--color-users)" />
          <Bar dataKey="sessions" fill="var(--color-sessions)" />
        </BarChart>
      </ChartContainer>
    </CardContent>
  </Card>
</div>
```

### Performance Metrics Chart

```tsx
const performanceConfig: ChartConfig = {
  loadTime: {
    label: "Load Time",
    color: "hsl(var(--chart-1))",
    format: (value) => `${value}ms`,
  },
  errorRate: {
    label: "Error Rate",
    color: "hsl(var(--destructive))",
    format: (value) => `${value}%`,
  },
}

<ChartContainer config={performanceConfig} variant="outlined">
  <LineChart data={performanceData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="timestamp" />
    <YAxis yAxisId="left" />
    <YAxis yAxisId="right" orientation="right" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line
      yAxisId="left"
      type="monotone"
      dataKey="loadTime"
      stroke="var(--color-loadTime)"
      strokeWidth={2}
    />
    <Line
      yAxisId="right"
      type="monotone"
      dataKey="errorRate"
      stroke="var(--color-errorRate)"
      strokeWidth={2}
      strokeDasharray="5 5"
    />
  </LineChart>
</ChartContainer>
```

## Chart Configuration

### ChartConfig Interface

```tsx
type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    format?: (value: any) => string;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
}
```

### Theme Support

```tsx
const chartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    theme: {
      light: "hsl(220 70% 50%)",
      dark: "hsl(220 70% 60%)",
    },
  },
  expenses: {
    label: "Expenses", 
    color: "hsl(var(--destructive))",
  },
}
```

## API Reference

### ChartContainer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `ChartConfig` | - | Chart color and label configuration |
| `variant` | `'default' \| 'card' \| 'elevated' \| 'minimal' \| 'outlined'` | `'default'` | Container style |
| `size` | `'default' \| 'sm' \| 'lg' \| 'xl' \| 'square' \| 'auto'` | `'default'` | Container size |
| `loading` | `boolean` | `false` | Show loading state |
| `error` | `string` | - | Error message to display |
| `isEmpty` | `boolean` | `false` | Show empty state |
| `loadingComponent` | `React.ReactNode` | - | Custom loading component |
| `errorComponent` | `React.ReactNode` | - | Custom error component |
| `emptyComponent` | `React.ReactNode` | - | Custom empty component |

### ChartTooltipContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'dark' \| 'light' \| 'accent'` | `'default'` | Tooltip style |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Tooltip size |
| `hideLabel` | `boolean` | `false` | Hide tooltip label |
| `hideIndicator` | `boolean` | `false` | Hide color indicators |
| `indicator` | `'line' \| 'dot' \| 'dashed'` | `'dot'` | Indicator style |
| `formatter` | `function` | - | Value formatter |
| `labelFormatter` | `function` | - | Label formatter |

## Accessibility

- Charts include proper ARIA labels and descriptions
- Color palettes designed for accessibility
- Keyboard navigation support where applicable
- Screen reader friendly data tables as fallbacks
- High contrast support in dark/light themes

## Best Practices

### Do's
- Use consistent color schemes across related charts
- Provide meaningful labels and tooltips
- Include loading and error states
- Make charts responsive for mobile devices
- Use appropriate chart types for data
- Include data tables for accessibility

### Don'ts
- Don't overload charts with too much data
- Don't use misleading scales or axes
- Don't rely solely on color to convey information
- Don't forget to handle empty data states
- Don't make interactive elements too small for touch

## Related Components

- [Card](../molecular/card.md) - Chart containers
- [Table](../molecular/table.md) - Tabular data display
- [Badge](../atomic/badge.md) - Data labels
- [Skeleton](../atomic/skeleton.md) - Loading states
