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

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Database setup
createdb domainflow_dev
npm run db:migrate

# Start development servers
npm run dev          # Frontend (http://localhost:3000)
npm run backend:dev  # Backend API (http://localhost:8080)
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
# Start development server
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

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/v2/ws
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

## 🚀 Production Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment
```bash
# Build frontend
npm run build

# Build backend
cd backend && go build -o bin/apiserver cmd/apiserver/main.go

# Run with production settings
NODE_ENV=production npm start
./backend/bin/apiserver
```

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/domainflow/issues)
- **API Reference**: [API_SPEC.md](API_SPEC.md)

---

**DomainFlow** - Professional domain research and validation platform with real-time capabilities and enterprise-grade reliability.
