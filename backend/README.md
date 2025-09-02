# DomainFlow Backend

Go-based REST API server with OpenAPI 3.1 specification, Chi strict server, and Server-Sent Events (SSE) for real-time updates. All endpoints are under `/api/v2`.

## 🏗️ Architecture Overview

### API Structure
All endpoints follow the standardized `/api/v2` prefix pattern:

```
/api/v2/auth/*           # Authentication endpoints
/api/v2/campaigns/*      # Campaign management
/api/v2/personas/*       # Persona management  
/api/v2/proxies/*        # Proxy management
/api/v2/proxy-pools/*    # Proxy pool management
/api/v2/keyword-sets/*   # Keyword set management
/api/v2/me               # User profile
/api/v2/health/*         # Health checks
```

### Technology Stack
- **Framework**: Chi strict server generated via oapi-codegen (OpenAPI 3.1)
- **Database**: PostgreSQL with optimized queries and proper indexing
- **Authentication**: Session-based auth with secure middleware
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Documentation**: Modular OpenAPI 3.1 spec bundled with Redocly
- **Validation**: Request/response validation with generated types

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- PostgreSQL 15+
- Environment variables configured

### Development Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod download

# Configure database (or use config.json)
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=your_user
export DB_PASSWORD=your_password
export DB_NAME=domainflow_dev
export SERVER_PORT=8080

# Run database migrations (enhanced runner)
go run ./cmd/migrate -dsn "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable" -direction up

# Start development server (Chi)
go run ./cmd/apiserver
```

The server will start on `http://localhost:8080` with all endpoints under `/api/v2/`.

## 📁 Project Structure

```
backend/
├── cmd/                     # Application entry points
│   ├── apiserver/          # Main API server
│   ├── migrate/            # Database migrations
│   └── generate-openapi/   # OpenAPI spec generator
├── internal/               # Private application code
│   ├── api/               # HTTP handlers and routing
│   ├── services/          # Business logic layer
│   ├── store/             # Data access layer
│   ├── models/            # Data models and DTOs
│   ├── middleware/        # HTTP middleware
│   ├── config/            # Configuration management
│   └── services/          # Includes SSE service (replaces WebSockets)
├── database/              # Database schema and migrations
│   ├── migrations/        # SQL migration files
│   └── schema.sql         # Complete database schema
└── docs/                  # Generated documentation
    └── openapi-3.yaml     # (legacy) OpenAPI specification
```

## 🔧 Configuration

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost           # Database host
DB_PORT=5432               # Database port  
DB_USER=username           # Database user
DB_PASSWORD=password       # Database password
DB_NAME=domainflow_dev     # Database name
DB_SSLMODE=disable         # SSL mode (disable for local)

# Server Configuration  
SERVER_PORT=8080           # API server port
GIN_MODE=debug             # Gin mode (debug/release)

# Authentication
SESSION_SECRET=your_secret_key    # Session encryption key
AUTH_TIMEOUT=7200                 # Session timeout (seconds)

# External Services
DOMAIN_VALIDATION_TIMEOUT=30     # DNS validation timeout
HTTP_REQUEST_TIMEOUT=15          # HTTP request timeout
```

### Database Setup

```bash
# Create database
createdb domainflow_dev

# Run migrations  
go run cmd/migrate/main.go

# Verify schema
psql domainflow_dev -c "\dt"
```

## 🛠️ Development

### Running the Server

```bash
# Development mode with auto-reload
go run cmd/apiserver/main.go

# Build and run
go build -o bin/apiserver cmd/apiserver/main.go
./bin/apiserver
```

### API Documentation

```bash
# Bundle and generate server/types from OpenAPI 3.1
make openapi

# Bundled spec location
cat openapi/dist/openapi.yaml
```

### Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package tests
go test ./internal/services/...

# Verbose testing
go test -v ./internal/api/...
```

### Database Migrations

```bash
# Create new migration (add files under database/migrations/)

# Run migrations (up)
go run ./cmd/migrate -dsn "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable" -direction up

# Roll back (down)
go run ./cmd/migrate -dsn "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=disable" -direction down
```

## 📊 API Endpoints

### Authentication
```
POST   /api/v2/auth/login     # User login
POST   /api/v2/auth/logout    # User logout  
POST   /api/v2/auth/refresh   # Refresh session
GET    /api/v2/me             # Get current user
POST   /api/v2/change-password # Change password
```

### Campaign Management
```
GET    /api/v2/campaigns                    # List campaigns
POST   /api/v2/campaigns                    # Create campaign
GET    /api/v2/campaigns/{id}               # Get campaign
PUT    /api/v2/campaigns/{id}               # Update campaign
DELETE /api/v2/campaigns/{id}               # Delete campaign
POST   /api/v2/campaigns/{id}/start         # Start campaign
POST   /api/v2/campaigns/{id}/stop          # Stop campaign
```

### Domain Generation
```
POST   /api/v2/campaigns/domain-generation/pattern-offset  # Get pattern offset
```

### Persona Management  
```
GET    /api/v2/personas       # List personas
POST   /api/v2/personas       # Create persona
GET    /api/v2/personas/{id}  # Get persona
PUT    /api/v2/personas/{id}  # Update persona
DELETE /api/v2/personas/{id}  # Delete persona
```

### Proxy Management
```
GET    /api/v2/proxies        # List proxies
POST   /api/v2/proxies        # Create proxy
GET    /api/v2/proxies/{id}   # Get proxy
PUT    /api/v2/proxies/{id}   # Update proxy  
DELETE /api/v2/proxies/{id}   # Delete proxy
```

### Health Checks
```
GET    /api/v2/health         # System health
GET    /api/v2/health/ready   # Readiness check
GET    /api/v2/health/live    # Liveness check
```

## 🔌 Real-time via SSE

Server-Sent Events provide real-time updates:

```
GET /api/v2/sse/events                          # All-user event stream
GET /api/v2/sse/campaigns/{campaignId}/events   # Campaign-scoped stream
GET /api/v2/sse/events/stats                    # SSE stats
```

## 🏭 Production Deployment

### Building for Production

```bash
# Build optimized binary
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/apiserver cmd/apiserver/main.go

# Set production environment
export GIN_MODE=release
export DB_SSLMODE=require

# Run with production settings
./bin/apiserver
```

### Docker Deployment

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o apiserver cmd/apiserver/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/apiserver .
CMD ["./apiserver"]
```

### Performance Optimization

- **Database Connections**: Connection pooling configured
- **Indexes**: Optimized database indexes for common queries
- **Caching**: In-memory caching for frequently accessed data
- **Rate Limiting**: Request rate limiting to prevent abuse
- **SSE**: Efficient real-time updates eliminate polling

## 🛡️ Security

### Authentication & Authorization
- Session-based authentication with secure cookies
- CSRF protection on state-changing operations
- Rate limiting on authentication endpoints
- Secure password hashing with bcrypt

### API Security
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- CORS configuration for cross-origin requests
- Security headers (HSTS, CSP, X-Frame-Options)

### Database Security
- Connection encryption (TLS)
- Prepared statements for all queries
- Database user with minimal required privileges
- Regular security updates and patches

## 📋 Monitoring & Observability

### Health Checks
```bash
# API health
curl http://localhost:8080/api/v2/health

# Database connectivity
curl http://localhost:8080/api/v2/health/ready

# Service liveness  
curl http://localhost:8080/api/v2/health/live
```

### Logging
- Structured logging with contextual information
- Request/response logging in development
- Error tracking with stack traces
- Performance metrics logging

### Metrics
- HTTP request duration and status codes
- Database query performance
- SSE connection counts
- Memory and CPU usage tracking

## 🤝 Contributing

### Code Guidelines
- Follow Go best practices and idioms
- Maintain OpenAPI annotations for all endpoints
- Include unit tests for business logic
- Update documentation for API changes

### Testing Requirements
- Unit tests for all service layer functions
- Integration tests for API endpoints
- Database tests with transaction rollback
- SSE connection testing

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update OpenAPI annotations
4. Verify all tests pass
5. Submit pull request with description

## 📚 Additional Resources

- **OpenAPI Spec** - See `backend/openapi/dist/openapi.yaml` (bundled)
- **[Database Schema](database/schema.sql)** - Database structure
- **[Migration Guide](database/CHANGELOG.md)** - Database changes
- **[Architecture Docs](../docs/ARCHITECTURE.md)** - System design

---

**Backend Architecture**: High-performance Go API with PostgreSQL, real-time WebSocket support, and comprehensive OpenAPI documentation.
