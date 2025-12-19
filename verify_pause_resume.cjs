const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Starting Pause/Resume Verification ---');

  // 1. Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  console.log('Logged in.');

  // 2. Create a new campaign
  await page.click('a[href="/campaigns/new"]');
  await page.waitForURL('**/campaigns/new');
  await page.fill('input[name="name"]', `Pause Test ${Date.now()}`);
  await page.fill('textarea[name="description"]', 'Testing pause/resume cycle');
  await page.click('button:has-text("Create Campaign")');
  await page.waitForURL(/\/campaigns\/[a-f0-9-]+/);
  
  const campaignUrl = page.url();
  const campaignId = campaignUrl.split('/').pop();
  console.log(`Created campaign: ${campaignId}`);

  // 3. Start the campaign (Discovery phase)
  // Wait for the "Start" button or similar. 
  // Assuming the UI has a "Start" button for the first phase.
  // We might need to configure it first? 
  // Based on previous context, we might need to click "Configure" then "Start".
  
  // Let's try to find a "Start" button.
  try {
    await page.click('button:has-text("Start")', { timeout: 5000 });
  } catch (e) {
    console.log('Start button not found immediately, checking for Configure...');
    // If configuration is needed, we might need to fill something.
    // For now, let's assume we can start it or it auto-starts?
    // Actually, let's look at the UI state.
  }

  // Wait for status to be "In Progress" or "Running"
  console.log('Waiting for In Progress...');
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('In Progress') || text.includes('Running');
  }, null, { timeout: 10000 });
  console.log('Campaign is In Progress.');

  // Capture API status
  let status = await getApiStatus(page, campaignId);
  console.log(`[Step 1] Status In Progress: ${JSON.stringify(status)}`);

  // 4. Click Pause
  console.log('Clicking Pause...');
  await page.click('button:has-text("Pause")');
  
  // Wait for UI to say "Paused"
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Paused');
  }, null, { timeout: 10000 });
  console.log('UI shows Paused.');

  // Capture API status
  status = await getApiStatus(page, campaignId);
  console.log(`[Step 2] Status Paused: ${JSON.stringify(status)}`);

  // 5. Click Resume
  console.log('Clicking Resume...');
  await page.click('button:has-text("Resume")');

  // Wait for UI to say "In Progress"
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('In Progress') || text.includes('Running');
  }, null, { timeout: 10000 });
  console.log('UI shows In Progress.');

  // Capture API status
  status = await getApiStatus(page, campaignId);
  console.log(`[Step 3] Status Resumed: ${JSON.stringify(status)}`);

  // 6. Click Pause again
  console.log('Clicking Pause again...');
  await page.click('button:has-text("Pause")');

  // Wait for UI to say "Paused"
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Paused');
  }, null, { timeout: 10000 });
  console.log('UI shows Paused again.');

  // Capture API status
  status = await getApiStatus(page, campaignId);
  console.log(`[Step 4] Status Paused again: ${JSON.stringify(status)}`);

  await browser.close();
}

async function getApiStatus(page, campaignId) {
  const response = await page.request.get(`http://localhost:8080/api/v2/campaigns/${campaignId}/status`);
  return await response.json();
}

run().catch(console.error);
