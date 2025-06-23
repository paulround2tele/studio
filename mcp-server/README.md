# Enhanced MCP Server for DomainFlow

A comprehensive Model Context Protocol (MCP) server that provides domain-specific intelligence for DomainFlow's telecom lead generation platform. This server offers deep contextual knowledge about campaign flows, persona management, keyword scoring, and system optimization.

## Features

### 🎯 Campaign Flow Intelligence
- **3-Phase Architecture**: Deep understanding of domain generation → DNS validation → HTTP keyword validation flow
- **Phase Gating Logic**: Intelligent transition rules and dependency validation
- **Bottleneck Detection**: Real-time analysis of campaign performance and optimization opportunities
- **Data Flow Mapping**: Cross-phase data inheritance and transformation rules

### 🎭 Persona & Stealth Intelligence
- **Anti-Detection Strategies**: Comprehensive fingerprint randomization and behavioral simulation
- **Stealth Validation**: HTTP validation with persona profiles and rotation strategies
- **Rate Limiting**: Per-persona concurrent request management with adaptive throttling
- **Browser Profiles**: Desktop and mobile browser simulation with realistic fingerprints

### 📊 Keyword Scoring & Lead Intelligence
- **Telecom-Specific Keywords**: Industry-optimized keyword database with categories and weights
- **Multiple Scoring Algorithms**: Weighted sum, TF-IDF, and context-aware scoring methods
- **Lead Qualification**: Automated qualification with business intelligence extraction
- **Competitive Analysis**: Market positioning and differentiation analysis

### 🔄 Domain Status Evolution
- **Multi-State Lifecycle**: Track domains through pending → fetched → verified → qualified states
- **Cross-Campaign Flow**: Domain selection and data inheritance between campaigns
- **Status Validation**: Business rule enforcement for state transitions
- **Audit Trail**: Complete history of domain status changes and triggers

### 🔍 Contract Drift Detection
- **Real-Time Validation**: Continuous monitoring of frontend/backend contract alignment
- **OpenAPI Synchronization**: Automated spec validation and drift detection
- **Zod-Go Consistency**: Schema alignment between TypeScript and Go models
- **Enum Management**: Cross-layer enum consistency validation and management

### ⚡ Concurrency & Performance Intelligence
- **Streaming Optimization**: High-performance data processing patterns
- **Resource Management**: Memory, CPU, and network optimization strategies
- **Bottleneck Analysis**: Performance monitoring and optimization recommendations
- **Error Recovery**: Circuit breaker patterns and graceful degradation strategies

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### Starting the MCP Server

```bash
npm start
```

### Available Resources

The server provides contextual intelligence through these resource URIs:

- `domainflow://campaign-flow/context` - Campaign architecture and flow analysis
- `domainflow://persona-context/stealth` - Persona management and anti-detection
- `domainflow://keyword-scoring/telecom` - Industry-specific keyword intelligence
- `domainflow://domain-status/evolution` - Domain lifecycle tracking
- `domainflow://contract-drift/detection` - Contract validation and drift monitoring
- `domainflow://concurrency/optimization` - Performance and concurrency patterns
- `domainflow://enum-contracts/validation` - Enum consistency management

### Available Tools

#### Campaign Flow Analyzer
Analyzes campaign phases, dependencies, and transition readiness.

```typescript
{
  "name": "campaign_flow_analyzer",
  "arguments": {
    "campaignId": "uuid",
    "currentPhase": "dns_validation",
    "analysisType": "phase_readiness"
  }
}
```

**Analysis Types:**
- `phase_readiness` - Check if campaign is ready for next phase
- `transition_validation` - Validate specific phase transitions
- `dependency_check` - Verify all dependencies are satisfied
- `flow_optimization` - Identify optimization opportunities
- `bottleneck_detection` - Find performance bottlenecks

#### Lead Scorer
Performs telecom-specific lead scoring and qualification.

```typescript
{
  "name": "lead_scorer",
  "arguments": {
    "domainName": "example-telecom.com",
    "content": "website content...",
    "operation": "score_domain",
    "scoringMethod": "context_aware"
  }
}
```

**Operations:**
- `score_domain` - Score individual domain
- `analyze_keywords` - Extract and analyze keywords
- `qualify_lead` - Comprehensive lead qualification
- `batch_score` - Score multiple domains
- `competitor_analysis` - Competitive positioning analysis
- `market_positioning` - Market segment analysis

#### Persona Configuration Manager
Manages persona configurations and stealth strategies.

```typescript
{
  "name": "persona_configuration_manager",
  "arguments": {
    "operation": "configure",
    "personaId": "http-persona-1",
    "stealthLevel": "aggressive"
  }
}
```

#### Domain Status Tracker
Tracks domain status evolution across campaigns.

```typescript
{
  "name": "domain_status_tracker",
  "arguments": {
    "operation": "track_status",
    "domainId": "domain-uuid",
    "campaignId": "campaign-uuid"
  }
}
```

#### Contract Drift Monitor
Monitors frontend/backend contract alignment.

```typescript
{
  "name": "contract_drift_monitor",
  "arguments": {
    "operation": "detect_drift",
    "scope": "openapi"
  }
}
```

#### Concurrency Pattern Analyzer
Analyzes streaming and concurrency patterns.

```typescript
{
  "name": "concurrency_pattern_analyzer",
  "arguments": {
    "operation": "analyze_performance",
    "component": "dns_validation"
  }
}
```

#### Enum Consistency Validator
Validates enum consistency across layers.

```typescript
{
  "name": "enum_consistency_validator",
  "arguments": {
    "operation": "validate_enums",
    "enumName": "CampaignStatus",
    "layers": ["frontend", "backend", "database"]
  }
}
```

## Integration with DomainFlow

### Campaign Management
The MCP server provides intelligent insights for campaign orchestration:

```typescript
// Example: Check if campaign is ready for DNS validation
const readiness = await mcpClient.callTool('campaign_flow_analyzer', {
  campaignId: 'uuid',
  currentPhase: 'domain_generation',
  analysisType: 'phase_readiness'
});
```

### Lead Scoring Pipeline
Integrate telecom-specific scoring into your lead generation:

```typescript
// Example: Score a domain for telecom relevance
const score = await mcpClient.callTool('lead_scorer', {
  domainName: 'potential-customer.com',
  operation: 'score_domain',
  scoringMethod: 'context_aware'
});
```

### Persona Optimization
Optimize stealth validation strategies:

```typescript
// Example: Configure aggressive stealth for high-value targets
const persona = await mcpClient.callTool('persona_configuration_manager', {
  operation: 'configure',
  personaId: 'premium-persona',
  stealthLevel: 'maximum'
});
```

## Domain-Specific Intelligence

### Telecom Industry Context
- **Service Categories**: Voice, data, internet, infrastructure, enterprise
- **Technology Stack**: 5G, LTE, fiber, MPLS, SD-WAN, VoIP
- **Market Segments**: Residential, business, enterprise, wholesale
- **Geographic Factors**: Regional regulations and market maturity

### Stealth & Anti-Detection
- **Fingerprint Randomization**: Canvas, WebGL, audio, screen fingerprinting countermeasures
- **Behavioral Simulation**: Human-like mouse movements, scrolling, and keyboard patterns
- **Network Protection**: TLS fingerprint spoofing, HTTP header randomization
- **Request Pattern Obfuscation**: Timing jitter, order randomization, fake requests

### Performance Optimization
- **Streaming Patterns**: Batch insertion, backpressure handling, flow control
- **Concurrency Management**: Per-persona limits, adaptive throttling, circuit breakers
- **Resource Management**: Memory optimization, CPU utilization, connection pooling
- **Error Recovery**: Partial failure handling, graceful degradation, retry strategies

## Development

### Building
```bash
npm run build
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## Architecture

The MCP server is organized into several key components:

- **Resources** (`src/resources/`): Context providers for different intelligence domains
- **Tools** (`src/tools/`): Executable analysis and management tools
- **Types** (`src/types/`): Comprehensive TypeScript type definitions
- **Utils** (`src/utils/`): Shared utilities and helpers

### Resource Providers
- `CampaignFlowContextProvider`: Campaign intelligence and flow analysis
- `PersonaContextProvider`: Stealth validation and persona management
- `KeywordScoringContextProvider`: Telecom keyword scoring and lead intelligence

### MCP Tools
- `CampaignFlowAnalyzer`: Phase analysis and transition validation
- `LeadScorer`: Telecom-specific lead scoring and qualification
- Additional tools for domain status, contract drift, concurrency, and enums

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions:
- Create an issue in the repository
- Review the documentation
- Check existing issues for solutions