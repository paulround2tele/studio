# DomainFlow Quick Reference

## Setup Commands
```bash
# Complete setup
./.codex/setup.sh

# Database only
./.codex/setup_db.sh

# Check database
./.codex/check-db.sh
```

## Development Commands

### Start Services
```bash
# Backend (from repo root)
cd backend && ./apiserver

# Frontend (from repo root)
npm run dev

# PostgreSQL service
sudo systemctl start postgresql
```

### Build Commands
```bash
# Backend build
cd backend && make build
# or
cd backend && go build -o apiserver ./cmd/api

# Frontend build
npm run build

# Frontend type check
npm run type-check
```

### Testing Commands
```bash
# Backend tests
cd backend && go test ./...

# Frontend tests
npm test

# E2E tests with Playwright
npm run test:e2e
```

### Database Commands
```bash
# Connect to database
psql -h localhost -p 5432 -U domainflow -d domainflow_production

# Run migrations
cd backend && go run ./cmd/migrate -dsn "postgres://domainflow:password@localhost:5432/domainflow_production?sslmode=disable"

# Database backup
pg_dump -h localhost -p 5432 -U domainflow domainflow_production > backup.sql
```

### Development URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

### Configuration Files
- Backend: `backend/config.json`
- Frontend: `next.config.ts`
- Database: `.codex/test.env`
- Codex: `.codex/config.json`

### Logs
- Backend: `backend/backend.log`
- API Server: `backend/apiserver.log`
- Frontend: Check browser console and terminal

### Environment Variables
```bash
# Database connection
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_NAME=domainflow_production
export DATABASE_USER=domainflow
export DATABASE_PASSWORD=your_password

# Development mode
export NODE_ENV=development
export GIN_MODE=debug
```
