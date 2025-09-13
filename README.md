# DomainFlow Studio

A sophisticated full-stack application for intelligent domain generation, validation, and lead extraction campaigns. Built with Next.js frontend and Go backend, featuring real-time Server-Sent Events (SSE) communications, multi-phase campaign orchestration, and advanced domain status tracking.

## 🏗️ Architecture Overview

### Frontend (Next.js 15 + TypeScript)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type safety
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **State Management**: Redux Toolkit (RTK) with RTK Query for API state
- **API Client**: Auto-generated from OpenAPI specification with RTK Query integration
- **Real-time**: Server-Sent Events (SSE) integration for live campaign updates
- **Architecture**: Unified RTK Query pattern with centralized API state management

### Backend (Go + PostgreSQL)
- **Language**: Go with Chi web framework (strict OpenAPI via oapi-codegen)
- **Database**: PostgreSQL with migration system
- **API**: Strict REST API with OpenAPI 3.1 specification and request/response validation
- **Real-time**: Server-Sent Events (SSE) endpoints for campaign broadcasting
- **Architecture**: Clean architecture with service layers
- **Validation**: DNS validation, HTTP keyword scanning, lead extraction

## 🚀 Key Features

### Multi-Phase Campaign System
```
Domain Generation → DNS Validation → HTTP Keyword Validation → Lead Extraction
     (0-33%)           (33-66%)           (66-100%)            (Analysis)
```

### Domain Status Architecture
- **Individual Domain Tracking**: Each domain has `dns_status`, `http_status`, and `lead_score`
- **Real-time Updates**: Server-Sent Events (SSE) stream for status changes
- **Cumulative Progress**: Multi-phase progress tracking across campaign lifecycle
- **Status Persistence**: Database-backed status updates with audit trail

### Advanced Features
- **Personas**: Configurable DNS and HTTP validation profiles
- **Proxy Management**: Rotation and health monitoring
- **Keyword Sets**: Intelligent content scanning and lead extraction
- **Real-time Dashboard**: Live campaign monitoring and statistics
- **Bulk Operations**: Efficient batch processing with streaming responses

## 📊 Domain Status System

### Status Enums
```go
type DomainStatus string

const (
    StatusPending  DomainStatus = "pending"
    StatusOK       DomainStatus = "ok"
    StatusError    DomainStatus = "error"
    StatusTimeout  DomainStatus = "timeout"
)
```

### Data Flow
```
GeneratedDomain {
    ID           string
    DomainName   string
    DNSStatus    DomainStatus
    HTTPStatus   DomainStatus
    LeadScore    float64
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

### Frontend Compatibility Layer
```typescript
// Helper functions for backward compatibility
getCampaignDomains(campaign): string[]
getCampaignDnsValidatedDomains(campaign): string[]
getCampaignHTTPKeywordValidatedDomains(campaign): string[]
getCampaignLeads(campaign): CampaignLead[]
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern React component library
- **Redux Toolkit (RTK)**: Predictable state container with RTK Query
- **RTK Query**: Data fetching and caching solution
- **React Hook Form**: Form validation and management
- **Zod**: Runtime type validation
- **Lucide React**: Icon library

### Backend
- **Go 1.22+**: Backend language
- **Chi**: HTTP web framework (strict OpenAPI via oapi-codegen)
- **PostgreSQL**: Primary database
- **GORM**: ORM for database operations
- **golang-migrate**: Database migration tool
- **Server-Sent Events (SSE)**: Real-time streaming endpoints
- **oapi-codegen**: Strict server generation and request/response validation

### Development Tools
- **OpenAPI Generator**: Auto-generated API clients
- **Air**: Hot reload for Go development
- **ESLint + Prettier**: Code formatting and linting
- **Jest**: Testing framework
- **Playwright**: E2E testing

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Go** 1.22+
- **PostgreSQL** 14+
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd domainflow-studio
```

2. **Setup Backend**
```bash
cd backend
cp config.template.json config.json
# Edit config.json with your database credentials
go mod download
```

3. **Setup Database**
```bash
# Create database
createdb domainflow

# Run migrations
go run cmd/migrate/main.go up
```

4. **Setup Frontend**
```bash
cd ../
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
```

5. **Generate API Client**
```bash
npm run gen:all
```

### Development

**Start Backend**
```bash
cd backend
air
# Backend runs on http://localhost:8080
```

**Start Frontend**
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### E2E Smoke Test

With the backend running on :8080, validate core flows with:

```bash
scripts/smoke-e2e-campaign.sh
```

Environment overrides:

- `BASE_URL` (default http://localhost:8080/api/v2)
- `USER_EMAIL` (default test@example.com)
- `USER_PASSWORD` (default password)

### Production Build

**Backend**
```bash
cd backend
go build -o apiserver cmd/apiserver/main.go
./apiserver
```

**Frontend**
```bash
npm run build
npm start
```

## 📁 Project Structure

```
domainflow-studio/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # React components
│   │   │   ├── campaigns/       # Campaign-related components
│   │   │   ├── dashboard/       # Dashboard components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── shared/         # Shared components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and configurations
│   │   │   ├── api-client/     # Auto-generated API client
│   │   │   ├── services/       # Business logic services
│   │   │   └── utils/          # Helper functions
│   │   ├── store/              # Redux Toolkit store configuration
│   │   │   ├── api/            # RTK Query API endpoints
│   │   │   ├── slices/         # Redux slices for app state
│   │   │   └── index.ts        # Store configuration
│   │   ├── providers/          # React context providers
│   │   └── types/              # TypeScript type definitions
│   │   │   └── utils/          # Helper functions
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets
│   └── package.json
├── backend/
│   ├── cmd/                    # Entry points and CLI tools
│   ├── internal/
│   │   ├── api/               # HTTP handlers and routes
│   │   ├── services/          # Business logic
│   │   ├── store/             # Database access layer
│   │   ├── models/            # Data models
│   │   ├── sse/               # Server-Sent Events handlers
│   │   └── config/            # Configuration management
│   ├── database/
│   │   ├── migrations/        # Database migrations
│   │   └── seeds/            # Database seed data
│   ├── docs/                 # OpenAPI specification
│   └── go.mod
└── scripts/                  # Build and deployment scripts
```

## 🔌 API Documentation

## 🔄 Unified Pipeline Orchestration
The campaign execution pipeline auto-advances through ordered phases when launched in full sequence mode:

```
Domain Generation → DNS Validation → HTTP Keyword Validation → Analysis
```

### Execution Model (Strict Model A)
- All required configurations (personas, proxies, keyword set, etc.) must be present before the initial start.
- Missing configuration produces an HTTP 409 on start (no mid-chain blocking events).
- Orchestrator emits structured Server-Sent Events (SSE) at each transition.

### SSE Event Taxonomy
| Event | Meaning |
|-------|---------|
| `phase_started` | User-initiated phase start. |
| `phase_auto_started` | Auto chain advanced to next phase. |
| `phase_failed` | Phase terminated with failure; auto-advance pauses. |
| `phase_completed` | Phase finished successfully. |
| `campaign_progress` | Incremental progress update (percentage + phase context). |
| `campaign_completed` | Final phase completed; campaign terminal. |
| `mode_changed` | Execution mode toggled (step_by_step ↔ full_sequence). |

### Retry Semantics
When a phase fails:
1. UI derives `retryEligiblePhases` from last failed phase onward.
2. User triggers a retry; orchestrator restarts the failed phase.
3. On success, auto-advance resumes for remaining phases.

### Metrics Collected
- `phaseStarts`, `phaseAutoStarts`, `phaseFailures`, `phaseCompletions`, `campaignCompletions`, and per-phase duration metrics.

#### HTTP Validation & Micro-Crawl ROI Metrics
The HTTP keyword validation phase exposes Prometheus metrics to evaluate performance and ROI of the adaptive micro-crawl subsystem.

Core fetch & phase metrics:
- `http_validation_fetch_outcomes_total{status=ok|error|timeout}` – Root page fetch outcomes
- `http_fetch_result_total{status=...}` – Alias of above for legacy dashboards
- `http_validation_batch_seconds` – Duration per bulk validator batch
- `http_validation_phase_seconds` / `campaign_phase_duration_seconds{phase="http_validation"}` – Phase durations

Micro-crawl operational metrics:
- `http_validation_microcrawl_triggers_total` – (legacy) raw trigger count
- `microcrawl_trigger_total{reason=...}` – Triggers partitioned by reason (e.g. `low_kw_and_not_parked`)
- `http_microcrawl_pages_total{result=partial|exhausted}` – Secondary pages fetched aggregated by exhaustion state
- `http_microcrawl_pages_per_domain` – Histogram of pages examined per trigger

Micro-crawl ROI / effectiveness metrics:
- `http_microcrawl_successes_total` – Triggers that yielded one or more new unique keywords
- `http_microcrawl_zero_success_total` – Triggers that fetched pages but produced zero new keywords (denominator for success rate)
- `http_microcrawl_added_keywords_total` – Total new unique keywords contributed (sum)
- `http_microcrawl_new_patterns_total` – Alias of added keywords (reserved for future pattern normalization divergence)
- `http_microcrawl_kw_growth_ratio` – Histogram of post/baseline keyword unique growth (baseline > 0)

Derived suggestion examples (not exported as metrics):
- Success Rate = successes_total / (successes_total + zero_success_total)
- Avg Added Keywords per Success = added_keywords_total / successes_total

Micro-crawl diminishing returns heuristic flags `feature_vector.diminishing_returns` when pages >=2 and growth ratio <1.15 (or baseline=0 and added <2). This can be combined with `kw_growth_ratio` histogram to tune future early-stop strategies.

### Frontend Selector Guarantees
- Derived overview always supplies ordered phases with status & (when available) `durationMs`.
- `nextUserAction` indicates the highest-priority user intervention (start, retry, or none).
- Failure → retry path covered by dedicated unit tests ensuring correctness after each transition.

Refer to `PIPELINE_CHANGELOG.md` for historical evolution and removal of legacy `chain_blocked` semantics.

### RTK Query Architecture

The frontend uses **Redux Toolkit Query (RTK Query)** for unified API state management, providing:

- **Centralized API State**: All server data managed through RTK Query
- **Automatic Caching**: Intelligent request deduplication and caching
- **Background Refetching**: Automatic data synchronization
- **Optimistic Updates**: Immediate UI updates with automatic rollback on errors
- **Unified Error Handling**: Consistent error states across all API calls

#### Unified API Response Structure

All backend endpoints return a standardized `APIResponse` wrapper:

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: ErrorInfo;
  requestId: string;
}
```

**RTK Query Integration Example:**
```typescript
// RTK Query endpoint with APIResponse handling
getCampaignsStandalone: builder.query<Campaign[], void>({
  queryFn: async () => {
    const response = await fetch('/api/v2/campaigns/standalone');
    const apiResponse = response.data as APIResponse;
    
    if (apiResponse.success && apiResponse.data) {
      return { data: apiResponse.data };
    }
    
    return { 
      error: apiResponse.error || { message: 'Failed to fetch campaigns' }
    };
  },
  providesTags: ['Campaign']
})
```

#### API Store Structure

```typescript
// Store configuration with RTK Query APIs
src/store/
├── api/
│   ├── campaignApi.ts        # Campaign CRUD operations
│   ├── bulkOperationsApi.ts  # Bulk operation endpoints
│   └── baseApi.ts           # Base API configuration
├── slices/
│   ├── campaignSlice.ts      # Campaign UI state
│   ├── bulkOperationsSlice.ts # Bulk operations tracking
│   └── authSlice.ts         # Authentication state
└── index.ts                 # Store configuration
```

#### RTK Query Hooks Pattern

```typescript
// Component usage with RTK Query hooks
const CampaignsList = () => {
  const { 
    data: campaigns, 
    isLoading, 
    error, 
    refetch 
  } = useGetCampaignsStandaloneQuery();

  const [startCampaign] = useStartCampaignMutation();

  const handleStart = async (campaignId: string) => {
    try {
      await startCampaign({ campaignId }).unwrap();
      // Automatic cache invalidation triggers refetch
    } catch (error) {
      // Unified error handling through RTK Query
    }
  };

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorDisplay error={error} />}
      {campaigns?.map(campaign => (
        <CampaignCard 
          key={campaign.id} 
          campaign={campaign}
          onStart={() => handleStart(campaign.id)}
        />
      ))}
    </div>
  );
};
```

### Core Endpoints

#### Campaigns
```http
GET    /api/v2/campaigns                    # List campaigns
POST   /api/v2/campaigns                    # Create campaign
GET    /api/v2/campaigns/{id}               # Get campaign details
PUT    /api/v2/campaigns/{id}               # Update campaign
DELETE /api/v2/campaigns/{id}               # Delete campaign
```

#### Domain Operations
```http
POST   /api/v2/campaigns/{id}/start         # Start campaign
POST   /api/v2/campaigns/{id}/dns           # Start DNS validation
POST   /api/v2/campaigns/{id}/http          # Start HTTP validation
GET    /api/v2/campaigns/{id}/domains       # Get domain list
GET    /api/v2/campaigns/{id}/leads         # Get extracted leads
```

#### Real-time SSE
```http
GET    /api/v2/sse/events                   # All-system events stream
GET    /api/v2/sse/campaigns/{id}/events    # Campaign-scoped events stream
GET    /api/v2/sse/events/stats             # Stream stats snapshot
```

Events are streamed as `text/event-stream` with `data:` JSON payloads per line.

### Authentication
```http
POST   /api/v2/auth/login                   # User login
POST   /api/v2/auth/logout                  # User logout
GET    /api/v2/auth/me                      # Current user info
POST   /api/v2/auth/change-password         # Change password
```

### Resource Management
```http
GET    /api/v2/personas                     # List personas
GET    /api/v2/proxies                      # List proxies  
GET    /api/v2/keyword-sets                 # List keyword sets
```

## 🗃️ Database Schema

### Core Tables

**campaigns**
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    current_phase VARCHAR NOT NULL,
    phase_status VARCHAR NOT NULL,
    progress_percentage FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**generated_domains**
```sql
CREATE TABLE generated_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    domain_name VARCHAR NOT NULL,
    dns_status domain_status_enum DEFAULT 'pending',
    http_status domain_status_enum DEFAULT 'pending', 
    lead_score FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**domain_status_enum**
```sql
CREATE TYPE domain_status_enum AS ENUM (
    'pending',
    'ok', 
    'error',
    'timeout'
);
```

## 🔧 Development Guidelines

### Code Generation
```bash
# Regenerate API client after backend changes
npm run gen:all

# Individual commands
npm run gen:openapi     # Generate OpenAPI spec
npm run gen:types       # Generate TypeScript types
npm run gen:clients     # Generate API clients
npm run gen:docs        # Generate documentation
```

### Database Migrations
```bash
# Create new migration
cd backend
go run cmd/migrate/main.go create migration_name

# Run migrations
go run cmd/migrate/main.go up

# Rollback migrations  
go run cmd/migrate/main.go down
```

### Testing
```bash
# Frontend tests
npm test
npm run test:e2e

# Backend tests
cd backend
go test ./...
```

### Type Safety
- Always regenerate API client after backend schema changes
- Use RTK Query hooks for all API interactions to maintain cache consistency
- Implement proper error boundaries for React components
- Validate WebSocket message types with Zod schemas
- Ensure all API endpoints respect the unified `APIResponse` wrapper structure

### RTK Query Best Practices
- Use `providesTags` and `invalidatesTags` for automatic cache management
- Implement optimistic updates for better user experience
- Leverage RTK Query's automatic request deduplication
- Use `queryFn` for complex API response transformations
- Implement proper error handling with unified error states

### Real-time Features
- Use Server-Sent Events (SSE) streams for campaign progress updates
- Implement retry/backoff on event stream disconnects
- Reflect connection state in Redux slices alongside RTK Query cache
- Debounce frequent updates to prevent UI thrashing
- Integrate SSE updates with RTK Query cache invalidation

## 🚨 Common Issues

### Domain Status Not Updating
1. Check SSE stream connection status
2. Verify backend emits events for target campaign
3. Ensure frontend helper functions handle new domain/event format
4. Check database status field updates

### API Type Mismatches
1. Regenerate API client: `npm run gen:all`
2. Check OpenAPI specification is up to date
3. Verify backend response models match frontend expectations

### Build Failures
1. Run TypeScript check: `npm run typecheck`
2. Check for missing dependencies: `npm install`
3. Verify environment variables are set correctly

## 📈 Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement virtual scrolling for large domain lists
- Debounce search and filter operations
- Leverage RTK Query's built-in caching and request deduplication
- Use RTK Query's `keepUnusedDataFor` option for optimal cache retention
- Implement proper loading states with RTK Query's `isLoading` and `isFetching` flags

### Backend
- Database connection pooling
- Efficient bulk operations for domain processing
- SSE connection management
- Response caching for static data

## 🔒 Security

### Authentication
- JWT-based authentication
- Session management with secure cookies
- Password hashing with bcrypt
- CSRF protection

### Data Protection
- SQL injection prevention with parameterized queries
- Input validation on all endpoints
- Rate limiting on API endpoints
- Enforce credentialed CORS and CSRF sentinel headers for sensitive endpoints

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please refer to the project documentation or create an issue in the repository.

## 🏆 Contributors

### Architecture & System Design
- **Bertram Gilfoyle** - Phase 4 Service Layer Reorganization & Stealth Integration Architecture
  - Migrated 7,000+ lines of legacy monolithic services to clean domain service architecture
  - Integrated critical stealth detection avoidance capabilities with validation phases
  - Designed orchestrator pattern coordinating DNS/HTTP validation engines
  - Preserved business-critical global offset tracking while enabling stealth randomization

### Frontend State Management Consolidation
- **Bertram Gilfoyle** - RTK Query Implementation & API Architecture Unification
  - Eliminated 3 competing frontend patterns (RTK Query, Direct API, Hook Abstractions)
  - Implemented unified `APIResponse` wrapper compliance across all frontend endpoints
  - Consolidated campaign and bulk operations state management into centralized RTK Query APIs
  - Designed enterprise-scale bulk operation request structures matching backend contracts
  - Established type-safe API client integration with automatic cache invalidation patterns

---

**Built with ❤️ by the DomainFlow Team**