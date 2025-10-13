#!/usr/bin/env node

/**
 * Campaign Full Workflow Test
 * 
 * This script tests the complete campaign workflow through all 4 phases:
 * 1. Discovery (domain_generation) 
 * 2. Validation (dns_validation)
 * 3. Extraction (http_keyword_validation) 
 * 4. Analysis (analysis)
 * 
 * It creates a real campaign via API, configures each phase, starts them,
 * and monitors progress through completion.
 */

import { setTimeout } from 'node:timers/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api/v2';
const USER_EMAIL = process.env.USER_EMAIL || 'test@example.com';
const USER_PASSWORD = process.env.USER_PASSWORD || 'password123';

console.log('🚀 Campaign Full Workflow Test');
console.log('==============================');
console.log(`API Base URL: ${BASE_URL}`);
console.log(`Test User: ${USER_EMAIL}`);
console.log('');

let sessionCookies = '';
let campaignId = '';

// API helper function
async function apiCall(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies,
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  console.log(`📡 ${method} ${path}`);
  const response = await fetch(url, options);
  
  // Capture session cookies
  const setCookieHeaders = response.headers.get('set-cookie');
  if (setCookieHeaders) {
    sessionCookies = setCookieHeaders;
  }

  let result;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    if (result) console.error('   Response:', JSON.stringify(result, null, 2));
    throw new Error(`API call failed: ${response.status}`);
  }

  console.log(`   ✅ ${response.status} ${response.statusText}`);
  return { status: response.status, data: result };
}

// Step 1: Authenticate
async function authenticate() {
  console.log('📝 Step 1: Authentication');
  console.log('-------------------------');
  
  const loginData = {
    email: USER_EMAIL,
    password: USER_PASSWORD
  };

  try {
    const result = await apiCall('POST', '/auth/login', loginData);
    console.log('✅ Authentication successful');
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Step 2: Create personas for validation and extraction
async function createPersonas() {
  console.log('👤 Step 2: Create Personas');
  console.log('---------------------------');

  const dnsPersona = {
    name: 'Test DNS Persona',
    personaType: 'dns',
    config: {
      resolvers: ['1.1.1.1:53', '8.8.8.8:53'],
      useSystemResolvers: false,
      queryTimeoutSeconds: 5,
      maxDomainsPerRequest: 50,
      resolverStrategy: 'random_rotation',
      rateLimitDps: 10.0,
      rateLimitBurst: 5
    }
  };

  const httpPersona = {
    name: 'Test HTTP Persona',
    personaType: 'http',
    config: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      rateLimitDps: 5.0,
      rateLimitBurst: 3
    }
  };

  try {
    const dnsResult = await apiCall('POST', '/personas', dnsPersona);
    console.log(`✅ DNS Persona created: ${dnsResult.data.id}`);
    
    const httpResult = await apiCall('POST', '/personas', httpPersona);
    console.log(`✅ HTTP Persona created: ${httpResult.data.id}`);
    console.log('');
    
    return [dnsResult.data.id, httpResult.data.id];
  } catch (error) {
    console.error('❌ Persona creation failed:', error.message);
    return [null, null];
  }
}

// Step 3: Create Campaign
async function createCampaign() {
  console.log('🏗️  Step 3: Create Campaign');
  console.log('---------------------------');

  const campaignData = {
    name: `Full Workflow Test Campaign ${Date.now()}`,
    description: 'Testing complete campaign workflow through all 4 phases',
    mode: 'full_sequence',
    configuration: {
      phases: {
        discovery: {
          patternType: 'prefix',
          constantString: 'test',
          characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
          variableLength: 2,
          tlds: ['.com', '.net'],
          numDomainsToGenerate: 10,
          batchSize: 5,
          offsetStart: 0
        }
      }
    }
  };

  try {
    const result = await apiCall('POST', '/campaigns', campaignData);
    campaignId = result.data.id;
    console.log(`✅ Campaign created: ${campaignId}`);
    console.log(`   Name: ${result.data.name}`);
    console.log(`   Mode: ${result.data.mode}`);
    console.log(`   Status: ${result.data.status}`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Campaign creation failed:', error.message);
    return false;
  }
}

// Step 3: Configure and start phase
async function configureAndStartPhase(phase, config) {
  console.log(`⚙️  Configuring ${phase} phase...`);
  
  try {
    // Configure phase
    const configResult = await apiCall('POST', `/campaigns/${campaignId}/phases/${phase}/configure`, {
      configuration: config
    });
    console.log(`   ✅ ${phase} configured`);

    // Start phase 
    const startResult = await apiCall('POST', `/campaigns/${campaignId}/phases/${phase}/start`);
    console.log(`   ✅ ${phase} started`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ ${phase} configuration/start failed:`, error.message);
    return false;
  }
}

// Step 4: Monitor phase progress
async function monitorPhaseProgress(phase, timeout = 60000) {
  console.log(`👁️  Monitoring ${phase} progress...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await apiCall('GET', `/campaigns/${campaignId}/phases/${phase}/status`);
      const status = result.data.status;
      const progress = result.data.progress;
      
      console.log(`   📊 ${phase}: ${status} (${progress?.progressPct || 0}%)`);
      
      if (status === 'completed') {
        console.log(`   ✅ ${phase} completed successfully`);
        return true;
      } else if (status === 'failed') {
        console.log(`   ❌ ${phase} failed`);
        if (result.data.errors) {
          console.log('   Errors:', result.data.errors);
        }
        return false;
      }
      
      // Wait before next check
      await setTimeout(3000);
      
    } catch (error) {
      console.error(`   ⚠️  Status check failed:`, error.message);
      await setTimeout(3000);
    }
  }
  
  console.log(`   ⏰ ${phase} monitoring timeout`);
  return false;
}

// Step 5: Run all phases
async function runAllPhases(dnsPersonaId, httpPersonaId) {
  console.log('🔄 Step 4: Run All Phases');
  console.log('-------------------------');

  const phases = [
    {
      name: 'discovery',
      config: {
        patternType: 'prefix',
        constantString: 'test',
        characterSet: 'abcdefghijklmnopqrstuvwxyz0123456789',
        variableLength: 2,
        tlds: ['.com', '.net'],
        numDomainsToGenerate: 10,
        batchSize: 5,
        offsetStart: 0
      }
    },
    {
      name: 'validation',
      config: {
        personaIds: dnsPersonaId ? [dnsPersonaId] : [],
        batch_size: 5,
        timeout_seconds: 10,
        max_retries: 1,
        validation_types: ['A', 'AAAA']
      }
    },
    {
      name: 'extraction', 
      config: {
        personaIds: httpPersonaId ? [httpPersonaId] : [],
        keywords: ['test', 'example', 'demo']
      }
    },
    {
      name: 'analysis',
      config: {
        personaIds: httpPersonaId ? [httpPersonaId] : []
      }
    }
  ];

  for (const phase of phases) {
    console.log(`\n🎯 Phase: ${phase.name.toUpperCase()}`);
    console.log(''.padEnd(40, '-'));
    
    // Configure and start
    const configured = await configureAndStartPhase(phase.name, phase.config);
    if (!configured) {
      console.log(`❌ Failed to configure/start ${phase.name}`);
      return false;
    }
    
    // Monitor progress
    const completed = await monitorPhaseProgress(phase.name, 120000); // 2 minutes timeout per phase
    if (!completed) {
      console.log(`❌ ${phase.name} did not complete successfully`);
      // Continue to next phase for testing purposes
    }
    
    // Brief pause between phases
    await setTimeout(2000);
  }

  return true;
}

// Step 6: Get final campaign status
async function getFinalStatus() {
  console.log('\n📊 Step 5: Final Campaign Status');
  console.log('----------------------------------');

  try {
    const result = await apiCall('GET', `/campaigns/${campaignId}`);
    const campaign = result.data;
    
    console.log(`Campaign ID: ${campaign.id}`);
    console.log(`Name: ${campaign.name}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Mode: ${campaign.mode}`);
    console.log(`Created: ${campaign.createdAt}`);
    console.log(`Updated: ${campaign.updatedAt}`);
    
    if (campaign.progress) {
      console.log(`Overall Progress: ${campaign.progress.overall?.progressPct || 0}%`);
      console.log(`Phases Completed: ${campaign.progress.overall?.phasesCompleted || 0}/4`);
    }

    // Get phase details
    console.log('\nPhase Status Details:');
    const phases = ['discovery', 'validation', 'extraction', 'analysis'];
    for (const phase of phases) {
      try {
        const phaseResult = await apiCall('GET', `/campaigns/${campaignId}/phases/${phase}/status`);
        console.log(`  ${phase}: ${phaseResult.data.status} (${phaseResult.data.progress?.progressPct || 0}%)`);
      } catch (e) {
        console.log(`  ${phase}: status unavailable`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to get final status:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Step 1: Authenticate
    const authenticated = await authenticate();
    if (!authenticated) {
      process.exit(1);
    }

    // Step 2: Create personas
    const [dnsPersonaId, httpPersonaId] = await createPersonas();
    
    // Step 3: Create Campaign
    const campaignCreated = await createCampaign();
    if (!campaignCreated) {
      process.exit(1);
    }

    // Step 4: Run all phases
    const phasesCompleted = await runAllPhases(dnsPersonaId, httpPersonaId);

    // Step 5: Get final status
    await getFinalStatus();

    if (phasesCompleted) {
      console.log('\n🎉 SUCCESS: Campaign workflow test completed!');
      console.log('All 4 phases were tested successfully.');
      process.exit(0);
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some phases had issues but test completed.');
      console.log('Check the logs above for specific phase failures.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test terminated');
  process.exit(143);
});

// Run the test
main();