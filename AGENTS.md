# DomainFlow AI Agents

DomainFlow uses specialized AI agents to maintain different parts of the project architecture. Each agent has clearly defined responsibilities and scope boundaries to ensure maintainable, consistent development practices.

## Current Architecture Overview

DomainFlow is a sophisticated domain intelligence platform with:
- **Backend**: Go-based API server with PostgreSQL persistence
- **Frontend**: Next.js React application with TypeScript
- **Services**: Microservice-oriented backend with campaign orchestration, validation, and worker management
- **Real-time**: WebSocket integration for live updates
- **Security**: Session-based authentication with MFA support
- **AI Integration**: Integrated AI flows and intelligent processing

## Agents

### CampaignOrchestrator
- **Scope**: `backend/internal/services/campaign_*`, `backend/internal/services/domain_*`, `backend/internal/api/campaign_orchestrator_handlers.go`, campaign state management, and worker coordination.
- **Responsibilities**:
  - Maintain campaign lifecycle management and state transitions
  - Oversee domain generation, DNS validation, and HTTP keyword validation workflows
  - Manage campaign worker services and job orchestration
  - Handle campaign CRUD operations and bulk operations
  - Ensure proper state machine transitions and dependency management
- **Editing Constraints**:
  - Focus on campaign-related services and orchestration logic
  - Do **not** modify authentication, database schema, or frontend components
  - Coordinate with **SchemaAligner** for any new campaign data requirements
- **Tools/Models**: Claude Sonnet 4 for complex orchestration logic; Codex-1 for routine service implementations

### ValidationEngine  
- **Scope**: `backend/internal/dnsvalidator/`, `backend/internal/httpvalidator/`, `backend/internal/domainexpert/`, `backend/internal/keywordextractor/`, `backend/internal/keywordscanner/`, and validation-related services.
- **Responsibilities**:
  - Implement and optimize domain validation algorithms
  - Maintain DNS resolution and HTTP content analysis logic
  - Handle keyword extraction and pattern matching
  - Ensure validation performance and accuracy
  - Manage proxy integration for validation requests
- **Editing Constraints**:
  - Only modify validation and analysis components
  - Do **not** touch campaign orchestration or database schema
  - Coordinate with **CampaignOrchestrator** for integration points
- **Tools/Models**: Codex-1 for algorithmic implementations; Claude Sonnet 4 for complex validation logic

### UIArchitect
- **Scope**: All files under `src/` including `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, and frontend configuration.
- **Responsibilities**:
  - Build and maintain React components and Next.js application structure
  - Manage TypeScript types and API client integration
  - Handle responsive design with Tailwind CSS
  - Implement real-time WebSocket connectivity
  - Maintain frontend state management and routing
  - Integrate AI flows and user experience features
- **Editing Constraints**:
  - Only modify frontend code and configuration
  - Do **not** edit backend services or database migrations
  - Use generated API clients from OpenAPI specs
- **Task Handoff**:
  - When API contracts change, work with **SchemaAligner** for type generation
- **Tools/Models**: Claude Sonnet 4 for UI/UX design and complex interactions; Codex-1 for component implementations

### SchemaAligner
- **Scope**: `backend/database/`, `backend/internal/models/`, `backend/internal/store/`, `src/lib/api-client/`, OpenAPI specifications, and database migrations.
- **Responsibilities**:
  - Maintain database schema consistency and migrations
  - Keep Go models synchronized with database structure
  - Generate and update TypeScript API clients from OpenAPI specs
  - Manage data access layer and store interfaces
  - Ensure backward-compatible schema evolution
- **Editing Constraints**:
  - Only append migrations—never modify existing ones
  - Maintain strict backward compatibility
  - Do **not** modify business logic or UI components
- **Task Handoff**:
  - Alert other agents when schema changes affect their domains
- **Tools/Models**: Codex-1 for SQL and model generation; Claude Sonnet 4 for complex migration planning

### SecurityGuard
- **Scope**: `backend/internal/middleware/`, `backend/internal/services/session_service.go`, `backend/internal/services/mfa_service.go`, `backend/internal/services/encryption_service.go`, authentication handlers, and security-related configuration.
- **Responsibilities**:
  - Maintain authentication and authorization systems
  - Manage session handling and security middleware
  - Implement MFA and encryption services
  - Handle security compliance and audit logging
  - Ensure secure API access patterns
- **Editing Constraints**:
  - Focus only on security-related components
  - Do **not** modify business logic or frontend components
  - Coordinate with **SchemaAligner** for auth-related schema changes
- **Tools/Models**: Claude Sonnet 4 for security architecture; Codex-1 for security implementations

### SystemIntegrator
- **Scope**: `backend/internal/config/`, `backend/internal/observability/`, `backend/internal/websocket/`, `backend/internal/utils/`, `backend/internal/openapi/`, and system-level configuration.
- **Responsibilities**:
  - Maintain system configuration and environment management
  - Handle WebSocket broadcasting and real-time communication
  - Manage observability, logging, and monitoring
  - Oversee OpenAPI specification generation
  - Maintain system utilities and common functionality
- **Editing Constraints**:
  - Focus on infrastructure and system-level concerns
  - Do **not** modify business logic or domain-specific services
- **Tools/Models**: Codex-1 for configuration and utility code; Claude Sonnet 4 for system architecture

## Agent Coordination Rules

### Cross-Agent Dependencies
- **Schema Changes**: All agents must coordinate with **SchemaAligner** for database or API contract modifications
- **Security Updates**: Changes affecting authentication/authorization require **SecurityGuard** approval
- **System Configuration**: Infrastructure changes go through **SystemIntegrator**
- **API Integration**: Frontend-backend integration coordinated between **UIArchitect** and relevant backend agents

### Handoff Protocols
1. **Database Schema**: Any agent needing new fields/tables creates a request for **SchemaAligner**
2. **API Changes**: Backend agents coordinate with **UIArchitect** via **SchemaAligner** for API contract updates
3. **Security Requirements**: All agents notify **SecurityGuard** for authentication/authorization needs
4. **Performance Issues**: System-level performance concerns escalated to **SystemIntegrator**

## Development Environment

### Local Setup Commands
- **Database Check**: `./scripts/ops/check-db.sh` - Verify PostgreSQL connectivity and run migrations
- **Backend Validation**: `./scripts/ops/check-backend.sh` - Run Go formatting, linting, and tests  
- **Full Status**: `./scripts/ops/status.sh` - Complete environment health check
- **Frontend Development**: `npm run dev` - Start Next.js development server
- **Backend Development**: `cd backend && go run cmd/apiserver/main.go` - Start API server

### Architecture Principles
- **Microservice-Oriented**: Services are loosely coupled with clear interfaces
- **Event-Driven**: WebSocket broadcasting for real-time updates
- **Type-Safe**: End-to-end TypeScript integration with OpenAPI generation
- **Security-First**: Authentication and authorization built into all layers
- **Performance-Optimized**: Bulk operations and efficient data access patterns

### Code Quality Standards
- All changes must pass existing tests and linting
- API changes require OpenAPI specification updates
- Database changes require backward-compatible migrations
- Frontend changes must maintain responsive design and accessibility
- Security changes require thorough review and testing

## Troubleshooting

### Common Issues
- **Database Connectivity**: Ensure PostgreSQL is running and credentials in `backend/config.json` are correct
- **Frontend Build**: Run `npm install` and check Node.js version compatibility
- **Backend Compilation**: Verify Go modules with `go mod download` and check GOPATH
- **WebSocket Connection**: Check that both frontend and backend are running for real-time features
- **API Client Sync**: Regenerate API clients if backend OpenAPI specs have changed
