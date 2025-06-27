# Data Visualization Patterns

Integrated patterns for displaying and interacting with data through charts, tables, and forms.

## Overview

Data visualization patterns combine Chart, Table, and Form components to create comprehensive data exploration and manipulation interfaces. These patterns enable users to view, analyze, filter, and edit data effectively.

## Core Components Integration

- **Chart**: Visual data representation
- **Table**: Detailed data display
- **Form**: Data filtering and editing
- **Card**: Container organization
- **Button**: Actions and controls

## Basic Data Dashboard Pattern

```tsx
const DataDashboard = ({ data, onDataChange }: DataDashboardProps) => {
  const [filteredData, setFilteredData] = useState(data)
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField>
                <Label>Metric</Label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                </Select>
              </FormField>
              
              <FormField>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </FormField>
              
              <FormField>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </FormField>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Chart Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={filteredData}>
                <XAxis dataKey="date" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey={selectedMetric} stroke="var(--color-primary)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={filteredData}>
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey={selectedMetric} fill="var(--color-primary)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>{selectedMetric}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row[selectedMetric]}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Analytics Dashboard Pattern

```tsx
const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [comparison, setComparison] = useState(false)

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiMetrics.map((metric) => (
          <Card key={metric.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className={cn(
                  "flex items-center",
                  metric.change > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metric.change > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(metric.change)}%
                </span>
                <span className="text-muted-foreground ml-1">vs last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={comparison}
                  onCheckedChange={setComparison}
                />
                <Label>Compare periods</Label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <AreaChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="sessions"
                stackId="1"
                stroke="var(--color-sessions)"
                fill="var(--color-sessions)"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                stackId="1"
                stroke="var(--color-pageviews)"
                fill="var(--color-pageviews)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.map((page) => (
                  <TableRow key={page.path}>
                    <TableCell className="font-medium">{page.path}</TableCell>
                    <TableCell>{page.views.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={page.change > 0 ? "default" : "destructive"}>
                        {page.change > 0 ? "+" : ""}{page.change}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={deviceConfig} className="h-64">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={deviceData}
                  dataKey="value"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-desktop)"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Financial Data Pattern

```tsx
const FinancialDashboard = () => {
  const [portfolio, setPortfolio] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [watchlist, setWatchlist] = useState([])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Portfolio Overview */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={portfolioConfig} className="h-64">
              <LineChart data={portfolioData}>
                <XAxis dataKey="date" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-portfolio)"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell className="font-medium">{holding.symbol}</TableCell>
                    <TableCell>{holding.shares}</TableCell>
                    <TableCell>${holding.currentPrice}</TableCell>
                    <TableCell>${holding.marketValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={holding.pnl > 0 ? "default" : "destructive"}>
                        {holding.pnl > 0 ? "+" : ""}${holding.pnl.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Buy</Button>
                        <Button variant="outline" size="sm">Sell</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <Form>
              <div className="space-y-4">
                <FormField>
                  <Label>Symbol</Label>
                  <Input placeholder="AAPL" />
                </FormField>
                
                <FormField>
                  <Label>Action</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Buy/Sell" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                
                <FormField>
                  <Label>Quantity</Label>
                  <Input type="number" placeholder="0" />
                </FormField>
                
                <Button className="w-full">Execute Trade</Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {watchlist.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <p className="font-medium">{stock.symbol}</p>
                    <p className="text-sm text-muted-foreground">${stock.price}</p>
                  </div>
                  <Badge variant={stock.change > 0 ? "default" : "destructive"}>
                    {stock.change > 0 ? "+" : ""}{stock.change.toFixed(2)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## E-commerce Analytics Pattern

```tsx
const EcommerceAnalytics = () => {
  const [timeframe, setTimeframe] = useState('30d')
  const [selectedProducts, setSelectedProducts] = useState([])

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">$45,231</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">3.2%</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">$36.70</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart & Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesConfig} className="h-64">
              <AreaChart data={salesData}>
                <XAxis dataKey="date" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  fill="var(--color-sales)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sales}</TableCell>
                    <TableCell>${product.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">New vs Returning</h4>
              <ChartContainer config={customerConfig} className="h-48">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={customerData}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="var(--color-new)"
                  />
                </PieChart>
              </ChartContainer>
            </div>
            
            <div className="lg:col-span-2">
              <h4 className="font-medium mb-2">Purchase Behavior</h4>
              <ChartContainer config={behaviorConfig} className="h-48">
                <BarChart data={behaviorData}>
                  <XAxis dataKey="segment" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="var(--color-orders)" />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Best Practices

### Do's
- Combine multiple visualization types for comprehensive insights
- Provide filtering and drill-down capabilities
- Use consistent color schemes across related charts
- Include data export functionality
- Implement responsive layouts for mobile devices
- Show loading states during data fetching

### Don'ts
- Don't overwhelm users with too many charts at once
- Don't use misleading scales or chart types
- Don't forget to handle empty or error states
- Don't make charts purely decorative without insights
- Don't ignore accessibility in data visualization

## Accessibility Considerations

- Provide alternative text descriptions for charts
- Use high contrast colors for better visibility
- Include data tables as fallbacks for screen readers
- Ensure keyboard navigation works for interactive elements
- Use patterns or shapes in addition to colors for differentiation

## Related Components

- [Chart](../organism/chart.md) - Data visualization
- [Table](../molecular/table.md) - Tabular data display
- [Form](../organism/form.md) - Data filtering and input
- [Card](../molecular/card.md) - Content organization
- [Button](../atomic/button.md) - Actions and controls
