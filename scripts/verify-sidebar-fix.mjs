import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifySidebarFix() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Test desktop sidebar width
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for sidebar to load
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 }).catch(() => {
      console.log('No data-testid, trying alternative selector');
      return page.waitForSelector('aside', { timeout: 5000 });
    });
    
    // Take screenshot of homepage with sidebar
    await page.screenshot({ 
      path: join(__dirname, '..', 'sidebar-fix-desktop-full.png'),
      fullPage: false
    });
    console.log('✅ Desktop full screenshot captured');
    
    // Navigate to Intro & Learning category to verify the exact same view as user's screenshot
    await page.goto('http://localhost:5000/category/intro-learning', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: join(__dirname, '..', 'sidebar-fix-intro-learning.png'),
      fullPage: false
    });
    console.log('✅ Intro & Learning category screenshot captured');
    
    // Click to expand Encoding & Codecs to verify subcategory counts
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    
    // Try to expand Encoding & Codecs category
    const expandButtons = await page.$$('button svg, span svg');
    for (const button of expandButtons) {
      const parent = await button.evaluateHandle(el => {
        let current = el.parentElement;
        while (current) {
          if (current.textContent && current.textContent.includes('Encoding & Codecs')) {
            return current;
          }
          current = current.parentElement;
        }
        return null;
      });
      
      if (parent && await parent.evaluate(el => el !== null)) {
        await button.click();
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: join(__dirname, '..', 'sidebar-fix-expanded.png'),
      fullPage: false
    });
    console.log('✅ Expanded category screenshot captured');
    
    // Check sidebar width and content visibility
    const sidebarMetrics = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      if (!sidebar) return null;
      
      const rect = sidebar.getBoundingClientRect();
      
      // Find all number elements in the sidebar
      const numberElements = [];
      const spans = sidebar.querySelectorAll('span');
      
      spans.forEach(span => {
        const text = span.textContent?.trim();
        if (text && /^\d+$/.test(text)) {
          const spanRect = span.getBoundingClientRect();
          const parent = span.closest('a, button');
          const parentText = parent?.textContent || '';
          
          numberElements.push({
            text: text,
            width: spanRect.width,
            right: spanRect.right,
            isVisible: spanRect.right <= rect.right,
            parentText: parentText.substring(0, 50),
            overflowAmount: spanRect.right > rect.right ? spanRect.right - rect.right : 0
          });
        }
      });
      
      return {
        sidebarWidth: rect.width,
        sidebarRight: rect.right,
        numberElements: numberElements
      };
    });
    
    console.log('\n📊 Sidebar Metrics:');
    console.log(`Sidebar width: ${sidebarMetrics?.sidebarWidth}px`);
    console.log(`Sidebar right edge: ${sidebarMetrics?.sidebarRight}px`);
    
    if (sidebarMetrics?.numberElements) {
      console.log('\n🔢 Number Elements Visibility:');
      let truncatedCount = 0;
      sidebarMetrics.numberElements.forEach(el => {
        if (!el.isVisible) {
          console.log(`❌ TRUNCATED: "${el.text}" in "${el.parentText}" - overflows by ${el.overflowAmount}px`);
          truncatedCount++;
        } else {
          console.log(`✅ Visible: "${el.text}" in "${el.parentText}"`);
        }
      });
      
      if (truncatedCount === 0) {
        console.log('\n✅ SUCCESS: All numbers are fully visible!');
      } else {
        console.log(`\n⚠️ WARNING: ${truncatedCount} numbers are still being truncated`);
      }
    }
    
    // Test mobile view
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    
    // Open mobile sidebar
    const hamburger = await page.$('[data-testid="sidebar-trigger"], button svg');
    if (hamburger) {
      await hamburger.click();
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ 
      path: join(__dirname, '..', 'sidebar-fix-mobile.png'),
      fullPage: false
    });
    console.log('✅ Mobile sidebar screenshot captured');
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }
}

verifySidebarFix().catch(console.error);
