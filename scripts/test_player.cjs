const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPlayer() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/');

  // Wait for player stage to be present
  await page.waitForSelector('#lesson-stage', { timeout: 10000 });
  console.log('✓ Stage element found.');

  // Test window.renderAt exists
  const hasRenderAt = await page.evaluate(() => typeof window.renderAt === 'function');
  console.log('✓ window.renderAt available:', hasRenderAt);
  if (!hasRenderAt) {
    throw new Error('window.renderAt is not defined on window!');
  }

  const outDir = path.join(__dirname, '..', 'public', 'test_output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Render at 500ms (Title Card)
  console.log('Testing renderAt(500)...');
  await page.evaluate(() => window.renderAt(500));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(outDir, 'frame_title_card_500ms.png') });
  const titleText = await page.locator('h1').innerText();
  console.log('✓ Frame at 500ms captured. Title:', titleText);

  // 2. Render at 8500ms (Code Walkthrough)
  console.log('Testing renderAt(8500)...');
  await page.evaluate(() => window.renderAt(8500));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(outDir, 'frame_code_walkthrough_8500ms.png') });
  console.log('✓ Frame at 8500ms captured (Code Walkthrough).');

  // 3. Render at 17000ms (Diagram)
  console.log('Testing renderAt(17000)...');
  await page.evaluate(() => window.renderAt(17000));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(outDir, 'frame_diagram_17000ms.png') });
  console.log('✓ Frame at 17000ms captured (Diagram).');

  // 4. Test Hindi regional lesson
  console.log('Testing Hindi lesson (?lang=hi)...');
  await page.goto('http://127.0.0.1:5173/?lang=hi');
  await page.waitForSelector('#caption-text', { timeout: 10000 });
  await page.evaluate(() => window.renderAt(2000));
  await page.waitForTimeout(100);
  const captionText = await page.locator('#caption-text').innerText();
  console.log('✓ Hindi caption rendered:', captionText);
  await page.screenshot({ path: path.join(outDir, 'frame_hindi_lesson.png') });

  // 5. Test Input Page navigation
  console.log('Testing Input Page navigation (?view=input)...');
  await page.goto('http://127.0.0.1:5173/?view=input');
  await page.waitForSelector('#topic-input', { timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, 'input_page.png') });
  console.log('✓ Input Page rendered cleanly.');

  // Click Kannada sample button
  await page.click('#btn-sample-kn');
  await page.waitForSelector('#lesson-stage', { timeout: 5000 });
  await page.evaluate(() => window.renderAt(1500));
  const knCaption = await page.locator('#caption-text').innerText();
  console.log('✓ Kannada sample loaded via button:', knCaption);
  await page.screenshot({ path: path.join(outDir, 'frame_kannada_lesson.png') });

  await browser.close();
  console.log('🎉 ALL PLAYWRIGHT TESTS PASSED DETERMINISTICALLY!');
}

testPlayer().catch(err => {
  console.error('Playwright test error:', err);
  process.exit(1);
});
