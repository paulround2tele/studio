#!/usr/bin/env node

/**
 * Debug Campaign Details API Response
 * This script logs in and checks what the getCampaignDetails API actually returns
 */

import { chromium } from 'playwright';

const config = {
  baseUrl: 'http://localhost:3000',
  credentials: {
    email: 'test@example.com',
    password: 'password123'
  }
};

async function debugCampaignDetails() {
  let browser;
  let page;

  try {
    console.log('[INFO] Launching browser for campaign details debugging');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Listen to console logs to capture API responses
    page.on('console', msg => {
      if (msg.text().includes('CampaignService')) {
        console.log('[CONSOLE]', msg.text());
      }
    });

    // Navigate to login and authenticate
    console.log('[INFO] Navigating to login page');
    await page.goto(`${config.baseUrl}/login`);
    
    await page.fill('input[type="email"]', config.credentials.email);
    await page.fill('input[type="password"]', config.credentials.password);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL(/\/(dashboard|campaigns)/, { timeout: 10000 });
    console.log('[INFO] Login successful');

    // Navigate to campaigns page to see available campaigns
    await page.goto(`${config.baseUrl}/campaigns`);
    await page.waitForLoadState('networkidle');
    
    // Get the first campaign link
    const campaignLinks = await page.$$('a[href*="/campaigns/"][href*="?type="]');
    
    if (campaignLinks.length === 0) {
      console.log('[ERROR] No campaign links found on campaigns page');
      return;
    }
    
    const firstCampaignHref = await campaignLinks[0].getAttribute('href');
    console.log('[INFO] Found campaign link:', firstCampaignHref);
    
    // Click on the first campaign to trigger the API call
    console.log('[INFO] Clicking on campaign to load details');
    await campaignLinks[0].click();
    
    // Wait a moment for API calls to complete
    await page.waitForTimeout(3000);
    
    console.log('[INFO] Campaign details debugging complete');
    
  } catch (error) {
    console.error('[ERROR] Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
debugCampaignDetails().catch(console.error);