# DomainFlow V3.0 Developer Guide

## Overview

DomainFlow V3.0 is a production-ready domain intelligence platform built with a modern tech stack. This guide provides comprehensive information for developers working on the platform.

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: Custom components with shadcn/ui
- **State Management**: React Context + Zustand for complex state
- **Styling**: Tailwind CSS with custom design system
- **API Client**: Type-safe OpenAPI-generated client
- **Real-time**: WebSocket integration for live updates

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin web framework
- **Database**: PostgreSQL with pgx driver
- **Authentication**: Session-based with secure cookies
- **API**: OpenAPI 3.0 specification
- **Background Jobs**: Worker pool architecture
- **Real-time**: WebSocket broadcasting

## Project Structure

```
domainflow/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # React components
│   │   │   ├── campaigns/       # Campaign-related components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── ...
│   │   ├── lib/                # Utilities and services
│   │   │   ├── api-client/     # Generated API client
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── types/          # TypeScript definitions
│   │   └── contexts/           # React context providers
│   ├── public/                 # Static assets
│   └── package.json
├── backend/
│   ├── cmd/                    # Application entry points
│   │   └── apiserver/          # Main API server
│   ├── internal/               # Internal packages
│   │   ├── api/               # HTTP handlers
│   │   ├── services/          # Business logic
│   │   ├── store/             # Data access layer
│   │   ├── models/            # Data models
│   │   └── middleware/        # HTTP middleware
│   ├── api/                   # OpenAPI specifications
│   ├── database/              # Database migrations
│   └── go.mod
└── docs/                      # Documentation
```

## Development Setup

### Prerequisites

- **Node.js**: 18.0+ (LTS recommended)
- **Go**: 1.21+
- **PostgreSQL**: 15+
- **Git**: Latest version

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd domainflow
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL:**
   ```bash
   # Using Docker
   docker run --name domainflow-postgres \
     -e POSTGRES_DB=domainflow \
     -e POSTGRES_USER=domainflow \
     -e POSTGRES_PASSWORD=your_password \
     -p 5432:5432 -d postgres:15-alpine
   ```

### Backend Development

1. **Install dependencies:**
   ```bash
   cd backend
   go mod download
   ```

2. **Run database migrations:**
   ```bash
   go run cmd/migrate/main.go
   ```

3. **Start the backend server:**
   ```bash
   go run cmd/apiserver/main.go
   ```

   The backend will be available at `http://localhost:8080`

### Frontend Development

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Generate API client:**
   ```bash
   npm run generate-api-client
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## Development Workflow

### Code Organization

#### Frontend Components

**Component Structure:**
```typescript
// src/components/campaigns/CampaignCard.tsx
interface CampaignCardProps {
  campaign: Campaign;
  onAction: (action: string) => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onAction
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{campaign.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
};
```

**Custom Hooks:**
```typescript
// src/lib/hooks/useCampaignData.ts
export const useCampaignData = (campaignId: string) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch campaign data
  }, [campaignId]);
  
  return { campaign, loading };
};
```

#### Backend Services

**Service Pattern:**
```go
// internal/services/campaign_service.go
type CampaignService interface {
    CreateCampaign(ctx context.Context, req CreateCampaignRequest) (*Campaign, error)
    GetCampaign(ctx context.Context, id uuid.UUID) (*Campaign, error)
    StartCampaign(ctx context.Context, id uuid.UUID) error
}

type campaignService struct {
    store CampaignStore
    logger *slog.Logger
}

func (s *campaignService) CreateCampaign(ctx context.Context, req CreateCampaignRequest) (*Campaign, error) {
    // Implementation
}
```

**API Handlers:**
```go
// internal/api/campaign_handlers.go
func (h *CampaignHandler) CreateCampaign(c *gin.Context) {
    var req CreateCampaignRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    campaign, err := h.service.CreateCampaign(c.Request.Context(), req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, campaign)
}
```

### API Development

#### OpenAPI Specification

All APIs are defined using OpenAPI 3.0 specifications:

```yaml
# api/campaigns/spec.go
paths:
  /campaigns:
    post:
      summary: Create a new campaign
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateCampaignRequest'
      responses:
        '201':
          description: Campaign created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Campaign'
```

#### Type Safety

**Generated Types:**
```typescript
// Generated from OpenAPI spec
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  campaignType: CampaignType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  campaignType: CampaignType;
  // Additional fields based on campaign type
}
```

### Database Development

#### Migrations

**Migration Structure:**
```sql
-- database/migrations/001_create_campaigns.up.sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    campaign_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);
```

#### Data Access

**Store Pattern:**
```go
// internal/store/campaign_store.go
type CampaignStore interface {
    Create(ctx context.Context, campaign *Campaign) error
    GetByID(ctx context.Context, id uuid.UUID) (*Campaign, error)
    Update(ctx context.Context, campaign *Campaign) error
    List(ctx context.Context, filter ListFilter) ([]*Campaign, error)
}

type postgresqlCampaignStore struct {
    db *sqlx.DB
}

func (s *postgresqlCampaignStore) Create(ctx context.Context, campaign *Campaign) error {
    query := `
        INSERT INTO campaigns (name, status, campaign_type)
        VALUES ($1, $2, $3)
        RETURNING id, created_at, updated_at`
    
    return s.db.QueryRowxContext(ctx, query,
        campaign.Name,
        campaign.Status,
        campaign.CampaignType,
    ).StructScan(campaign)
}
```

## Testing

### Frontend Testing

**Component Tests:**
```typescript
// src/components/__tests__/CampaignCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CampaignCard } from '../CampaignCard';

describe('CampaignCard', () => {
  it('renders campaign information', () => {
    const campaign = {
      id: '1',
      name: 'Test Campaign',
      status: 'running'
    };
    
    render(<CampaignCard campaign={campaign} onAction={jest.fn()} />);
    
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });
});
```

**Hook Tests:**
```typescript
// src/lib/hooks/__tests__/useCampaignData.test.ts
import { renderHook } from '@testing-library/react';
import { useCampaignData } from '../useCampaignData';

describe('useCampaignData', () => {
  it('fetches campaign data', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignData('campaign-id')
    );
    
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.campaign).toBeDefined();
  });
});
```

### Backend Testing

**Service Tests:**
```go
// internal/services/campaign_service_test.go
func TestCampaignService_CreateCampaign(t *testing.T) {
    store := &mockCampaignStore{}
    service := NewCampaignService(store, slog.Default())
    
    req := CreateCampaignRequest{
        Name: "Test Campaign",
        CampaignType: "domain_generation",
    }
    
    campaign, err := service.CreateCampaign(context.Background(), req)
    
    assert.NoError(t, err)
    assert.Equal(t, "Test Campaign", campaign.Name)
    assert.Equal(t, "draft", campaign.Status)
}
```

**Integration Tests:**
```go
// internal/api/campaign_handlers_test.go
func TestCampaignHandlers_CreateCampaign(t *testing.T) {
    router := setupTestRouter()
    
    body := `{"name": "Test Campaign", "campaignType": "domain_generation"}`
    req, _ := http.NewRequest("POST", "/api/v2/campaigns", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)
    
    assert.Equal(t, http.StatusCreated, w.Code)
    
    var campaign Campaign
    err := json.Unmarshal(w.Body.Bytes(), &campaign)
    assert.NoError(t, err)
    assert.Equal(t, "Test Campaign", campaign.Name)
}
```

## Debugging

### Frontend Debugging

**Browser DevTools:**
- Use React Developer Tools for component inspection
- Check Network tab for API requests
- Use Console for logging and debugging

**Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_API_DEBUG=true
```

**Logging:**
```typescript
// src/lib/utils/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

### Backend Debugging

**Structured Logging:**
```go
// internal/logging/logger.go
func NewLogger() *slog.Logger {
    return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))
}

// Usage in services
logger.Info("Creating campaign",
    slog.String("name", req.Name),
    slog.String("type", req.CampaignType),
)
```

**Debugging Tools:**
- Use Delve debugger for Go: `dlv debug cmd/apiserver/main.go`
- Database query logging with pgx
- HTTP request/response logging middleware

## Performance

### Frontend Optimization

**Code Splitting:**
```typescript
// Dynamic imports for large components
const CampaignDetails = dynamic(() => import('./CampaignDetails'), {
  loading: () => <LoadingSpinner />
});
```

**Memoization:**
```typescript
// Expensive computations
const processedData = useMemo(() => {
  return expensiveDataProcessing(rawData);
}, [rawData]);

// Component memoization
export const CampaignCard = React.memo<CampaignCardProps>(({ campaign }) => {
  // Component implementation
});
```

### Backend Optimization

**Database Optimization:**
```go
// Connection pooling
config := pgxpool.Config{
    MaxConns: 30,
    MinConns: 5,
    MaxConnLifetime: time.Hour,
    MaxConnIdleTime: time.Minute * 30,
}

// Query optimization
query := `
    SELECT c.*, COUNT(d.id) as domain_count
    FROM campaigns c
    LEFT JOIN domains d ON c.id = d.campaign_id
    WHERE c.status = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3`
```

**Caching Strategy:**
```go
// Redis caching for frequently accessed data
func (s *campaignService) GetCampaign(ctx context.Context, id uuid.UUID) (*Campaign, error) {
    // Check cache first
    cached, err := s.cache.Get(ctx, "campaign:"+id.String())
    if err == nil {
        var campaign Campaign
        json.Unmarshal(cached, &campaign)
        return &campaign, nil
    }
    
    // Fetch from database
    campaign, err := s.store.GetByID(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    data, _ := json.Marshal(campaign)
    s.cache.Set(ctx, "campaign:"+id.String(), data, time.Hour)
    
    return campaign, nil
}
```

## Security

### Authentication

**Session Management:**
```go
// Secure session configuration
sessions.Config{
    CookieName:     "domainflow_session",
    CookieHTTPOnly: true,
    CookieSecure:   true,
    CookieSameSite: http.SameSiteStrictMode,
    CookieMaxAge:   24 * time.Hour,
}
```

### Input Validation

**Request Validation:**
```go
// Struct tags for validation
type CreateCampaignRequest struct {
    Name         string `json:"name" validate:"required,min=1,max=255"`
    CampaignType string `json:"campaignType" validate:"required,oneof=domain_generation dns_validation http_keyword_validation"`
}

// Middleware validation
func validateRequest(v *validator.Validate) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Validation logic
    }
}
```

### Data Protection

**Sensitive Data Handling:**
```go
// Environment variable protection
func getRequiredEnv(key string) string {
    value := os.Getenv(key)
    if value == "" {
        log.Fatalf("Required environment variable %s is not set", key)
    }
    return value
}

// Password hashing
func hashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}
```

## Deployment

### Build Process

**Frontend Build:**
```bash
# Production build
npm run build

# Build with type checking
npm run build:check

# Analyze bundle size
npm run analyze
```

**Backend Build:**
```bash
# Production binary
go build -ldflags="-w -s" -o bin/apiserver cmd/apiserver/main.go

# Cross-platform builds
GOOS=linux GOARCH=amd64 go build -o bin/apiserver-linux cmd/apiserver/main.go
```

### Docker Configuration

**Multi-stage Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

FROM golang:1.21-alpine AS backend-builder
WORKDIR /app
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
RUN go build -o apiserver cmd/apiserver/main.go

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/apiserver .
COPY --from=frontend-builder /app/dist ./static/
CMD ["./apiserver"]
```

### Environment Configuration

**Production Environment:**
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.domainflow.com
DATABASE_URL=postgresql://user:pass@db:5432/domainflow
SESSION_SECRET=your-secret-key
GIN_MODE=release
```

## Troubleshooting

### Common Issues

**Database Connection:**
```bash
# Check PostgreSQL connection
psql -h localhost -U domainflow -d domainflow -c "SELECT version();"

# View active connections
SELECT * FROM pg_stat_activity WHERE datname = 'domainflow';
```

**API Issues:**
```bash
# Health check
curl http://localhost:8080/health

# Check logs
docker logs domainflow-backend

# Debug mode
GIN_MODE=debug go run cmd/apiserver/main.go
```

**Frontend Issues:**
```bash
# Clear Next.js cache
rm -rf .next

# Check build errors
npm run build -- --debug

# Analyze bundle
npm run analyze
```

### Performance Monitoring

**Metrics Collection:**
```go
// Prometheus metrics
var (
    httpDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests.",
        },
        []string{"method", "route", "status_code"},
    )
)

// Middleware for metrics
func metricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()
        duration := time.Since(start)
        
        httpDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            fmt.Sprintf("%d", c.Writer.Status()),
        ).Observe(duration.Seconds())
    }
}
```

## Contributing

### Code Standards

**TypeScript Standards:**
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper error handling with try/catch
- Follow naming conventions (camelCase for variables, PascalCase for components)

**Go Standards:**
- Follow effective Go guidelines
- Use gofmt and golint
- Handle errors explicitly
- Use context.Context for cancellation
- Write comprehensive tests

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation if needed
4. Run linting and tests
5. Create pull request with description
6. Address review feedback
7. Merge after approval

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/campaign-improvements

# Make changes and commit
git add .
git commit -m "feat: improve campaign performance"

# Push and create PR
git push origin feature/campaign-improvements
```

---

This developer guide provides the foundation for contributing to DomainFlow V3.0. For specific implementation details, refer to the codebase and inline documentation.

**DomainFlow V3.0 Stable** - Advanced Domain Intelligence Platform