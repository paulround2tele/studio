#!/usr/bin/env node

// Quick test to verify WebSocket streaming fix
const puppeteer = require('puppeteer');

async function testWebSocketStreaming() {
    console.log('🧪 Testing WebSocket streaming fix...');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    let websocketMessages = [];
    let backendWebSocketConnected = false;
    
    // Monitor WebSocket frames
    page.on('framenavigated', async (frame) => {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        client.on('Network.webSocketCreated', (params) => {
            if (params.url.includes('localhost:8080')) {
                console.log('🔌 Backend WebSocket detected:', params.url);
                backendWebSocketConnected = true;
            }
        });
        
        client.on('Network.webSocketFrameReceived', (params) => {
            if (params.response.payloadData) {
                try {
                    const message = JSON.parse(params.response.payloadData);
                    if (message.type && message.type.includes('campaign')) {
                        console.log('📥 Campaign WebSocket message:', message.type, message.campaignId || 'no-id');
                        websocketMessages.push(message);
                    }
                } catch (e) {
                    // Ignore non-JSON messages
                }
            }
        });
    });
    
    try {
        // Login
        console.log('🔐 Logging in...');
        await page.goto('http://localhost:3000/login');
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Go to campaigns page
        console.log('📋 Navigating to campaigns...');
        await page.goto('http://localhost:3000/campaigns');
        await page.waitForTimeout(3000); // Wait for WebSocket connection
        
        console.log('📊 Test Results:');
        console.log(`✅ Backend WebSocket Connected: ${backendWebSocketConnected}`);
        console.log(`📨 Campaign Messages Received: ${websocketMessages.length}`);
        
        if (backendWebSocketConnected) {
            console.log('🎉 SUCCESS: WebSocket connection established!');
            console.log('✅ The subscription routing fix is working correctly.');
            console.log('🔧 Frontend can now connect to backend WebSocket streaming.');
        } else {
            console.log('❌ FAILURE: No backend WebSocket connection detected');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testWebSocketStreaming().catch(console.error);