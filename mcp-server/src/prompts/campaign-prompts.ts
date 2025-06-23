/**
 * Campaign Development Prompts
 * 
 * Specialized prompts for DomainFlow campaign management development.
 * Provides context-aware guidance for campaign-related features.
 */
export async function campaignPrompts(operation: string) {
  const prompts = getCampaignPrompts();
  const selectedPrompt = prompts[operation.toLowerCase()] || prompts.general;

  return {
    description: `Campaign development guidance for: ${operation}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: selectedPrompt,
        },
      },
    ],
  };
}

function getCampaignPrompts(): Record<string, string> {
  return {
    creation: `
# Campaign Creation Development Guide

You are working on DomainFlow's campaign creation functionality. Here's the context you need:

## Campaign Architecture
- **V2 Stateful System**: Uses campaignServiceV2.ts for all operations
- **Campaign Types**: Generation, DNS validation, HTTP keyword validation
- **Sequential Pipeline**: Closed-loop architecture with state management
- **Real-time Updates**: WebSocket integration for live progress

## Key Implementation Points

### 1. Type Safety Requirements
\`\`\`typescript
interface CampaignCreateRequest {
  name: string;
  type: 'generation' | 'dns_validation' | 'http_keyword_validation';
  maxBudget: SafeBigInt;  // Always use SafeBigInt for int64 fields
  config: Record<string, unknown>;  // JSON configuration
  personaId?: UUID;  // Optional persona reference
}
\`\`\`

### 2. Service Integration
- Use \`campaignServiceV2.create()\` method
- Handle optimistic updates with rollback capability
- Integrate WebSocket listeners for real-time status
- Implement proper error handling and user feedback

### 3. Validation Patterns
- Validate all inputs with runtime validators
- Use \`validateSafeBigInt\` for budget fields
- Use \`validateUUID\` for ID references
- Implement form validation with react-hook-form

### 4. State Management
- Update campaign list optimistically
- Listen for WebSocket updates
- Handle race conditions with proper synchronization
- Implement loading states and error boundaries

## API Endpoints
- \`POST /api/v2/campaigns/{type}\` - Create campaign
- \`GET /api/v2/campaigns/{id}\` - Get campaign status
- WebSocket: Listen for \`campaign_created\` and \`campaign_status_update\` events

## Testing Considerations
- Test all campaign types (generation, dns_validation, http_keyword_validation)
- Mock WebSocket events for real-time testing
- Test error scenarios and edge cases
- Verify SafeBigInt handling and validation

Focus on type safety, real-time integration, and robust error handling.
`,

    management: `
# Campaign Management Development Guide

You are working on DomainFlow's campaign management functionality. Here's the context:

## Campaign Lifecycle Management
- **Status Tracking**: pending, running, completed, failed, cancelled
- **Progress Monitoring**: Real-time progress updates via WebSocket
- **State Transitions**: Proper validation of state changes
- **Audit Trail**: Track all campaign modifications

## Key Components

### 1. Campaign List Management
\`\`\`typescript
interface CampaignListState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  filters: CampaignFilters;
  pagination: PaginationState;
}
\`\`\`

### 2. Real-time Updates
- Subscribe to WebSocket events: \`campaign_status_update\`, \`campaign_progress\`
- Update campaign state optimistically
- Handle connection failures gracefully
- Implement reconnection logic

### 3. Campaign Operations
- **Start/Stop**: Control campaign execution
- **Modify**: Update campaign parameters
- **Clone**: Duplicate existing campaigns
- **Export**: Download campaign results

### 4. Performance Considerations
- Implement virtual scrolling for large campaign lists
- Use React Query for caching and background updates
- Debounce search and filter operations
- Lazy load campaign details

## Integration Points
- \`campaignServiceV2\` for all CRUD operations
- \`websocketService\` for real-time updates
- \`WebSocketStatusContext\` for connection management
- Campaign components with proper state management

## Error Handling Patterns
- Network failures: Show retry options
- Validation errors: Highlight specific fields
- Authorization errors: Redirect to login
- Rate limiting: Implement backoff strategy

## UI/UX Guidelines
- Show loading states during operations
- Provide clear feedback for all actions
- Implement optimistic updates with rollback
- Use proper accessibility patterns

Focus on performance, real-time capabilities, and user experience.
`,

    validation: `
# Campaign Validation Development Guide

You are working on DomainFlow's campaign validation functionality. Here's the context:

## Validation Types
- **DNS Validation**: Domain resolution and DNS record verification
- **HTTP Validation**: Web server response and content validation
- **Keyword Validation**: Content analysis and keyword matching

## Validation Architecture

### 1. Validation Pipeline
\`\`\`typescript
interface ValidationConfig {
  timeout: number;           // Request timeout in milliseconds
  retryAttempts: number;     // Number of retry attempts
  userAgent: string;         // Custom user agent string
  followRedirects: boolean;  // Whether to follow HTTP redirects
  keywords: string[];        // Keywords to search for
}
\`\`\`

### 2. Result Processing
- Parse validation results in real-time
- Store intermediate results for debugging
- Generate comprehensive reports
- Handle partial failures gracefully

### 3. Progress Tracking
- Real-time progress updates via WebSocket
- Detailed error reporting for failed validations
- Performance metrics (response times, success rates)
- Batch processing status

## Implementation Guidelines

### 1. Service Integration
- Use validation-specific endpoints
- Handle streaming responses for large datasets
- Implement proper timeout handling
- Cache validation results appropriately

### 2. Error Handling
- Network errors: Retry with exponential backoff
- Timeout errors: Adjust timeout parameters
- DNS errors: Provide specific error messages
- HTTP errors: Parse and display response codes

### 3. Performance Optimization
- Batch validation requests when possible
- Use connection pooling for HTTP validations
- Implement request deduplication
- Monitor resource usage and throttling

## WebSocket Events
- \`validation_started\`: Validation process initiated
- \`validation_progress\`: Progress updates with current status
- \`validation_completed\`: Final results available
- \`validation_error\`: Error occurred during validation

## Testing Strategy
- Mock external DNS/HTTP services
- Test timeout and retry scenarios
- Verify progress tracking accuracy
- Test error recovery mechanisms

Focus on reliability, performance, and detailed progress reporting.
`,

    monitoring: `
# Campaign Monitoring Development Guide

You are working on DomainFlow's campaign monitoring functionality. Here's the context:

## Monitoring Architecture
- **Real-time Dashboard**: Live campaign status and metrics
- **Performance Metrics**: Success rates, response times, error rates
- **Alerting System**: Notifications for critical events
- **Historical Analysis**: Trend analysis and reporting

## Key Monitoring Components

### 1. Dashboard Metrics
\`\`\`typescript
interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;  // Campaigns per hour
}
\`\`\`

### 2. Real-time Updates
- WebSocket integration for live metrics
- Auto-refreshing charts and graphs
- Performance indicator widgets
- System health monitoring

### 3. Alerting Rules
- Campaign failure thresholds
- Performance degradation alerts
- Resource usage warnings
- SLA violation notifications

## Implementation Guidelines

### 1. Data Visualization
- Use Recharts for performance charts
- Implement real-time data streaming
- Create responsive dashboard layouts
- Provide drill-down capabilities

### 2. Performance Tracking
- Track campaign execution times
- Monitor resource utilization
- Measure API response times
- Track WebSocket connection health

### 3. Historical Analysis
- Store metrics for trend analysis
- Generate periodic reports
- Compare campaign performance
- Identify optimization opportunities

## WebSocket Events for Monitoring
- \`metrics_update\`: Real-time metric updates
- \`alert_triggered\`: System alert notifications
- \`performance_threshold\`: Performance warnings
- \`system_status\`: Overall system health

## Monitoring Best Practices
- Use appropriate chart types for different metrics
- Implement proper error boundaries
- Cache historical data appropriately
- Provide export functionality for reports

Focus on real-time visualization, performance insights, and proactive alerting.
`,

    general: `
# General Campaign Development Guide

You are working on DomainFlow's campaign system. Here's the essential context:

## Core Campaign Concepts
- **V2 Architecture**: Stateful campaign management with real-time updates
- **Campaign Types**: Generation, DNS validation, HTTP keyword validation
- **Type Safety**: SafeBigInt for int64 fields, UUID branded types
- **Real-time**: WebSocket integration for live status updates

## Essential Services
- \`campaignServiceV2.ts\`: Main campaign operations
- \`websocketService.ts\`: Real-time communication
- \`WebSocketStatusContext.tsx\`: Connection management

## Key Patterns
1. **Type Safety**: Always use branded types (UUID, SafeBigInt, ISODateString)
2. **Validation**: Runtime validation at all API boundaries
3. **State Management**: Optimistic updates with rollback capability
4. **Error Handling**: Comprehensive error recovery and user feedback
5. **Real-time**: WebSocket integration for live updates

## Development Workflow
1. Define TypeScript interfaces with proper branded types
2. Implement service methods with validation
3. Create React components with proper state management
4. Add WebSocket listeners for real-time updates
5. Implement comprehensive error handling
6. Add tests for all scenarios

## Testing Guidelines
- Test all campaign types and operations
- Mock WebSocket events for real-time features
- Test error scenarios and edge cases
- Verify type safety and validation

Focus on type safety, real-time capabilities, and robust error handling.
`,

    api: `
# Campaign API Development Guide

You are working on DomainFlow's campaign API integration. Here's the context:

## API Architecture
- **Base URL**: \`/api/v2/campaigns/\`
- **Authentication**: Bearer token with session fallback
- **Content Type**: \`application/json\`
- **Error Format**: Standardized error responses

## Key Endpoints

### Campaign Management
\`\`\`
POST /api/v2/campaigns/{type}     - Create campaign
GET  /api/v2/campaigns/{id}       - Get campaign details
PUT  /api/v2/campaigns/{id}       - Update campaign
DELETE /api/v2/campaigns/{id}     - Delete campaign
GET  /api/v2/campaigns            - List campaigns
\`\`\`

### Campaign Operations
\`\`\`
POST /api/v2/campaigns/{id}/start - Start campaign
POST /api/v2/campaigns/{id}/stop  - Stop campaign
POST /api/v2/campaigns/{id}/clone - Clone campaign
GET  /api/v2/campaigns/{id}/results - Get results
\`\`\`

## Request/Response Patterns

### Create Campaign Request
\`\`\`typescript
interface CampaignCreateRequest {
  name: string;
  type: CampaignType;
  maxBudget: SafeBigInt;
  config: Record<string, unknown>;
  personaId?: UUID;
}
\`\`\`

### Campaign Response
\`\`\`typescript
interface CampaignResponse {
  id: UUID;
  name: string;
  status: CampaignStatus;
  progress: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
\`\`\`

## Error Handling
- **400**: Validation errors with field-specific messages
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Campaign not found
- **409**: Campaign state conflict
- **429**: Rate limit exceeded
- **500**: Internal server error

## API Client Usage
\`\`\`typescript
const campaign = await campaignServiceV2.create({
  name: 'Test Campaign',
  type: 'generation',
  maxBudget: SafeBigInt(1000),
  config: { domains: 100 }
});
\`\`\`

## Best Practices
- Always validate request data before sending
- Handle all possible error responses
- Use appropriate HTTP methods
- Implement proper retry logic
- Cache responses when appropriate

Focus on proper error handling, type safety, and consistent API patterns.
`,

    testing: `
# Campaign Testing Development Guide

You are working on testing DomainFlow's campaign functionality. Here's the context:

## Testing Strategy
- **Unit Tests**: Service methods and utility functions
- **Integration Tests**: API endpoints and WebSocket communication
- **Component Tests**: React components with user interactions
- **E2E Tests**: Complete campaign workflows

## Campaign Service Testing

### Unit Test Pattern
\`\`\`typescript
describe('CampaignServiceV2', () => {
  let service: CampaignServiceV2;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    service = new CampaignServiceV2(mockApiClient);
  });

  it('should create campaign with correct data', async () => {
    const campaignData = {
      name: 'Test Campaign',
      type: 'generation' as const,
      maxBudget: SafeBigInt(1000),
      config: { domains: 100 }
    };

    mockApiClient.post.mockResolvedValue({
      data: { id: 'campaign-id', ...campaignData }
    });

    const result = await service.create(campaignData);
    
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/api/v2/campaigns/generation',
      campaignData
    );
    expect(result.id).toBeDefined();
  });
});
\`\`\`

### WebSocket Testing
\`\`\`typescript
it('should handle real-time campaign updates', async () => {
  const messagePromise = new Promise((resolve) => {
    websocketService.subscribe('campaign_status_update', resolve);
  });

  // Trigger campaign update
  await service.start('campaign-id');

  const message = await messagePromise;
  expect(message).toMatchObject({
    type: 'campaign_status_update',
    payload: { id: 'campaign-id', status: 'running' }
  });
});
\`\`\`

## Component Testing

### Campaign Component Test
\`\`\`typescript
describe('CampaignList', () => {
  it('should display campaigns and handle interactions', async () => {
    const mockCampaigns = [
      createMockCampaign({ id: '1', name: 'Campaign 1' }),
      createMockCampaign({ id: '2', name: 'Campaign 2' })
    ];

    render(<CampaignList campaigns={mockCampaigns} />);

    expect(screen.getByText('Campaign 1')).toBeInTheDocument();
    expect(screen.getByText('Campaign 2')).toBeInTheDocument();

    // Test interaction
    fireEvent.click(screen.getByText('Start'));
    await waitFor(() => {
      expect(mockCampaignService.start).toHaveBeenCalled();
    });
  });
});
\`\`\`

## Integration Testing
- Test API endpoints with real HTTP calls
- Test WebSocket message handling
- Test database interactions
- Test error scenarios and recovery

## E2E Testing
- Test complete campaign creation workflow
- Test real-time updates in UI
- Test error handling and recovery
- Test cross-browser compatibility

## Testing Best Practices
1. Use descriptive test names
2. Test both success and error cases
3. Mock external dependencies appropriately
4. Test real-time features with proper async handling
5. Verify type safety and validation

Focus on comprehensive coverage of campaign functionality and real-time features.
`
  };
}