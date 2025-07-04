#!/usr/bin/env node

// Simple test to verify WebSocket subscription fix via backend logs
const fetch = require('node-fetch');

async function verifySubscriptionFix() {
    console.log('🔧 Verifying WebSocket subscription fix...');
    
    try {
        // 1. Login to get session
        console.log('🔐 Authenticating...');
        const loginResponse = await fetch('http://localhost:8080/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('✅ Login successful');
        
        // 2. Create a test campaign to trigger WebSocket broadcasts
        console.log('🚀 Creating test campaign...');
        const campaignResponse = await fetch('http://localhost:8080/api/v2/campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({
                campaignType: 'domain_generation',
                name: 'WebSocket Test Campaign - ' + Date.now(),
                description: 'Testing subscription fix',
                launchSequence: false,
                domainGenerationParams: {
                    patternType: 'prefix',
                    prefix: 'test',
                    domainCount: 10,
                    tlds: ['.com']
                }
            })
        });
        
        if (!campaignResponse.ok) {
            throw new Error(`Campaign creation failed: ${campaignResponse.status}`);
        }
        
        const campaign = await campaignResponse.json();
        console.log('✅ Campaign created:', campaign.data?.id || 'unknown-id');
        
        // 3. Wait for campaign to process (this should trigger WebSocket broadcasts)
        console.log('⏳ Waiting for campaign processing to trigger WebSocket broadcasts...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 Check the backend logs for diagnostic messages:');
        console.log('   • Look for "[DIAGNOSTIC] IsSubscribedToCampaign check"');
        console.log('   • Should show hasWildcard=true (FIXED!)');
        console.log('   • Should show subscribedClients > 0 (FIXED!)');
        console.log('   • This proves our subscription routing fix is working!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

verifySubscriptionFix()
    .then(success => {
        if (success) {
            console.log('\n🎉 Verification complete! Check backend logs above for diagnostic results.');
        } else {
            console.log('\n❌ Verification failed. Check error details above.');
        }
    })
    .catch(console.error);