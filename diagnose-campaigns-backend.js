#!/usr/bin/env node

/**
 * SOPHISTICATED BACKEND DIAGNOSTIC TOOL
 * Programmatically tests campaign backend integration
 * Zero margin for error - comprehensive analysis
 */

const https = require('https');
const http = require('http');
const { promisify } = require('util');

class BackendDiagnostic {
  constructor() {
    this.baseUrl = 'http://localhost:8080';
    this.apiBaseUrl = 'http://localhost:8080/api/v2';
    this.authBaseUrl = 'http://localhost:8080';
    this.sessionCookie = null;
    this.results = {
      authentication: null,
      campaignsList: null,
      backendDirect: null,
      dataFlow: [],
      issues: []
    };
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level: level.toUpperCase(), message, data };
    console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    return entry;
  }

  async makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsed,
              rawData: data
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data,
              parseError: e.message
            });
          }
        });
      });

      req.on('error', reject);
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async authenticate() {
    this.log('info', 'Starting authentication process');
    
    const loginData = JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    try {
      const response = await this.makeRequest(options, loginData);
      this.results.authentication = response;
      
      if (response.statusCode === 200) {
        // Extract session cookie
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.sessionCookie = setCookie.map(cookie => cookie.split(';')[0]).join('; ');
          this.log('info', 'Authentication successful', { 
            statusCode: response.statusCode,
            hasCookie: !!this.sessionCookie 
          });
          return true;
        } else {
          this.log('error', 'No session cookie received');
          this.results.issues.push('Authentication succeeded but no session cookie received');
          return false;
        }
      } else {
        this.log('error', 'Authentication failed', response);
        this.results.issues.push(`Authentication failed with status ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      this.log('error', 'Authentication request failed', error.message);
      this.results.issues.push(`Authentication request failed: ${error.message}`);
      return false;
    }
  }

  async testCampaignsAPI() {
    this.log('info', 'Testing campaigns API endpoint');
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/v2/campaigns',
      method: 'GET',
      headers: {
        'Cookie': this.sessionCookie || '',
        'Accept': 'application/json'
      }
    };

    try {
      const response = await this.makeRequest(options);
      this.results.campaignsList = response;
      
      this.log('info', 'Campaigns API response received', {
        statusCode: response.statusCode,
        contentType: response.headers['content-type'],
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : null,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        rawDataLength: response.rawData ? response.rawData.length : 0,
        rawDataPreview: response.rawData ? response.rawData.substring(0, 200) : null
      });

      // Detailed response analysis
      if (response.statusCode === 200) {
        this.analyzeCampaignsResponse(response);
      } else {
        this.results.issues.push(`Campaigns API returned status ${response.statusCode}`);
      }

      return response;
    } catch (error) {
      this.log('error', 'Campaigns API request failed', error.message);
      this.results.issues.push(`Campaigns API request failed: ${error.message}`);
      return null;
    }
  }

  analyzeCampaignsResponse(response) {
    this.log('info', 'Analyzing campaigns response structure');
    
    const analysis = {
      statusCode: response.statusCode,
      responseFormat: 'unknown',
      campaignsCount: 0,
      validForFrontend: false,
      issues: []
    };

    const data = response.data;
    const rawData = response.rawData;

    // Check if response is empty
    if (!rawData || rawData.trim() === '') {
      analysis.responseFormat = 'empty';
      analysis.issues.push('Response body is empty');
    }
    // Check if response is null/undefined
    else if (data === null || data === undefined) {
      analysis.responseFormat = 'null';
      analysis.issues.push('Response data is null/undefined');
    }
    // Check if response is direct array
    else if (Array.isArray(data)) {
      analysis.responseFormat = 'direct_array';
      analysis.campaignsCount = data.length;
      analysis.validForFrontend = true;
      if (data.length === 0) {
        analysis.issues.push('Direct array response is empty - no campaigns exist');
      }
    }
    // Check if response is wrapped object
    else if (typeof data === 'object') {
      if (data.status && data.data !== undefined) {
        analysis.responseFormat = 'wrapped_status_data';
        if (Array.isArray(data.data)) {
          analysis.campaignsCount = data.data.length;
          analysis.validForFrontend = true;
          if (data.data.length === 0) {
            analysis.issues.push('Wrapped response has empty data array - no campaigns exist');
          }
        } else {
          analysis.issues.push('Wrapped response data is not an array');
        }
      }
      else if (data.campaigns !== undefined) {
        analysis.responseFormat = 'wrapped_campaigns';
        if (Array.isArray(data.campaigns)) {
          analysis.campaignsCount = data.campaigns.length;
          analysis.validForFrontend = true;
          if (data.campaigns.length === 0) {
            analysis.issues.push('Wrapped campaigns array is empty - no campaigns exist');
          }
        } else {
          analysis.issues.push('Campaigns field is not an array');
        }
      }
      else if (Object.keys(data).length === 0) {
        analysis.responseFormat = 'empty_object';
        analysis.validForFrontend = true;
        analysis.issues.push('Empty object response - likely no campaigns exist');
      }
      else {
        analysis.responseFormat = 'unknown_object';
        analysis.issues.push(`Unknown object structure with keys: ${Object.keys(data).join(', ')}`);
      }
    }
    else {
      analysis.responseFormat = 'primitive';
      analysis.issues.push(`Unexpected primitive response type: ${typeof data}`);
    }

    this.log('info', 'Response analysis complete', analysis);
    this.results.dataFlow.push(analysis);

    // Check for critical issues
    if (analysis.campaignsCount === 0 && analysis.validForFrontend) {
      this.results.issues.push('CRITICAL: Backend returns valid format but zero campaigns - check database');
    }
    if (!analysis.validForFrontend) {
      this.results.issues.push('CRITICAL: Backend response format not compatible with frontend validation');
    }

    return analysis;
  }

  async testDirectDatabaseQuery() {
    this.log('info', 'Testing direct backend health and database connectivity');
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/health',
      method: 'GET'
    };

    try {
      const response = await this.makeRequest(options);
      this.results.backendDirect = response;
      
      this.log('info', 'Backend health check response', {
        statusCode: response.statusCode,
        data: response.data
      });

      if (response.statusCode !== 200) {
        this.results.issues.push(`Backend health check failed with status ${response.statusCode}`);
      }

      return response;
    } catch (error) {
      this.log('error', 'Backend health check failed', error.message);
      this.results.issues.push(`Backend health check failed: ${error.message}`);
      return null;
    }
  }

  async checkCampaignCreation() {
    this.log('info', 'Testing campaign creation endpoint');
    
    const testCampaign = {
      name: `Test Campaign ${Date.now()}`,
      description: 'Diagnostic test campaign',
      status: 'draft'
    };

    const postData = JSON.stringify(testCampaign);
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/v2/campaigns',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': this.sessionCookie || ''
      }
    };

    try {
      const response = await this.makeRequest(options, postData);
      
      this.log('info', 'Campaign creation test result', {
        statusCode: response.statusCode,
        success: response.statusCode === 200 || response.statusCode === 201,
        responseData: response.data
      });

      if (response.statusCode === 200 || response.statusCode === 201) {
        this.log('info', 'Campaign creation successful - testing list refresh');
        // Wait a moment and test list again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await this.testCampaignsAPI();
      } else {
        this.results.issues.push(`Campaign creation failed with status ${response.statusCode}`);
      }

      return response;
    } catch (error) {
      this.log('error', 'Campaign creation test failed', error.message);
      this.results.issues.push(`Campaign creation test failed: ${error.message}`);
      return null;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('SOPHISTICATED BACKEND DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 EXECUTIVE SUMMARY:');
    console.log(`• Authentication: ${this.results.authentication?.statusCode === 200 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`• Campaigns API: ${this.results.campaignsList?.statusCode === 200 ? '✅ REACHABLE' : '❌ FAILED'}`);
    console.log(`• Backend Health: ${this.results.backendDirect?.statusCode === 200 ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`• Critical Issues: ${this.results.issues.length}`);

    if (this.results.campaignsList?.statusCode === 200) {
      const analysis = this.results.dataFlow[0];
      if (analysis) {
        console.log(`• Response Format: ${analysis.responseFormat.toUpperCase()}`);
        console.log(`• Campaigns Count: ${analysis.campaignsCount}`);
        console.log(`• Frontend Compatible: ${analysis.validForFrontend ? '✅ YES' : '❌ NO'}`);
      }
    }

    if (this.results.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
      this.results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    console.log('\n🔧 TECHNICAL DETAILS:');
    
    if (this.results.campaignsList) {
      console.log('\nCampaigns API Response:');
      console.log(`• Status: ${this.results.campaignsList.statusCode}`);
      console.log(`• Content-Type: ${this.results.campaignsList.headers['content-type'] || 'unknown'}`);
      console.log(`• Raw Data Length: ${this.results.campaignsList.rawData?.length || 0} bytes`);
      console.log(`• Raw Data Preview: ${this.results.campaignsList.rawData?.substring(0, 200) || 'empty'}`);
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (this.results.issues.some(issue => issue.includes('zero campaigns'))) {
      console.log('• Check database for existing campaign records');
      console.log('• Verify campaign creation process is working');
      console.log('• Check database user permissions');
    }
    
    if (this.results.issues.some(issue => issue.includes('format not compatible'))) {
      console.log('• Backend response format needs adjustment');
      console.log('• Frontend validation logic needs updating');
    }
    
    if (this.results.issues.some(issue => issue.includes('Authentication'))) {
      console.log('• Check authentication service configuration');
      console.log('• Verify session management setup');
    }

    console.log('\n' + '='.repeat(80));
    
    return this.results;
  }

  async runDiagnostic() {
    this.log('info', 'Starting comprehensive backend diagnostic');
    
    try {
      // Step 1: Test backend health
      await this.testDirectDatabaseQuery();
      
      // Step 2: Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        console.log('❌ Authentication failed - cannot proceed with authenticated tests');
        return this.generateReport();
      }
      
      // Step 3: Test campaigns list API
      await this.testCampaignsAPI();
      
      // Step 4: Test campaign creation and list refresh
      await this.checkCampaignCreation();
      
      // Step 5: Generate comprehensive report
      return this.generateReport();
      
    } catch (error) {
      this.log('error', 'Diagnostic failed with unexpected error', error.message);
      this.results.issues.push(`Diagnostic failed: ${error.message}`);
      return this.generateReport();
    }
  }
}

// Execute diagnostic
if (require.main === module) {
  const diagnostic = new BackendDiagnostic();
  diagnostic.runDiagnostic()
    .then(() => {
      console.log('\n✅ Diagnostic complete. Check report above for issues and recommendations.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Diagnostic failed:', error.message);
      process.exit(1);
    });
}

module.exports = BackendDiagnostic;