# DomainFlow Studio

A sophisticated full-stack application for intelligent domain generation, validation, and lead extraction campaigns. Built with Next.js frontend and Go backend, featuring real-time WebSocket communications, multi-phase campaign orchestration, and advanced domain status tracking.

## 🏗️ Architecture Overview

### Frontend (Next.js 15 + TypeScript)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict type safety
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand stores with real-time synchronization
- **API Client**: Auto-generated from OpenAPI specification
- **Real-time**: WebSocket integration for live campaign updates

### Backend (Go + PostgreSQL)
- **Language**: Go with Gin web framework
- **Database**: PostgreSQL with migration system
- **API**: RESTful API with OpenAPI 3.0 specification
- **Real-time**: WebSocket server for campaign broadcasting
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
- **Real-time Updates**: WebSocket broadcasting for status changes
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
- **Zustand**: Lightweight state management
- **React Hook Form**: Form validation and management
- **Zod**: Runtime type validation
- **Lucide React**: Icon library

### Backend
- **Go 1.22+**: Backend language
- **Gin**: HTTP web framework
- **PostgreSQL**: Primary database
- **GORM**: ORM for database operations
- **golang-migrate**: Database migration tool
- **gorilla/websocket**: WebSocket implementation
- **go-playground/validator**: Request validation

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
│   │   │   ├── stores/         # Zustand state stores
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
│   │   ├── websocket/         # WebSocket handlers
│   │   └── config/            # Configuration management
│   ├── database/
│   │   ├── migrations/        # Database migrations
│   │   └── seeds/            # Database seed data
│   ├── docs/                 # OpenAPI specification
│   └── go.mod
└── scripts/                  # Build and deployment scripts
```

## 🔌 API Documentation

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

#### Real-time WebSocket
```http
GET    /ws                                  # WebSocket connection
```

#### WebSocket Message Types
```json
{
  "type": "domain_generated",
  "campaignId": "uuid",
  "data": { "domains": ["example.com"] }
}

{
  "type": "dns_validation_result",
  "campaignId": "uuid", 
  "data": { "domain": "example.com", "status": "ok" }
}

{
  "type": "progress",
  "campaignId": "uuid",
  "data": { "progress": 75.5, "phase": "http_keyword_validation" }
}
```

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
- Use helper functions for domain data access to maintain backward compatibility
- Implement proper error boundaries for React components
- Validate WebSocket message types with Zod schemas

### Real-time Features
- Use WebSocket connections for campaign progress updates
- Implement proper connection retry logic
- Handle connection state in Zustand stores
- Debounce frequent updates to prevent UI thrashing

## 🚨 Common Issues

### Domain Status Not Updating
1. Check WebSocket connection status
2. Verify backend broadcasts are working
3. Ensure frontend helper functions handle new domain format
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
- Use Zustand persist for state caching

### Backend
- Database connection pooling
- Efficient bulk operations for domain processing
- WebSocket connection management
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
- Secure WebSocket connections

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

---

**Built with ❤️ by the DomainFlow Team**