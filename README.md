# DomainFlow

Professional domain research and validation platform with real-time campaign management, advanced proxy orchestration, and intelligent keyword analysis.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Go 1.21+** 
- **PostgreSQL 15+**

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd studio

# Install dependencies
npm install
cd backend && go mod download && cd ..

# Set up environment (REQUIRED)
cp .env.example .env.local
# Edit .env.local with your API endpoints - NO hardcoded localhost allowed

# Required environment variables:
export NEXT_PUBLIC_API_URL=http://your-backend-host:8080/api/v2
export NEXT_PUBLIC_WS_URL=ws://your-backend-host:8080/api/v2/ws

# Validate environment configuration
npm run validate:env

# Database setup
createdb domainflow_dev
npm run db:migrate

# Start development servers (requires valid environment)
npm run dev          # Frontend with validation
npm run backend:dev  # Backend API
```

## 🏗️ Architecture

### API Structure
All endpoints are standardized under `/api/v2` for consistency:

```
/api/v2/auth/*           # Authentication
/api/v2/campaigns/*      # Campaign management  
/api/v2/personas/*       # Persona management
/api/v2/proxies/*        # Proxy management
/api/v2/proxy-pools/*    # Proxy pool management
/api/v2/keyword-sets/*   # Keyword set management
/api/v2/me               # User profile
/api/v2/health/*         # Health checks
```

### Technology Stack

**Frontend:**
- Next.js 14 with App Router
- TypeScript with strict type safety
- Tailwind CSS for styling
- Auto-generated API clients from OpenAPI spec
- Real-time WebSocket updates

**Backend:**
- Go with Gin web framework
- PostgreSQL with optimized queries
- OpenAPI 3.0.3 specification
- WebSocket for real-time updates
- Session-based authentication

**Infrastructure:**
- Docker containers for deployment
- PostgreSQL for data persistence
- Real-time WebSocket connections
- Automated API contract validation

## 📋 Core Features

### Campaign Management
- **Domain Generation**: Algorithmic domain creation with pattern-based generation
- **DNS Validation**: Real-time DNS record validation and availability checking  
- **HTTP Validation**: Website existence and keyword scanning
- **Progress Tracking**: Real-time campaign progress with WebSocket updates

### Proxy Management
- **Proxy Pools**: Organized proxy management with health monitoring
- **Rotation Logic**: Intelligent proxy rotation for optimal performance
- **Health Checking**: Automated proxy validation and failover

### Persona System
- **HTTP Personas**: Custom headers, user agents, and request patterns
- **DNS Personas**: Specialized DNS validation configurations
- **Reusable Profiles**: Template-based persona management

### Real-time Updates
- **99%+ API Request Reduction**: WebSocket push model eliminates polling
- **Zero Rate Limiting**: Eliminated 429 errors through efficient real-time updates
- **Live Progress**: Real-time campaign status and results

## 🛠️ Development

### Environment Validation
```bash
# Validate environment configuration (required before dev/build)
npm run validate:env

# Validate for production deployment
npm run validate:env:prod

# Safe build with full validation
npm run build:safe
```

### API Development
```bash
# Generate OpenAPI spec and TypeScript types
npm run api:generate

# Run backend with auto-reload
npm run backend:dev

# Validate API contracts
npm run api:validate
```

### Frontend Development
```bash
# Start development server (validates environment first)
npm run dev

# Type checking
npm run type-check

# Run tests
npm run test
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Create new migration
npm run db:create-migration <name>

# Reset database (development only)
npm run db:reset
```

## 📚 Documentation

- **[API Documentation](API_SPEC.md)** - Complete API reference
- **[Database Guide](backend/database/README.md)** - Database schema and setup
- **[Installation Guide](docs/INSTALLATION_GUIDE.md)** - Detailed setup instructions
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and patterns

## 🔧 Configuration

### Environment Variables

⚠️ **IMPORTANT**: This application enforces strict environment-based configuration. NO hardcoded localhost or fallback URLs are allowed to prevent production bugs.

**Frontend (.env.local) - REQUIRED:**
```bash
# REQUIRED: Backend API URL (no localhost fallbacks allowed)
NEXT_PUBLIC_API_URL=http://your-backend-host:8080/api/v2

# REQUIRED: Backend WebSocket URL
NEXT_PUBLIC_WS_URL=ws://your-backend-host:8080/api/v2/ws

# OPTIONAL: Frontend URL (recommended for WebSocket origin validation)
NEXT_PUBLIC_APP_URL=http://your-frontend-host:3000

# OPTIONAL: Production domain
NEXT_PUBLIC_PRODUCTION_DOMAIN=https://your-production-domain.com
```

**Backend (.env):**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=domainflow_dev
SERVER_PORT=8080
```

### Configuration Validation

The application includes strict validation to prevent misconfiguration:

```bash
# Validate environment setup
npm run validate:env

# Example validation output:
# ✅ Environment configuration validation passed!
#    API URL: http://your-backend-host:8080/api/v2
#    WebSocket URL: ws://your-backend-host:8080/api/v2/ws

# Build will fail if environment variables are missing:
# ❌ VALIDATION FAILED - Configuration errors found:
# 1. NEXT_PUBLIC_API_URL: Missing or empty
```

### Quick Setup Examples

**Development:**
```bash
# Copy example configuration
cp .env.example .env.local

# Update with your backend URLs
export NEXT_PUBLIC_API_URL=http://backend.local:8080/api/v2
export NEXT_PUBLIC_WS_URL=ws://backend.local:8080/api/v2/ws
```

**Docker Compose:**
```bash
NEXT_PUBLIC_API_URL=http://backend:8080/api/v2
NEXT_PUBLIC_WS_URL=ws://backend:8080/api/v2/ws
```

**Production:**
```bash
NEXT_PUBLIC_API_URL=https://api.domainflow.com/api/v2
NEXT_PUBLIC_WS_URL=wss://api.domainflow.com/api/v2/ws
```

## 🚀 Production Deployment

⚠️ **PRODUCTION SAFETY**: All deployments require proper environment configuration. The application will refuse to start without valid `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` settings.

### Pre-deployment Validation
```bash
# REQUIRED: Validate production environment
NODE_ENV=production npm run validate:env:prod

# Must pass validation before deployment:
# ✅ Environment configuration validation passed!
#    API URL: https://api.domainflow.com/api/v2
#    WebSocket URL: wss://api.domainflow.com/api/v2/ws
```

### Docker Deployment
```bash
# Set production environment variables
export NEXT_PUBLIC_API_URL=https://api.domainflow.com/api/v2
export NEXT_PUBLIC_WS_URL=wss://api.domainflow.com/api/v2/ws

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment
```bash
# Set production environment (REQUIRED)
export NEXT_PUBLIC_API_URL=https://api.domainflow.com/api/v2
export NEXT_PUBLIC_WS_URL=wss://api.domainflow.com/api/v2/ws
export NODE_ENV=production

# Validate configuration before build
npm run validate:env:prod

# Safe build with validation
npm run build:safe

# Build backend
cd backend && go build -o bin/apiserver cmd/apiserver/main.go

# Run with production settings
npm start
./backend/bin/apiserver
```

### Environment Configuration Security

**✅ Production Requirements:**
- NO localhost URLs allowed in production
- HTTPS/WSS protocols required for production
- Environment variables must be properly configured
- Build fails without valid configuration

**❌ Common Deployment Issues Prevented:**
- Hardcoded localhost connections
- Missing environment variables
- Invalid URL formats
- Mixed HTTP/HTTPS protocol issues

## 🧪 Testing

### Frontend Testing
```bash
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report
```

### Backend Testing  
```bash
cd backend
go test ./...            # All tests
go test -v ./internal/... # Verbose internal tests
```

### API Contract Testing
```bash
npm run api:test         # Validate API contracts
npm run api:validate     # OpenAPI spec validation
```

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:8080/api/v2/health     # API health
curl http://localhost:3000/api/health        # Frontend health
```

### Performance Metrics
- **API Response Times**: Monitored via health endpoints
- **WebSocket Connections**: Real-time connection status
- **Database Performance**: Query optimization and indexing

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Create** a Pull Request

### Development Guidelines
- Follow TypeScript strict mode requirements
- Maintain OpenAPI spec accuracy with backend changes
- Include tests for new features
- Update documentation for API changes

## 🔧 Troubleshooting

### Configuration Issues

**❌ Build fails with "CONFIGURATION ERROR":**
```bash
# Error: API base URL not configured
# Solution: Set required environment variables
export NEXT_PUBLIC_API_URL=http://your-backend-host:8080/api/v2
export NEXT_PUBLIC_WS_URL=ws://your-backend-host:8080/api/v2/ws
```

**❌ "localhost not allowed in production":**
```bash
# Error: Contains localhost/127.0.0.1 in production
# Solution: Use proper production URLs
export NEXT_PUBLIC_API_URL=https://api.domainflow.com/api/v2
export NEXT_PUBLIC_WS_URL=wss://api.domainflow.com/api/v2/ws
```

**❌ WebSocket connection failures:**
```bash
# Error: WebSocket origin validation failed
# Solution: Set frontend URL for origin validation
export NEXT_PUBLIC_APP_URL=http://your-frontend-host:3000
```

**❌ "Invalid URL format" errors:**
```bash
# Error: Invalid URL format
# Solution: Ensure URLs include protocol and correct format
# ✅ Correct: http://backend.local:8080/api/v2
# ❌ Wrong: backend.local:8080/api/v2
```

### Quick Fixes

```bash
# 1. Copy example configuration
cp .env.example .env.local

# 2. Validate current configuration
npm run validate:env

# 3. Check configuration in development
npm run dev  # Will show validation errors immediately

# 4. Safe production build
npm run build:safe  # Validates before building
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/domainflow/issues)
- **API Reference**: [API_SPEC.md](API_SPEC.md)
- **Environment Setup**: [.env.example](.env.example)

---

**DomainFlow** - Professional domain research and validation platform with real-time capabilities and enterprise-grade reliability.
