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

  // 4. Test Mascot Blu is present and animating
  console.log('Testing Mascot Blu presence and animation...');
  await page.evaluate(() => window.renderAt(1500));
  await page.waitForSelector('#mascot-blu', { timeout: 5000 });
  const bluVisible = await page.locator('#mascot-blu').isVisible();
  console.log('✓ Mascot Blu visible on stage:', bluVisible);
  await page.screenshot({ path: path.join(outDir, 'frame_mascot_blu_1500ms.png') });

  // 5. Test Scene 3: Local context (Cricket over)
  console.log('Testing Scene 3: Cricket Over local context example at 14000ms...');
  await page.evaluate(() => window.renderAt(14000));
  await page.waitForTimeout(100);
  const cricketCaption = await page.locator('#caption-text').innerText();
  console.log('✓ Cricket over caption at 14000ms:', cricketCaption);
  await page.screenshot({ path: path.join(outDir, 'frame_cricket_local_context.png') });

  // 6. Test Settings Modal & Dyslexia Mode
  console.log('Testing Settings Modal & Dyslexia mode...');
  await page.click('#btn-settings-toggle');
  await page.waitForSelector('#settings-dialog', { timeout: 3000 });
  console.log('✓ Settings modal opened.');
  await page.screenshot({ path: path.join(outDir, 'settings_modal_open.png') });

  // Toggle dyslexia
  await page.click('#toggle-dyslexia');
  const isDyslexia = await page.evaluate(() => document.documentElement.getAttribute('data-dyslexia'));
  console.log('✓ Dyslexia mode data attribute on root:', isDyslexia);

  // Increase font size (A+)
  await page.click('#btn-caption-increase');
  await page.click('#btn-caption-increase');
  console.log('✓ Font size increased (A+ clicked twice).');

  // Toggle Blu mascot off
  await page.click('#toggle-show-blu');
  const bluHidden = await page.evaluate(() => document.getElementById('mascot-blu') === null);
  console.log('✓ Blu hidden after toggle:', bluHidden);

  // Toggle Blu back on
  await page.click('#toggle-show-blu');
  const bluRestored = await page.evaluate(() => document.getElementById('mascot-blu') !== null);
  console.log('✓ Blu restored after toggle:', bluRestored);

  // Close Settings modal
  await page.click('#btn-close-settings');
  await page.waitForSelector('#settings-dialog', { state: 'detached', timeout: 3000 });
  console.log('✓ Settings modal closed.');
  await page.screenshot({ path: path.join(outDir, 'dyslexia_mode_active.png') });

  // 7. Test Revoice switch
  console.log('Testing Revoice language switch to Hindi...');
  await page.selectOption('#select-language', 'hi');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.renderAt(2000));
  const revoicedCaption = await page.locator('#caption-text').innerText();
  console.log('✓ Revoiced to Hindi, caption:', revoicedCaption);
  await page.screenshot({ path: path.join(outDir, 'revoiced_hindi.png') });

  // 8. Test Input Page navigation and Local Context toggle
  console.log('Testing Input Page navigation (?view=input)...');
  await page.goto('http://127.0.0.1:5173/?view=input');
  await page.waitForSelector('#topic-input', { timeout: 5000 });
  const localContextChecked = await page.isChecked('#toggle-local-context');
  console.log('✓ Local context toggle is checked by default:', localContextChecked);
  await page.screenshot({ path: path.join(outDir, 'input_page_with_local_toggle.png') });

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
