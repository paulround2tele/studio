# Enhanced MCP Server for DomainFlow - Usage Guide

## Quick Start

### 1. Installation and Setup

```bash
# Navigate to MCP server directory
cd mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the server
npm start
```

### 2. Basic Usage Examples

#### Campaign Flow Analysis

**Check Campaign Readiness:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "campaign_flow_analyzer",
    "arguments": {
      "campaignId": "550e8400-e29b-41d4-a716-446655440000",
      "currentPhase": "domain_generation",
      "analysisType": "phase_readiness"
    }
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "success": true,
        "data": {
          "phase": "dns_validation",
          "readinessScore": 85,
          "readinessStatus": "ready",
          "requirements": {
            "data": {
              "status": "satisfied",
              "details": "Generated domains available (1,247 domains)"
            },
            "resources": {
              "status": "satisfied", 
              "details": "3 DNS personas active, 50 proxies available"
            }
          },
          "recommendations": [
            "Add 2 more DNS personas for better load distribution",
            "Monitor system resources during execution"
          ]
        }
      }
    }
  ]
}
```

#### Lead Scoring

**Score a Domain:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "lead_scorer", 
    "arguments": {
      "domainName": "example-telecom.com",
      "operation": "score_domain",
      "scoringMethod": "context_aware",
      "includeRecommendations": true
    }
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "success": true,
        "data": {
          "domainName": "example-telecom.com",
          "overallScore": 78,
          "qualificationStatus": "qualified",
          "categoryBreakdown": {
            "service": 85,
            "technology": 75,
            "business": 80,
            "contact": 70,
            "location": 65
          },
          "businessIntelligence": {
            "primaryServices": ["fiber internet", "business phone", "managed IT"],
            "targetMarket": "enterprise",
            "technicalCapabilities": ["fiber deployment", "5G services"]
          },
          "nextSteps": [
            "Research company background",
            "Prepare service overview",
            "Schedule discovery call"
          ]
        }
      }
    }
  ]
}
```

#### Persona Management

**Configure Stealth Persona:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "persona_configuration_manager",
    "arguments": {
      "operation": "configure",
      "personaId": "http-stealth-1",
      "stealthLevel": "aggressive"
    }
  }
}
```

### 3. Resource Access Examples

#### Campaign Flow Context

**Get Campaign Flow Rules:**
```json
{
  "method": "resources/read",
  "params": {
    "uri": "domainflow://campaign-flow/flow_rules"
  }
}
```

**Response:**
```json
{
  "contents": [
    {
      "uri": "domainflow://campaign-flow/flow_rules",
      "mimeType": "application/json",
      "text": {
        "flowRules": {
          "domainGeneration": {
            "outputs": "generated_domains[]",
            "nextPhase": "dns_validation",
            "gating": "completion_required"
          },
          "dnsValidation": {
            "inputs": "validated_domains_from_generation",
            "outputs": "dns_verified_domains[]",
            "nextPhase": "http_keyword_validation", 
            "gating": "min_success_threshold"
          }
        },
        "phaseOrder": ["domain_generation", "dns_validation", "http_keyword_validation"]
      }
    }
  ]
}
```

#### Persona Context

**Get Stealth Strategies:**
```json
{
  "method": "resources/read", 
  "params": {
    "uri": "domainflow://persona-context/stealth_strategies"
  }
}
```

#### Keyword Intelligence

**Get Telecom Keywords:**
```json
{
  "method": "resources/read",
  "params": {
    "uri": "domainflow://keyword-scoring/telecom_keywords"
  }
}
```

## Advanced Usage Patterns

### 1. Campaign Optimization Workflow

```typescript
// 1. Analyze current campaign status
const readiness = await client.callTool('campaign_flow_analyzer', {
  campaignId: campaignId,
  analysisType: 'phase_readiness'
});

// 2. Check for bottlenecks
const bottlenecks = await client.callTool('campaign_flow_analyzer', {
  campaignId: campaignId,
  analysisType: 'bottleneck_detection'
});

// 3. Optimize flow based on findings
if (bottlenecks.data.bottlenecks.length > 0) {
  const optimization = await client.callTool('campaign_flow_analyzer', {
    campaignId: campaignId,
    analysisType: 'flow_optimization',
    includeRecommendations: true
  });
}
```

### 2. Lead Qualification Pipeline

```typescript
// 1. Score domain for telecom relevance
const scoring = await client.callTool('lead_scorer', {
  domainName: domain,
  operation: 'score_domain',
  scoringMethod: 'context_aware'
});

// 2. If qualified, perform detailed analysis
if (scoring.data.overallScore >= 60) {
  const qualification = await client.callTool('lead_scorer', {
    domainName: domain,
    operation: 'qualify_lead',
    analysisDepth: 'comprehensive'
  });
  
  // 3. Analyze competitive positioning
  const competitive = await client.callTool('lead_scorer', {
    domainName: domain,
    operation: 'competitor_analysis'
  });
}
```

### 3. Persona Rotation Strategy

```typescript
// 1. Analyze current persona performance
const performance = await client.callTool('concurrency_pattern_analyzer', {
  operation: 'analyze_performance',
  component: 'http_validation'
});

// 2. Configure optimal persona settings
if (performance.data.utilization > 80) {
  await client.callTool('persona_configuration_manager', {
    operation: 'optimize',
    stealthLevel: 'moderate' // Reduce overhead
  });
}

// 3. Monitor for detection events
const detection = await client.readResource('domainflow://persona-context/detection_report');
```

### 4. Contract Validation Monitoring

```typescript
// 1. Validate OpenAPI contracts
const apiValidation = await client.callTool('contract_drift_monitor', {
  operation: 'validate_contracts',
  scope: 'openapi'
});

// 2. Check enum consistency
const enumValidation = await client.callTool('enum_consistency_validator', {
  operation: 'validate_enums',
  layers: ['frontend', 'backend', 'database']
});

// 3. Monitor for drift
if (apiValidation.data.driftDetected) {
  const drift = await client.callTool('contract_drift_monitor', {
    operation: 'detect_drift',
    scope: 'all'
  });
}
```

## Integration Patterns

### 1. Campaign Management Integration

```typescript
class CampaignOrchestrator {
  constructor(private mcpClient: MCPClient) {}
  
  async validatePhaseTransition(campaignId: string, fromPhase: string, toPhase: string) {
    const validation = await this.mcpClient.callTool('campaign_flow_analyzer', {
      campaignId,
      currentPhase: fromPhase,
      targetPhase: toPhase,
      analysisType: 'transition_validation'
    });
    
    return validation.data.canTransition;
  }
  
  async optimizeCampaignFlow(campaignId: string) {
    const optimization = await this.mcpClient.callTool('campaign_flow_analyzer', {
      campaignId,
      analysisType: 'flow_optimization',
      includeRecommendations: true
    });
    
    return optimization.data.optimizationOpportunities;
  }
}
```

### 2. Lead Scoring Service

```typescript
class LeadScoringService {
  constructor(private mcpClient: MCPClient) {}
  
  async scoreLead(domainName: string, content?: string) {
    const result = await this.mcpClient.callTool('lead_scorer', {
      domainName,
      content,
      operation: 'comprehensive_scoring',
      includeRecommendations: true
    });
    
    return {
      score: result.data.executiveSummary.overallScore,
      qualification: result.data.executiveSummary.qualificationStatus,
      recommendations: result.data.strategicRecommendations
    };
  }
  
  async batchScore(domains: Array<{name: string, content?: string}>) {
    return await this.mcpClient.callTool('lead_scorer', {
      operation: 'batch_score',
      domains,
      scoringMethod: 'weighted_sum' // Faster for batch processing
    });
  }
}
```

### 3. Persona Management Service

```typescript
class PersonaManager {
  constructor(private mcpClient: MCPClient) {}
  
  async optimizePersonaForTarget(targetType: 'high_value' | 'standard' | 'bulk') {
    const stealthLevel = {
      'high_value': 'maximum',
      'standard': 'moderate', 
      'bulk': 'basic'
    }[targetType];
    
    return await this.mcpClient.callTool('persona_configuration_manager', {
      operation: 'configure',
      stealthLevel
    });
  }
  
  async rotatePersonas() {
    return await this.mcpClient.callTool('persona_configuration_manager', {
      operation: 'rotate'
    });
  }
}
```

### 4. System Health Monitoring

```typescript
class SystemHealthMonitor {
  constructor(private mcpClient: MCPClient) {}
  
  async checkSystemHealth() {
    const [performance, contracts, concurrency] = await Promise.all([
      this.mcpClient.callTool('campaign_flow_analyzer', {
        analysisType: 'bottleneck_detection'
      }),
      this.mcpClient.callTool('contract_drift_monitor', {
        operation: 'detect_drift'
      }),
      this.mcpClient.callTool('concurrency_pattern_analyzer', {
        operation: 'analyze_performance'
      })
    ]);
    
    return {
      performance: performance.data,
      contracts: contracts.data,
      concurrency: concurrency.data,
      overallHealth: this.calculateOverallHealth([performance, contracts, concurrency])
    };
  }
}
```

## Best Practices

### 1. Resource Usage
- Use specific resource URIs for targeted context
- Cache frequently accessed resources
- Use batch operations for multiple domains
- Monitor resource usage and performance

### 2. Tool Execution
- Validate parameters before tool calls
- Handle errors gracefully with fallbacks
- Use appropriate analysis depth for use case
- Monitor tool execution performance

### 3. Performance Optimization
- Use basic scoring for bulk operations
- Apply comprehensive analysis for high-value targets
- Implement caching for repeated operations
- Monitor system resources and bottlenecks

### 4. Error Handling
- Implement retry logic for transient failures
- Validate tool responses before processing
- Log errors for debugging and monitoring
- Provide meaningful error messages to users

### 5. Security Considerations
- Rotate personas regularly for stealth operations
- Monitor for detection events
- Use appropriate stealth levels for different targets
- Validate all inputs and sanitize outputs