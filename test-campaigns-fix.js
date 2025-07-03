#!/usr/bin/env node

/**
 * TEST CAMPAIGNS FIX - Validate Frontend Response Processing
 */

const http = require('http');

class CampaignFixValidator {
  constructor() {
    this.sessionCookie = null;
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
      if (postData) req.write(postData);
      req.end();
    });
  }

  async authenticate() {
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

    const response = await this.makeRequest(options, loginData);
    if (response.statusCode === 200 && response.headers['set-cookie']) {
      this.sessionCookie = response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
      return true;
    }
    return false;
  }

  // Simulate the NEW frontend validation logic
  simulateFrontendValidation(response) {
    let campaignsData = [];
    let responseValid = false;
    let detectedFormat = 'unknown';

    const data = response.data;

    // Test the NEW validation logic for double-nested responses
    if (data && typeof data === 'object' && (('success' in data) || ('status' in data)) && 'data' in data) {
      const isSuccessField = 'success' in data;
      const successValue = isSuccessField ? data.success : data.status;
      const isSuccess = successValue === true || successValue === 'success' || successValue === 'ok' || successValue === 200;
      
      if (isSuccess) {
        const dataField = data.data;
        
        // Handle double-nested response: {success: true, data: {success: true, data: [...]}}
        if (dataField && typeof dataField === 'object' && 'data' in dataField && Array.isArray(dataField.data)) {
          campaignsData = dataField.data;
          responseValid = true;
          detectedFormat = 'double_nested';
        }
        // Handle single-nested response: {success: true, data: [...]}
        else if (Array.isArray(dataField)) {
          campaignsData = dataField;
          responseValid = true;
          detectedFormat = 'single_nested';
        }
        // Handle nested null data
        else if (dataField === null || (dataField && typeof dataField === 'object' && 'data' in dataField && dataField.data === null)) {
          campaignsData = [];
          responseValid = true;
          detectedFormat = 'nested_null';
        }
      }
    }

    return {
      responseValid,
      detectedFormat,
      campaignsData,
      campaignsCount: campaignsData.length,
      sampleCampaign: campaignsData.length > 0 ? {
        id: campaignsData[0].id,
        name: campaignsData[0].name,
        status: campaignsData[0].status
      } : null
    };
  }

  async testFix() {
    console.log('🔧 Testing Campaigns Fix...\n');

    // Authenticate
    console.log('1. Authenticating...');
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('❌ Authentication failed');
      return;
    }
    console.log('✅ Authentication successful\n');

    // Get campaigns response
    console.log('2. Fetching campaigns...');
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/v2/campaigns',
      method: 'GET',
      headers: {
        'Cookie': this.sessionCookie,
        'Accept': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    console.log(`✅ API Response: ${response.statusCode} ${response.statusCode === 200 ? 'OK' : 'FAILED'}`);
    console.log(`📊 Response Size: ${response.rawData?.length || 0} bytes\n`);

    // Test frontend validation
    console.log('3. Testing Frontend Validation...');
    const validation = this.simulateFrontendValidation(response);
    
    console.log('📋 VALIDATION RESULTS:');
    console.log(`• Response Valid: ${validation.responseValid ? '✅ YES' : '❌ NO'}`);
    console.log(`• Detected Format: ${validation.detectedFormat.toUpperCase()}`);
    console.log(`• Campaigns Count: ${validation.campaignsCount}`);
    
    if (validation.sampleCampaign) {
      console.log(`• Sample Campaign: "${validation.sampleCampaign.name}" (${validation.sampleCampaign.status})`);
    }

    console.log('\n' + '='.repeat(60));
    if (validation.responseValid && validation.campaignsCount > 0) {
      console.log('🎉 SUCCESS: Frontend can now parse campaigns!');
      console.log('✅ Campaigns page should display the campaign list correctly.');
    } else if (validation.responseValid && validation.campaignsCount === 0) {
      console.log('✅ SUCCESS: Frontend validation working, but no campaigns exist.');
      console.log('ℹ️  Create a campaign and it should appear in the list.');
    } else {
      console.log('❌ FAILED: Frontend validation still not working.');
      console.log('🔧 Additional investigation needed.');
    }
    console.log('='.repeat(60));

    return validation;
  }
}

// Run the test
if (require.main === module) {
  const validator = new CampaignFixValidator();
  validator.testFix()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}