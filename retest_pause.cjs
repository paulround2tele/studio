const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080/api/v2';
const USER_EMAIL = 'admin@domainflow.com';
const USER_PASSWORD = 'AdminPassword123!';

// Axios instance with cookie jar support
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true // Handle all statuses manually
});

async function run() {
  try {
    console.log('--- Starting Authenticated Pause Test ---');

    // 1. Login
    console.log(`Logging in as ${USER_EMAIL}...`);
    const loginRes = await client.post('/auth/login', {
      email: USER_EMAIL,
      password: USER_PASSWORD
    });

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      process.exit(1);
    }
    
    // Extract cookies
    const cookies = loginRes.headers['set-cookie'];
    if (cookies) {
      client.defaults.headers.Cookie = cookies;
      console.log('Login successful. Cookies set.');
    } else {
      console.warn('Login successful but no cookies received?');
    }

    // 2. Create Campaign
    console.log('Creating new campaign...');
    const createRes = await client.post('/campaigns', {
      name: `Pause Test ${Date.now()}`
    });

    if (createRes.status !== 201) {
      console.error('Create campaign failed:', createRes.data);
      process.exit(1);
    }

    const campaignId = createRes.data.id;
    console.log(`Campaign created: ${campaignId}`);

    // 3. Set Mode to Full Sequence
    console.log('Setting mode to full_sequence...');
    const modeRes = await client.patch(`/campaigns/${campaignId}/mode`, {
      mode: 'full_sequence'
    });

    if (modeRes.status !== 200) {
      console.error('Set mode failed:', modeRes.data);
      process.exit(1);
    }
    console.log('Mode set to full_sequence.');

    // 4. Configure Domain Generation
    console.log('Configuring domain_generation...');
    const configPayload = {
      configuration: {
        numDomainsToGenerate: 100000000, // 100M to ensure long run
        patternType: 'prefix_variable',
        characterSet: 'alphanumeric',
        prefixVariableLength: 5,
        constantString: 'test',
        tld: '.com'
      }
    };
    const configRes = await client.post(`/campaigns/${campaignId}/phases/domain_generation/configure`, configPayload);

    if (configRes.status !== 200) {
      console.error('Configuration failed:', configRes.data);
      process.exit(1);
    }
    console.log('Configuration successful.');

    // 5. Start Phase
    console.log('Starting domain_generation...');
    const startRes = await client.post(`/campaigns/${campaignId}/phases/domain_generation/start`);

    if (startRes.status !== 200) {
      console.error('Start failed:', startRes.data);
      process.exit(1);
    }
    console.log('Start command issued.');

    // 6. Poll for Running Status
    console.log('Polling for running status...');
    let running = false;
    for (let i = 0; i < 20; i++) {
      const statusRes = await client.get(`/campaigns/${campaignId}/phases/domain_generation/status`);
      const status = statusRes.data.status;
      console.log(`Poll ${i}: ${status}`);
      
      if (status === 'running' || status === 'in_progress') {
        running = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!running) {
      console.error('Phase failed to enter running state within timeout.');
      // We continue to try pause anyway, just in case status reporting is lagging
    }

    // 7. Pause Phase
    console.log('Pausing phase...');
    const pauseRes = await client.post(`/campaigns/${campaignId}/phases/domain_generation/pause`);
    
    if (pauseRes.status === 200) {
      console.log('Pause successful.');
    } else {
      console.error('Pause failed:', pauseRes.data);
    }

    // 8. Verify Paused Status
    console.log('Verifying paused status...');
    const pausedStatusRes = await client.get(`/campaigns/${campaignId}/phases/domain_generation/status`);
    console.log(`Status after pause: ${pausedStatusRes.data.status}`);

    // 9. Resume Phase
    console.log('Resuming phase...');
    const resumeRes = await client.post(`/campaigns/${campaignId}/phases/domain_generation/resume`);
    
    if (resumeRes.status === 200) {
      console.log('Resume successful.');
    } else {
      console.error('Resume failed:', resumeRes.data);
    }

    // 10. Verify Resumed Status
    console.log('Verifying resumed status...');
    const resumedStatusRes = await client.get(`/campaigns/${campaignId}/phases/domain_generation/status`);
    console.log(`Status after resume: ${resumedStatusRes.data.status}`);

    console.log('--- Test Complete ---');

  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

run();
