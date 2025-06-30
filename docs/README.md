# DomainFlow Documentation

## 🌐 About DomainFlow

DomainFlow is an advanced domain intelligence and campaign orchestration platform that automates the generation, validation, and analysis of web domains through sophisticated chained campaign workflows.

### 🔄 Phased Chaining Campaign System

DomainFlow operates on a **three-stage chaining architecture** where each campaign type serves as both output producer and input consumer, creating intelligent data flows:

**Campaign Flow Pipeline:**
```
Domain Generation → DNS Validation → HTTP Keyword Validation
       ↓                ↓                    ↓
   Domain List → Validated Domains → Keyword-Rich Content
```

**Campaign Types & Chaining:**

1. **Domain Generation Campaigns** (`domain_generation`)
   - **Input**: Patterns, character sets, TLDs, generation rules
   - **Process**: Algorithmic domain generation using patterns (prefix, suffix, random)
   - **Output**: Generated domain lists → *automatically feeds DNS validation campaigns*

2. **DNS Validation Campaigns** (`dns_validation`)
   - **Input**: Domain lists (from domain generation campaigns)
   - **Process**: DNS resolution testing, availability checking, persona-based validation
   - **Output**: Validated live domains → *automatically feeds HTTP keyword validation campaigns*

3. **HTTP Keyword Validation Campaigns** (`http_keyword_validation`)
   - **Input**: Validated domains (from DNS validation campaigns)
   - **Process**: HTTP probing, content scraping, keyword matching, technology detection
   - **Output**: Content-analyzed domains with keyword match results

### 🎯 Automatic Campaign Chaining

**HandleCampaignCompletion Flow:**
- When a **Domain Generation** campaign completes → automatically creates and starts **DNS Validation** campaign
- When a **DNS Validation** campaign completes → automatically creates and starts **HTTP Keyword Validation** campaign
- Each stage uses the previous campaign's output as its input source

### 🏗️ Technical Architecture

**Core Components:**
- **Campaign Engine**: Orchestrates the chained workflow execution
- **Worker Pool**: Distributed processing system for parallel campaign execution
- **Data Pipeline**: Real-time data transformation between campaign stages
- **WebSocket Layer**: Live updates and progress monitoring
- **Persona System**: Configurable behavioral profiles for DNS and HTTP operations
- **Proxy Management**: Intelligent routing through proxy pools for scale and anonymity

**Data Flow:**
```
Frontend Dashboard → API Gateway → Campaign Engine → Worker Pool → Data Pipeline
                                      ↓
WebSocket Updates ← Results Storage ← Output Processing ← Task Execution
```

### 🎯 Key Features

- **Intelligent Chaining**: Campaigns automatically consume outputs from previous stages
- **Real-time Processing**: Live data flows with WebSocket updates  
- **Pattern-based Generation**: Create domains using various algorithmic patterns
- **Persona-based Operations**: Different behavioral profiles for DNS and HTTP validation
- **Proxy Management**: Distributed processing through proxy pools
- **Keyword Matching**: Advanced content analysis and keyword extraction
- **Session-based Security**: Secure authentication without complex permissions

## 📚 Documentation Structure

### Essential Guides
- **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Complete setup and installation instructions
- **[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)** - Environment configuration (shared .env setup)
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Development workflows and best practices
- **[USER_GUIDE.md](USER_GUIDE.md)** - End-user documentation and tutorials
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

### Security & Operations
- **[API_AUTHENTICATION.md](API_AUTHENTICATION.md)** - Session-based authentication system
- **[SECURITY.md](SECURITY.md)** - Security guidelines and best practices
- **[COMPLIANCE.md](COMPLIANCE.md)** - Compliance and regulatory information
- **[OPERATIONAL_RUNBOOK.md](OPERATIONAL_RUNBOOK.md)** - Production operations guide
- **[DEPLOYMENT_VALIDATION_CHECKLIST.md](DEPLOYMENT_VALIDATION_CHECKLIST.md)** - Pre-deployment checks

### System Design
- **[architecture/](architecture/)** - Current system architecture documentation
- **[design-system/](design-system/)** - UI/UX design system documentation

## 🚀 Quick Start

### Getting Started with DomainFlow

1. **Environment Setup**: [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Shared .env configuration
2. **Installation**: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Complete setup guide
3. **Development**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Development workflows
4. **Authentication**: [API_AUTHENTICATION.md](API_AUTHENTICATION.md) - Session-based auth
5. **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

### Creating Your First Campaign Chain

1. **Start with Domain Generation**: Create a campaign to generate domains using patterns
2. **Chain to DNS Validation**: Automatically validate generated domains for DNS resolution
3. **Chain to HTTP Keyword**: Automatically analyze validated domains for keyword content
4. **Monitor Progress**: Watch real-time updates as each stage completes and triggers the next

Each stage automatically feeds into the next, creating an intelligent data pipeline from domain generation to content analysis.

## ✅ Current System State

**Post-Refactoring (June 2025):**
- ✅ Removed role/permission-based authentication
- ✅ Migrated to session-based authentication
- ✅ Centralized environment configuration in shared .env
- ✅ Cleaned up all legacy migration documentation
- ✅ Ready for testing phase

## 📝 Documentation Standards

- All documentation reflects the current simplified architecture
- Environment setup is centralized and shared across teams
- Authentication is session-based only (no roles/permissions)
- Focus on testing and production readiness
