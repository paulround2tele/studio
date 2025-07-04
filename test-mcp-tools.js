#!/usr/bin/env node

/**
 * Comprehensive MCP Tools Test Suite
 * Tests both new business domain tools and existing core functionality
 * Connects directly to MCP server via JSON-RPC 2.0 over stdin/stdout
 */

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class MCPTestClient {
  constructor() {
    this.serverProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      toolResults: new Map(),
      totalTools: 0
    };
    this.isInitialized = false;
  }

  /**
   * Start the MCP server process
   */
  async startServer() {
    console.log('🚀 Starting MCP server...');
    
    this.serverProcess = spawn('./bin/mcp-server', [], {
      cwd: path.join(process.cwd(), 'mcp'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // Handle server stderr for debugging
    this.serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[SERVER] ${message}`);
      }
    });

    // Set up readline interface for server stdout
    this.rl = readline.createInterface({
      input: this.serverProcess.stdout,
      output: process.stdout,
      terminal: false
    });

    // Handle server responses
    this.rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          console.error('❌ Failed to parse server response:', error);
          console.error('Raw response:', line);
        }
      }
    });

    this.serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Give server time to start
    await this.sleep(2000);
  }

  /**
   * Send a JSON-RPC request to the server
   */
  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, method });
      
      const requestLine = JSON.stringify(request) + '\n';
      this.serverProcess.stdin.write(requestLine);
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Handle server response
   */
  handleResponse(response) {
    const { id, result, error } = response;
    
    if (this.pendingRequests.has(id)) {
      const { resolve, reject, method } = this.pendingRequests.get(id);
      this.pendingRequests.delete(id);
      
      if (error) {
        reject(new Error(`${method}: ${JSON.stringify(error)}`));
      } else {
        resolve(result);
      }
    }
  }

  /**
   * Initialize the MCP connection
   */
  async initialize() {
    console.log('🔌 Initializing MCP connection...');
    
    try {
      const result = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-tools-test-client',
          version: '1.0.0'
        }
      });
      
      console.log('✅ MCP initialization successful');
      console.log(`   Protocol version: ${result.protocolVersion}`);
      console.log(`   Server: ${result.serverInfo.name} v${result.serverInfo.version}`);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ MCP initialization failed:', error.message);
      return false;
    }
  }

  /**
   * List all available tools
   */
  async listTools() {
    console.log('\n📋 Listing available tools...');
    
    try {
      const result = await this.sendRequest('tools/list');
      const tools = result.tools || [];
      
      this.testResults.totalTools = tools.length;
      console.log(`✅ Found ${tools.length} tools`);
      
      // Group tools by category for better organization
      const categories = this.categorizeTools(tools);
      
      console.log('\n📚 Tool Categories:');
      for (const [category, categoryTools] of Object.entries(categories)) {
        console.log(`   ${category}: ${categoryTools.length} tools`);
      }
      
      return tools;
    } catch (error) {
      console.error('❌ Failed to list tools:', error.message);
      this.testResults.errors.push(`tools/list: ${error.message}`);
      return [];
    }
  }

  /**
   * Categorize tools for better organization
   */
  categorizeTools(tools) {
    const categories = {
      'Database': [],
      'Code Analysis': [],
      'Configuration': [],
      'Search': [],
      'WebSocket': [],
      'Business Logic': [],
      'Advanced': [],
      'Interactive': [],
      'Frontend': [],
      'Business Domain': [],
      'Security': [],
      'Other': []
    };

    for (const tool of tools) {
      const name = tool.name;
      
      if (name.includes('database') || name.includes('schema')) {
        categories['Database'].push(tool);
      } else if (name.includes('frontend_') || name.includes('react') || name.includes('nextjs')) {
        categories['Frontend'].push(tool);
      } else if (name.includes('business') || name.includes('keyword') || name.includes('proxy')) {
        categories['Business Domain'].push(tool);
      } else if (name.includes('security') || name.includes('auth')) {
        categories['Security'].push(tool);
      } else if (name.includes('websocket')) {
        categories['WebSocket'].push(tool);
      } else if (name.includes('search') || name.includes('find') || name.includes('get_references')) {
        categories['Search'].push(tool);
      } else if (name.includes('config') || name.includes('middleware') || name.includes('env')) {
        categories['Configuration'].push(tool);
      } else if (name.includes('terminal') || name.includes('playwright') || name.includes('browse')) {
        categories['Interactive'].push(tool);
      } else if (name.includes('models') || name.includes('routes') || name.includes('handlers') || name.includes('services')) {
        categories['Code Analysis'].push(tool);
      } else if (name.includes('analyze') || name.includes('snapshot') || name.includes('impact')) {
        categories['Advanced'].push(tool);
      } else {
        categories['Other'].push(tool);
      }
    }

    return categories;
  }

  /**
   * Test a specific tool
   */
  async testTool(toolName, params = {}) {
    this.testResults.total++;
    
    try {
      console.log(`\n🔧 Testing tool: ${toolName}`);
      const startTime = Date.now();
      
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: params
      });
      
      const duration = Date.now() - startTime;
      
      // Validate response structure
      if (!result || !result.content) {
        throw new Error('Invalid response structure: missing content');
      }
      
      // Check if content has expected structure
      if (!Array.isArray(result.content)) {
        throw new Error('Invalid response structure: content should be array');
      }
      
      let responseSize = 0;
      let hasTextContent = false;
      
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          responseSize += item.text.length;
          hasTextContent = true;
        }
      }
      
      if (!hasTextContent) {
        throw new Error('No text content in response');
      }
      
      console.log(`   ✅ ${toolName} - ${duration}ms (${responseSize} chars)`);
      
      this.testResults.passed++;
      this.testResults.toolResults.set(toolName, {
        status: 'passed',
        duration,
        responseSize,
        error: null
      });
      
      return result;
      
    } catch (error) {
      console.log(`   ❌ ${toolName} - ${error.message}`);
      
      this.testResults.failed++;
      this.testResults.errors.push(`${toolName}: ${error.message}`);
      this.testResults.toolResults.set(toolName, {
        status: 'failed',
        duration: 0,
        responseSize: 0,
        error: error.message
      });
      
      return null;
    }
  }

  /**
   * Test new business domain tools
   */
  async testNewBusinessDomainTools() {
    console.log('\n🏢 Testing NEW Business Domain Tools...');
    
    const newTools = [
      'frontend_api_client_analysis',
      'get_business_domains',
      'get_keyword_extraction_services',
      'get_keyword_scanning_services',
      'get_proxy_management_services',
      'get_keyword_set_api_specs',
      'get_proxy_pool_api_specs',
      'get_advanced_tooling',
      'get_database_tooling_analysis',
      'get_business_domain_routes',
      'get_enhanced_dependencies',
      'get_enhanced_security_analysis',
      'get_enhanced_api_schema',
      'get_business_domain_middleware',
      'get_internal_service_dependencies',
      'get_business_domain_cross_dependencies'
    ];
    
    for (const tool of newTools) {
      await this.testTool(tool);
      await this.sleep(100); // Brief pause between tests
    }
  }

  /**
   * Test existing core tools
   */
  async testExistingCoreTools() {
    console.log('\n🔧 Testing EXISTING Core Tools...');
    
    const coreTools = [
      'get_database_schema',
      'get_backend_api_routes',
      'get_backend_data_models',
      'search_code',
      'get_websocket_endpoints',
      'frontend_nextjs_app_routes',
      'get_backend_services',
      'get_config',
      'get_middleware',
      'get_package_structure',
      'get_dependencies',
      'frontend_react_component_tree',
      'frontend_react_component_props'
    ];
    
    for (const tool of coreTools) {
      await this.testTool(tool);
      await this.sleep(100); // Brief pause between tests
    }
    
    // Test search_code with a parameter
    await this.testTool('search_code', { query: 'func' });
  }

  /**
   * Test enhanced functionality verification
   */
  async testEnhancedFunctionality() {
    console.log('\n✨ Testing Enhanced Functionality...');
    
    // Test that enhanced route detection includes new domains
    const routesResult = await this.testTool('get_backend_api_routes');
    if (routesResult) {
      const routesText = this.extractTextFromContent(routesResult.content);
      const hasKeywordSets = routesText.includes('keyword-sets') || routesText.includes('keywords');
      const hasProxyPools = routesText.includes('proxy-pools') || routesText.includes('proxies');
      
      console.log(`   📋 Route detection includes keyword-sets: ${hasKeywordSets ? '✅' : '❌'}`);
      console.log(`   📋 Route detection includes proxy-pools: ${hasProxyPools ? '✅' : '❌'}`);
    }
    
    // Test frontend analysis reflects mature state
    const frontendResult = await this.testTool('frontend_api_client_analysis');
    if (frontendResult) {
      const frontendText = this.extractTextFromContent(frontendResult.content);
      const hasTypescript = frontendText.toLowerCase().includes('typescript');
      const hasAPIClasses = frontendText.includes('API Classes') || frontendText.includes('api_classes');
      
      console.log(`   🎨 Frontend analysis shows TypeScript: ${hasTypescript ? '✅' : '❌'}`);
      console.log(`   🎨 Frontend analysis shows API classes: ${hasAPIClasses ? '✅' : '❌'}`);
    }
    
    // Test business domain categorization
    const domainsResult = await this.testTool('get_business_domains');
    if (domainsResult) {
      const domainsText = this.extractTextFromContent(domainsResult.content);
      const hasKeywordDomain = domainsText.toLowerCase().includes('keyword');
      const hasProxyDomain = domainsText.toLowerCase().includes('proxy');
      
      console.log(`   🏢 Business domains include keyword domain: ${hasKeywordDomain ? '✅' : '❌'}`);
      console.log(`   🏢 Business domains include proxy domain: ${hasProxyDomain ? '✅' : '❌'}`);
    }
  }

  /**
   * Test error handling and edge cases
   */
  async testErrorHandling() {
    console.log('\n🚨 Testing Error Handling...');
    
    // Test invalid tool name
    await this.testTool('invalid_tool_name_123');
    
    // Test malformed requests
    try {
      await this.sendRequest('tools/call', {
        name: 'search_code'
        // missing required 'query' parameter
      });
    } catch (error) {
      console.log(`   ✅ Correctly handled missing parameter: ${error.message.substring(0, 50)}...`);
    }
    
    // Test tool with invalid parameters
    await this.testTool('find_implementations', { interface: '' });
    await this.testTool('get_references', { symbol: '' });
  }

  /**
   * Extract text content from MCP response
   */
  extractTextFromContent(content) {
    if (!Array.isArray(content)) return '';
    
    return content
      .filter(item => item.type === 'text' && item.text)
      .map(item => item.text)
      .join('\n');
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE MCP TOOLS TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total tests: ${this.testResults.total}`);
    console.log(`   Passed: ${this.testResults.passed} ✅`);
    console.log(`   Failed: ${this.testResults.failed} ❌`);
    console.log(`   Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    console.log(`   Total tools discovered: ${this.testResults.totalTools}`);
    
    // Performance summary
    const passedTools = Array.from(this.testResults.toolResults.entries())
      .filter(([, result]) => result.status === 'passed');
    
    if (passedTools.length > 0) {
      const avgDuration = passedTools.reduce((sum, [, result]) => sum + result.duration, 0) / passedTools.length;
      const avgResponseSize = passedTools.reduce((sum, [, result]) => sum + result.responseSize, 0) / passedTools.length;
      
      console.log(`\n⚡ Performance:`);
      console.log(`   Average response time: ${avgDuration.toFixed(0)}ms`);
      console.log(`   Average response size: ${avgResponseSize.toFixed(0)} characters`);
    }
    
    // Failed tools summary
    if (this.testResults.failed > 0) {
      console.log(`\n❌ Failed Tools:`);
      for (const [toolName, result] of this.testResults.toolResults.entries()) {
        if (result.status === 'failed') {
          console.log(`   • ${toolName}: ${result.error}`);
        }
      }
    }
    
    // Tool category analysis
    console.log(`\n📋 Tool Categories Status:`);
    const categorizedResults = this.categorizeFinalResults();
    for (const [category, stats] of Object.entries(categorizedResults)) {
      if (stats.total > 0) {
        const successRate = ((stats.passed / stats.total) * 100).toFixed(0);
        console.log(`   ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
      }
    }
    
    // Business domain tools specific analysis
    console.log(`\n🏢 Business Domain Tools Analysis:`);
    const businessDomainTools = Array.from(this.testResults.toolResults.entries())
      .filter(([toolName]) => toolName.includes('business') || toolName.includes('keyword') || toolName.includes('proxy'));
    
    const businessDomainPassed = businessDomainTools.filter(([, result]) => result.status === 'passed').length;
    const businessDomainTotal = businessDomainTools.length;
    
    console.log(`   New business domain tools: ${businessDomainPassed}/${businessDomainTotal} passed`);
    console.log(`   Business domain success rate: ${businessDomainTotal > 0 ? ((businessDomainPassed / businessDomainTotal) * 100).toFixed(1) : 0}%`);
    
    // Save detailed report to file
    this.saveDetailedReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('📄 Detailed report saved to: mcp-test-report.json');
    console.log('='.repeat(60));
  }

  /**
   * Categorize final results for analysis
   */
  categorizeFinalResults() {
    const categories = {
      'Database': { passed: 0, total: 0 },
      'Frontend': { passed: 0, total: 0 },
      'Business Domain': { passed: 0, total: 0 },
      'Code Analysis': { passed: 0, total: 0 },
      'Configuration': { passed: 0, total: 0 },
      'Search': { passed: 0, total: 0 },
      'WebSocket': { passed: 0, total: 0 },
      'Security': { passed: 0, total: 0 },
      'Advanced': { passed: 0, total: 0 },
      'Other': { passed: 0, total: 0 }
    };

    for (const [toolName, result] of this.testResults.toolResults.entries()) {
      let category = 'Other';
      
      if (toolName.includes('database') || toolName.includes('schema')) {
        category = 'Database';
      } else if (toolName.includes('frontend_') || toolName.includes('react') || toolName.includes('nextjs')) {
        category = 'Frontend';
      } else if (toolName.includes('business') || toolName.includes('keyword') || toolName.includes('proxy')) {
        category = 'Business Domain';
      } else if (toolName.includes('security') || toolName.includes('auth')) {
        category = 'Security';
      } else if (toolName.includes('websocket')) {
        category = 'WebSocket';
      } else if (toolName.includes('search') || toolName.includes('find') || toolName.includes('get_references')) {
        category = 'Search';
      } else if (toolName.includes('config') || toolName.includes('middleware') || toolName.includes('env')) {
        category = 'Configuration';
      } else if (toolName.includes('models') || toolName.includes('routes') || toolName.includes('handlers') || toolName.includes('services')) {
        category = 'Code Analysis';
      } else if (toolName.includes('analyze') || toolName.includes('snapshot') || toolName.includes('impact')) {
        category = 'Advanced';
      }
      
      categories[category].total++;
      if (result.status === 'passed') {
        categories[category].passed++;
      }
    }

    return categories;
  }

  /**
   * Save detailed report to JSON file
   */
  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: (this.testResults.passed / this.testResults.total * 100).toFixed(1),
        totalToolsDiscovered: this.testResults.totalTools
      },
      toolResults: Object.fromEntries(this.testResults.toolResults),
      errors: this.testResults.errors,
      categoryAnalysis: this.categorizeFinalResults()
    };
    
    fs.writeFileSync('mcp-test-report.json', JSON.stringify(report, null, 2));
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.rl) {
      this.rl.close();
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      // Wait a bit for graceful shutdown
      await this.sleep(1000);
      
      if (!this.serverProcess.killed) {
        this.serverProcess.kill('SIGKILL');
      }
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the complete test suite
   */
  async runTests() {
    try {
      console.log('🧪 Starting Comprehensive MCP Tools Test Suite');
      console.log('=' + '='.repeat(50));
      
      // 1. Start server
      await this.startServer();
      
      // 2. Initialize connection
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize MCP connection');
      }
      
      // 3. List tools
      const tools = await this.listTools();
      if (tools.length === 0) {
        throw new Error('No tools discovered');
      }
      
      // 4. Test new business domain tools
      await this.testNewBusinessDomainTools();
      
      // 5. Test existing core tools
      await this.testExistingCoreTools();
      
      // 6. Test enhanced functionality
      await this.testEnhancedFunctionality();
      
      // 7. Test error handling
      await this.testErrorHandling();
      
      // 8. Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      this.testResults.errors.push(`Test suite: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test suite
async function main() {
  const testClient = new MCPTestClient();
  await testClient.runTests();
  
  // Exit with appropriate code
  const exitCode = testClient.testResults.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MCPTestClient;