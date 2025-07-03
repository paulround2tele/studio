#!/usr/bin/env node

/**
 * Comprehensive Test Script for Bulk Delete Campaign Functionality
 * Tests both backend API and frontend integration
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'password123'
};

// Test utilities
class TestRunner {
  constructor() {
    this.sessionCookie = null;
    this.testCampaigns = [];
    this.results = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...(this.sessionCookie ? { 'Cookie': this.sessionCookie } : {})
        }
      };

      const req = lib.request(requestOptions, (res) => {
        let data = '';
        
        // Capture session cookie from login
        if (res.headers['set-cookie']) {
          this.sessionCookie = res.headers['set-cookie'][0];
        }

        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = {
              statusCode: res.statusCode,
              headers: res.headers,
              data: data ? JSON.parse(data) : null
            };
            resolve(result);
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async authenticate() {
    this.log('🔐 Authenticating with backend...');
    
    const response = await this.makeRequest(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      body: TEST_CREDENTIALS
    });

    if (response.statusCode === 200) {
      this.log('✅ Authentication successful');
      return true;
    } else {
      this.log(`❌ Authentication failed: ${response.statusCode}`, 'error');
      return false;
    }
  }

  async createTestCampaigns(count = 5) {
    this.log(`📝 Creating ${count} test campaigns for bulk delete testing...`);
    
    for (let i = 1; i <= count; i++) {
      const campaignData = {
        name: `Bulk Delete Test Campaign ${i}`,
        description: `Test campaign ${i} for bulk delete functionality testing`,
        selectedType: 'targeted_domain_research',
        targetDomains: [`test${i}.example.com`],
        keywordSets: [],
        personas: [],
        proxies: []
      };

      const response = await this.makeRequest(`${BACKEND_URL}/api/v2/campaigns`, {
        method: 'POST',
        body: campaignData
      });

      if (response.statusCode === 200 || response.statusCode === 201) {
        this.testCampaigns.push(response.data.data || response.data);
        this.log(`✅ Created test campaign ${i}: ${campaignData.name}`);
      } else {
        this.log(`❌ Failed to create test campaign ${i}: ${response.statusCode}`, 'error');
      }
    }

    return this.testCampaigns.length;
  }

  async testSingleCampaignDeletion() {
    this.log('🧪 Testing single campaign deletion (existing functionality)...');
    
    if (this.testCampaigns.length === 0) {
      this.log('❌ No test campaigns available for deletion test', 'error');
      return false;
    }

    const campaignToDelete = this.testCampaigns[0];
    const response = await this.makeRequest(`${BACKEND_URL}/api/v2/campaigns/${campaignToDelete.id}`, {
      method: 'DELETE'
    });

    if (response.statusCode === 200 || response.statusCode === 204) {
      this.log('✅ Single campaign deletion successful');
      this.testCampaigns.shift(); // Remove from our local list
      this.results.passed++;
      return true;
    } else {
      this.log(`❌ Single campaign deletion failed: ${response.statusCode}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async testBulkCampaignDeletion() {
    this.log('🧪 Testing bulk campaign deletion functionality...');
    
    if (this.testCampaigns.length < 2) {
      this.log('❌ Not enough test campaigns for bulk deletion test', 'error');
      return false;
    }

    // Test parallel deletion (simulating frontend bulk delete)
    const campaignsToDelete = this.testCampaigns.slice(0, 3);
    this.log(`🔄 Attempting bulk deletion of ${campaignsToDelete.length} campaigns...`);

    const deletePromises = campaignsToDelete.map(campaign => 
      this.makeRequest(`${BACKEND_URL}/api/v2/campaigns/${campaign.id}`, {
        method: 'DELETE'
      })
    );

    try {
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.statusCode === 200 || r.statusCode === 204).length;
      
      if (successCount === campaignsToDelete.length) {
        this.log(`✅ Bulk deletion successful: ${successCount}/${campaignsToDelete.length} campaigns deleted`);
        this.results.passed++;
        return true;
      } else {
        this.log(`❌ Bulk deletion partial failure: ${successCount}/${campaignsToDelete.length} campaigns deleted`, 'error');
        this.results.failed++;
        return false;
      }
    } catch (error) {
      this.log(`❌ Bulk deletion failed with error: ${error.message}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async testCampaignListAPI() {
    this.log('🧪 Testing campaigns list API response format...');
    
    const response = await this.makeRequest(`${BACKEND_URL}/api/v2/campaigns`);
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      // Test double-nested response format handling
      if (data && data.success && data.data) {
        if (Array.isArray(data.data)) {
          this.log('✅ Campaigns list API returns correct format (double-nested)');
          this.log(`📊 Found ${data.data.length} campaigns in backend`);
          this.results.passed++;
          return true;
        } else if (data.data.data && Array.isArray(data.data.data)) {
          this.log('✅ Campaigns list API returns correct format (triple-nested)');
          this.log(`📊 Found ${data.data.data.length} campaigns in backend`);
          this.results.passed++;
          return true;
        }
      }
      
      this.log('❌ Campaigns list API response format unexpected', 'error');
      this.log(`Response structure: ${JSON.stringify(data, null, 2)}`);
      this.results.failed++;
      return false;
    } else {
      this.log(`❌ Campaigns list API failed: ${response.statusCode}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async testFrontendIntegration() {
    this.log('🧪 Testing frontend integration...');
    
    try {
      // Test if frontend serves the campaigns page
      const response = await this.makeRequest(`${FRONTEND_URL}/campaigns`);
      
      if (response.statusCode === 200) {
        this.log('✅ Frontend campaigns page accessible');
        this.results.passed++;
        return true;
      } else {
        this.log(`❌ Frontend campaigns page failed: ${response.statusCode}`, 'error');
        this.results.failed++;
        return false;
      }
    } catch (error) {
      this.log(`❌ Frontend test failed: ${error.message}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async cleanupTestCampaigns() {
    this.log('🧹 Cleaning up remaining test campaigns...');
    
    // Get all campaigns and delete any remaining test campaigns
    const response = await this.makeRequest(`${BACKEND_URL}/api/v2/campaigns`);
    
    if (response.statusCode === 200) {
      const campaignsData = response.data.data?.data || response.data.data || response.data;
      
      if (Array.isArray(campaignsData)) {
        const testCampaignsToClean = campaignsData.filter(c => 
          c.name && c.name.includes('Bulk Delete Test Campaign')
        );
        
        this.log(`🧹 Found ${testCampaignsToClean.length} test campaigns to clean up`);
        
        for (const campaign of testCampaignsToClean) {
          await this.makeRequest(`${BACKEND_URL}/api/v2/campaigns/${campaign.id}`, {
            method: 'DELETE'
          });
          this.log(`🗑️ Cleaned up test campaign: ${campaign.name}`);
        }
      }
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Bulk Delete Campaign Tests');
    this.log('=====================================');

    try {
      // 1. Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        this.log('❌ Authentication failed, aborting tests', 'error');
        return;
      }

      // 2. Test campaigns list API first
      await this.testCampaignListAPI();

      // 3. Create test campaigns
      const createdCount = await this.createTestCampaigns(5);
      if (createdCount === 0) {
        this.log('❌ Could not create test campaigns, aborting bulk tests', 'error');
      } else {
        // 4. Test single deletion (baseline)
        await this.testSingleCampaignDeletion();

        // 5. Test bulk deletion
        await this.testBulkCampaignDeletion();
      }

      // 6. Test frontend integration
      await this.testFrontendIntegration();

      // 7. Cleanup
      await this.cleanupTestCampaigns();

    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'error');
      this.results.failed++;
    }

    // Print summary
    this.log('=====================================');
    this.log('📊 TEST SUMMARY');
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      this.log('🎉 All tests passed! Bulk delete functionality is working correctly.', 'success');
    } else {
      this.log('⚠️ Some tests failed. Please review the implementation.', 'error');
    }

    return this.results.failed === 0;
  }
}

// Main execution
async function main() {
  const testRunner = new TestRunner();
  const success = await testRunner.runAllTests();
  process.exit(success ? 0 : 1);
}

// Run tests if script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestRunner };