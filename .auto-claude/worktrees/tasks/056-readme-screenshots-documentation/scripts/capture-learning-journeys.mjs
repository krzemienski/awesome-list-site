import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport to standard desktop size
    await page.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 2 // For retina display quality
    });

    console.log('Loading learning journeys demo HTML...');

    // Navigate to the demo HTML file
    const demoPath = 'file://' + process.cwd() + '/scripts/learning-journeys-demo.html';
    await page.goto(demoPath, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for fonts and styles to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Capturing screenshot...');

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    // Save screenshot
    const outputPath = './docs/screenshots/learning-journeys.png';
    await fs.writeFile(outputPath, screenshotBuffer);

    // Check file size
    const stats = await fs.stat(outputPath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    console.log(`✓ Screenshot saved to ${outputPath}`);
    console.log(`✓ File size: ${fileSizeInMB.toFixed(2)} MB`);

    if (fileSizeInMB > 1) {
      console.warn('⚠ Warning: File size exceeds 1MB');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshot()
  .then(success => {
    if (success) {
      console.log('✓ Screenshot capture completed successfully');
      process.exit(0);
    } else {
      console.error('✗ Screenshot file size exceeds limit');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('✗ Screenshot capture failed:', error.message);
    process.exit(1);
  });
