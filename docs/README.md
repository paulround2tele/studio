# DomainFlow Documentation

## 🌐 About DomainFlow

Dom### 🏗️ Technical Architecture

**Core Components:**
- **Campaign Engine**: Orchestrates the chained workflow execution
- **Worker Pool**: Distributed processing system for parallel campaign execution
- **Data Pipeline**: Real-time data transformation between campaign stages
- **WebSocket Layer**: Live updates and progress monitoring
- **Persona System**: Configurable behavioral profiles for different operation types
- **Proxy Management**: Intelligent routing through proxy pools for scale and anonymity

**Data Flow:**
```
Frontend Dashboard → API Gateway → Campaign Engine → Worker Pool → Data Pipeline
                                      ↓
WebSocket Updates ← Results Storage ← Output Processing ← Task Execution
```

## 📚 Documentation StructureinFlow is an advanced domain intelligence and campaign orchestration platform that automates the discovery, analysis, and engagement of web domains through sophisticated chained campaign workflows.

### 🔄 Phased Chaining Campaign System

DomainFlow operates on a unique **phased chaining architecture** where each campaign type serves as both output producer and input consumer, creating intelligent data flows:

**Campaign Flow Pipeline:**
```
DNS Discovery → HTTP Analysis → Content Extraction → Contact Discovery → Engagement
     ↓              ↓               ↓                ↓               ↓
  Domain List → Live Domains → Website Data → Contact Info → Outreach Results
```

**Campaign Types & Chaining:**

1. **DNS Discovery Campaigns**
   - **Input**: Domain patterns, keywords, TLD lists
   - **Process**: DNS enumeration, subdomain discovery, availability checking
   - **Output**: Validated domain lists → *feeds into HTTP campaigns*

2. **HTTP Analysis Campaigns**
   - **Input**: Domain lists (from DNS campaigns)
   - **Process**: HTTP probing, technology detection, security analysis
   - **Output**: Live website profiles → *feeds into content extraction*

3. **Content Extraction Campaigns**
   - **Input**: Live domains (from HTTP campaigns)
   - **Process**: Web scraping, content analysis, keyword extraction
   - **Output**: Structured website data → *feeds into contact discovery*

4. **Contact Discovery Campaigns**
   - **Input**: Website data (from content campaigns)
   - **Process**: Email harvesting, social media discovery, WHOIS lookup
   - **Output**: Contact databases → *feeds into engagement campaigns*

5. **Engagement Campaigns**
   - **Input**: Contact lists (from discovery campaigns)
   - **Process**: Automated outreach, follow-up sequences, response tracking
   - **Output**: Engagement metrics → *feeds back for optimization*

### 🎯 Key Features

- **Intelligent Chaining**: Campaigns automatically consume outputs from previous stages
- **Real-time Processing**: Live data flows with WebSocket updates
- **Scalable Architecture**: Handle thousands of domains across multiple campaigns
- **Persona-based Operations**: Different behavioral profiles for varied approaches
- **Proxy Management**: Distributed processing through proxy pools
- **Session-based Security**: Secure authentication without complex permissions

This directory contains essential documentation for the DomainFlow application, cleaned up and organized for the testing phase.

## � Documentation Structure

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

1. **Start with DNS Discovery**: Create a campaign to discover domains
2. **Chain to HTTP Analysis**: Automatically analyze discovered live domains
3. **Extract Content**: Pull website data from validated domains
4. **Discover Contacts**: Find contact information from extracted content
5. **Launch Engagement**: Execute outreach campaigns with discovered contacts

Each stage automatically feeds into the next, creating an intelligent data pipeline.

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
