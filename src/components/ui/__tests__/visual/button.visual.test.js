const { chromium } = require('playwright');
const { percySnapshot } = require('@percy/playwright');

describe('Button Visual Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/examples/buttons');
  });

  afterEach(async () => {
    await page.close();
  });

  test('Button variants visual regression', async () => {
    await percySnapshot(page, 'Button Variants');
  });

  test('Button sizes visual regression', async () => {
    await page.click('[data-testid="size-toggle"]');
    await percySnapshot(page, 'Button Sizes');
  });

  test('Button states visual regression', async () => {
    await page.click('[data-testid="state-toggle"]');
    await percySnapshot(page, 'Button States');
  });

  test('Button hover state visual regression', async () => {
    await page.hover('[data-testid="primary-button"]');
    await percySnapshot(page, 'Button Hover State');
  });

  test('Button focus state visual regression', async () => {
    await page.focus('[data-testid="primary-button"]');
    await percySnapshot(page, 'Button Focus State');
  });
});
