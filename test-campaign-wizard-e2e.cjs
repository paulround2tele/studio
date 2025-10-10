#!/usr/bin/env node

/**
 * Campaign Wizard End-to-End Test
 * 
 * This script tests the complete campaign wizard workflow:
 * 1. Campaign creation through the wizard UI
 * 2. Phase 1: Domain Generation (Discovery)
 * 3. Phase 2: DNS Validation 
 * 4. Phase 3: HTTP Keyword Extraction
 * 5. Phase 4: Analysis
 * 
 * Fixes any issues that block the workflow from succeeding.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api/v2';
const FRONTEND_URL = 'http://localhost:3000';

class CampaignWizardTester {
  constructor() {
    this.campaignId = null;
    this.sessionCookies = '';
    this.personas = {
      dns: [],
      http: []
    };
    this.results = {
      creation: null,
      phases: {
        discovery: null,
        validation: null, 
        extraction: null,
        analysis: null
      },
      errors: []
    };
  }

  async apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.sessionCookies,
        ...options.headers
      },
      ...options
    };

    console.log(`🔄 ${options.method || 'GET'} ${endpoint}`);
    
    try {
      const response = await fetch(url, config);
      const responseText = await response.text();
      
      let data = null;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          data = responseText;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      return { success: true, data, status: response.status };
    } catch (error) {
      console.error(`❌ API Error on ${endpoint}:`, error.message);
      this.results.errors.push(`${endpoint}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing backend health...');
    const result = await this.apiRequest('/health');
    
    if (result.success) {
      console.log('✅ Backend is healthy');
      return true;
    } else {
      console.log('❌ Backend health check failed');
      return false;
    }
  }

  async loadPersonas() {
    console.log('\n👤 Loading available personas...');
    const result = await this.apiRequest('/personas');
    
    if (result.success && Array.isArray(result.data)) {
      result.data.forEach(persona => {
        if (persona.personaType === 'dns') {
          this.personas.dns.push(persona.id);
        } else if (persona.personaType === 'http') {
          this.personas.http.push(persona.id);
        }
      });
      
      console.log(`✅ Loaded ${this.personas.dns.length} DNS personas and ${this.personas.http.length} HTTP personas`);
      return true;
    } else {
      console.log('❌ Failed to load personas');
      return false;
    }
  }

  async createCampaign() {
    console.log('\n📝 Creating campaign through API...');
    
    const campaignData = {
      name: `E2E Test Campaign ${Date.now()}`,
      description: 'End-to-end test campaign for wizard functionality',
      mode: 'manual', // Start with manual mode to control phase progression
      configuration: {
        phases: {
          discovery: {
            patternType: 'prefix',
            constantString: 'test',
            characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
            variableLength: 3,
            tlds: ['.com', '.net'],
            numDomainsToGenerate: 10,
            batchSize: 500,
            offsetStart: 0
          }
        }
      }
    };

    const result = await this.apiRequest('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });

    if (result.success && result.data && result.data.id) {
      this.campaignId = result.data.id;
      this.results.creation = { success: true, campaignId: this.campaignId };
      console.log(`✅ Campaign created successfully: ${this.campaignId}`);
      return true;
    } else {
      this.results.creation = { success: false, error: result.error };
      console.log(`❌ Campaign creation failed: ${result.error}`);
      return false;
    }
  }

  async getCampaignDetails() {
    if (!this.campaignId) return null;
    
    console.log(`\n📋 Getting campaign details for ${this.campaignId}...`);
    const result = await this.apiRequest(`/campaigns/${this.campaignId}`);
    
    if (result.success) {
      console.log('✅ Campaign details retrieved');
      return result.data;
    } else {
      console.log('❌ Failed to get campaign details');
      return null;
    }
  }

  async startPhase(phaseName, configuration = {}) {
    if (!this.campaignId) return false;
    
    console.log(`\n🚀 Starting ${phaseName} phase...`);
    
    // First configure the phase if configuration provided
    if (Object.keys(configuration).length > 0) {
      const configResult = await this.apiRequest(`/campaigns/${this.campaignId}/phases/${phaseName}/configure`, {
        method: 'POST', 
        body: JSON.stringify({ configuration })
      });
      
      if (!configResult.success) {
        console.log(`❌ Phase configuration failed: ${configResult.error}`);
        return false;
      }
      console.log(`✅ Phase ${phaseName} configured`);
    }

    // Start the phase
    const startResult = await this.apiRequest(`/campaigns/${this.campaignId}/phases/${phaseName}/start`, {
      method: 'POST'
    });

    if (startResult.success) {
      console.log(`✅ Phase ${phaseName} started successfully`);
      return true;
    } else {
      console.log(`❌ Phase ${phaseName} start failed: ${startResult.error}`);
      return false;
    }
  }

  async waitForPhaseCompletion(phaseName, maxWaitTime = 30000) {
    if (!this.campaignId) return false;
    
    console.log(`\n⏱️ Waiting for ${phaseName} phase completion (max ${maxWaitTime}ms)...`);
    
    const startTime = Date.now();
    let lastStatus = '';

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.apiRequest(`/campaigns/${this.campaignId}/phases/${phaseName}/status`);
      
      if (result.success && result.data) {
        const phase = result.data;
        
        if (phase.status !== lastStatus) {
          const progress = phase.progress ? ` (${phase.progress.percentComplete || 0}%)` : '';
          console.log(`📊 Phase ${phaseName} status: ${phase.status}${progress}`);
          lastStatus = phase.status;
        }

        if (phase.status === 'completed') {
          console.log(`✅ Phase ${phaseName} completed successfully`);
          if (phase.progress) {
            console.log(`   📈 Progress: ${phase.progress.successfulItems}/${phase.progress.totalItems} items processed`);
          }
          return true;
        }
        
        if (phase.status === 'failed') {
          console.log(`❌ Phase ${phaseName} failed: ${phase.errors ? phase.errors[0]?.message : 'Unknown error'}`);
          return false;
        }
      } else {
        console.log(`⚠️ Could not get phase status: ${result.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }

    console.log(`⚠️ Phase ${phaseName} did not complete within ${maxWaitTime}ms`);
    return false;
  }

  async testDiscoveryPhase() {
    console.log('\n🔍 Testing Discovery Phase (Domain Generation)...');
    
    const configuration = {
      patternType: 'prefix',
      constantString: 'test',
      characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
      variableLength: 3,
      tlds: ['.com', '.net'],
      numDomainsToGenerate: 10,
      batchSize: 500,
      offsetStart: 0
    };

    const started = await this.startPhase('domain_generation', configuration);
    if (!started) {
      this.results.phases.discovery = { success: false, error: 'Failed to start' };
      return false;
    }

    const completed = await this.waitForPhaseCompletion('domain_generation', 60000);
    this.results.phases.discovery = { success: completed };
    
    if (completed) {
      // Check generated domains
      const domainsResult = await this.apiRequest(`/campaigns/${this.campaignId}/domains`);
      if (domainsResult.success && domainsResult.data && domainsResult.data.length > 0) {
        console.log(`✅ Generated ${domainsResult.data.length} domains`);
      }
    }
    
    return completed;
  }

  async testValidationPhase() {
    console.log('\n🔍 Testing Validation Phase (DNS Validation)...');
    
    if (this.personas.dns.length === 0) {
      console.log('❌ No DNS personas available for validation phase');
      this.results.phases.validation = { success: false, error: 'No DNS personas available' };
      return false;
    }
    
    const configuration = {
      personaIds: [this.personas.dns[0]], // Use first available DNS persona
      batch_size: 25,
      timeout_seconds: 10,
      max_retries: 1,
      validation_types: ['A']
    };

    const started = await this.startPhase('dns_validation', configuration);
    if (!started) {
      this.results.phases.validation = { success: false, error: 'Failed to start' };
      return false;
    }

    const completed = await this.waitForPhaseCompletion('dns_validation', 120000);
    this.results.phases.validation = { success: completed };
    return completed;
  }

  async testExtractionPhase() {
    console.log('\n🔍 Testing Extraction Phase (HTTP Keyword Extraction)...');
    
    if (this.personas.http.length === 0) {
      console.log('❌ No HTTP personas available for extraction phase');
      this.results.phases.extraction = { success: false, error: 'No HTTP personas available' };
      return false;
    }
    
    const configuration = {
      personaIds: [this.personas.http[0]], // Use first available HTTP persona
      keywords: ['test', 'domain', 'website'],
      enrichmentEnabled: true, // Enable enrichment for analysis phase
      microCrawlEnabled: true,
      microCrawlMaxPages: 2,
      microCrawlByteBudget: 50000
    };

    const started = await this.startPhase('http_keyword_validation', configuration);
    if (!started) {
      this.results.phases.extraction = { success: false, error: 'Failed to start' };
      return false;
    }

    const completed = await this.waitForPhaseCompletion('http_keyword_validation', 120000);
    this.results.phases.extraction = { success: completed };
    return completed;
  }

  async testAnalysisPhase() {
    console.log('\n🔍 Testing Analysis Phase...');
    
    // Analysis phase seems to require personas too (could be DNS or HTTP personas)
    const availablePersonas = [...this.personas.dns, ...this.personas.http];
    if (availablePersonas.length === 0) {
      console.log('❌ No personas available for analysis phase');
      this.results.phases.analysis = { success: false, error: 'No personas available' };
      return false;
    }
    
    const configuration = {
      personaIds: [availablePersonas[0]] // Use first available persona
    };

    const started = await this.startPhase('analysis', configuration);
    if (!started) {
      this.results.phases.analysis = { success: false, error: 'Failed to start' };
      return false;
    }

    const completed = await this.waitForPhaseCompletion('analysis', 60000);
    this.results.phases.analysis = { success: completed };
    return completed;
  }

  async runFullTest() {
    console.log('🧪 Starting Campaign Wizard End-to-End Test');
    console.log('=' .repeat(50));

    // Test backend health
    const healthOk = await this.testHealthCheck();
    if (!healthOk) {
      console.log('❌ Backend is not healthy, aborting test');
      return;
    }

    // Load available personas
    const personasOk = await this.loadPersonas();
    if (!personasOk) {
      console.log('❌ Failed to load personas, aborting test');
      return;
    }

    // Create campaign
    const campaignCreated = await this.createCampaign();
    if (!campaignCreated) {
      console.log('❌ Campaign creation failed, aborting test');
      return;
    }

    // Get initial campaign state
    await this.getCampaignDetails();

    // Run all phases sequentially
    const discoveryOk = await this.testDiscoveryPhase();
    if (discoveryOk) {
      const validationOk = await this.testValidationPhase();
      if (validationOk) {
        const extractionOk = await this.testExtractionPhase();
        if (extractionOk) {
          await this.testAnalysisPhase();
        }
      }
    }

    // Print final results
    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));

    const { creation, phases, errors } = this.results;

    console.log(`Campaign Creation: ${creation?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (creation?.campaignId) {
      console.log(`  Campaign ID: ${creation.campaignId}`);
    }
    if (creation?.error) {
      console.log(`  Error: ${creation.error}`);
    }

    console.log('\nPhase Results:');
    Object.entries(phases).forEach(([phase, result]) => {
      const status = result?.success ? '✅ SUCCESS' : result === null ? '⏸️ NOT RUN' : '❌ FAILED';
      console.log(`  ${phase.charAt(0).toUpperCase() + phase.slice(1)}: ${status}`);
      if (result?.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`  • ${error}`));
    }

    const allSuccessful = creation?.success && 
                         Object.values(phases).every(p => p?.success === true);
    
    console.log(`\n🎯 Overall Result: ${allSuccessful ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allSuccessful) {
      console.log('\n🎉 Campaign wizard workflow completed successfully through all 4 phases!');
    } else {
      console.log('\n⚠️ Some issues were found. Check the errors above for details.');
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new CampaignWizardTester();
  tester.runFullTest().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = CampaignWizardTester;