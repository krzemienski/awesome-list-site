import puppeteer from 'puppeteer';

async function captureScreenshots() {
  console.log('🎬 Starting live screenshot capture...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Desktop - 1920x1080
    console.log('\n📸 Capturing DESKTOP screenshots (1920x1080)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1920, height: 1080 });
    
    await desktopPage.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    await desktopPage.waitForTimeout(2000);
    await desktopPage.screenshot({ path: 'LIVE-Desktop-01-Homepage.png', fullPage: false });
    console.log('✅ Desktop Homepage');
    
    // Click collapse sidebar
    const collapseButton = await desktopPage.$('[data-sidebar="sidebar"] button[data-sidebar="trigger"]');
    if (collapseButton) {
      await collapseButton.click();
      await desktopPage.waitForTimeout(1000);
      await desktopPage.screenshot({ path: 'LIVE-Desktop-02-Sidebar-Collapsed.png', fullPage: false });
      console.log('✅ Desktop Sidebar Collapsed');
    }
    
    await desktopPage.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'networkidle0' });
    await desktopPage.waitForTimeout(2000);
    await desktopPage.screenshot({ path: 'LIVE-Desktop-03-Category-Encoding.png', fullPage: false });
    console.log('✅ Desktop Encoding Category');
    
    await desktopPage.close();

    // Tablet Portrait - 768x1024
    console.log('\n📸 Capturing TABLET PORTRAIT screenshots (768x1024)...');
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ width: 768, height: 1024 });
    
    await tabletPage.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    await tabletPage.waitForTimeout(2000);
    await tabletPage.screenshot({ path: 'LIVE-Tablet-Portrait-01-Homepage.png', fullPage: false });
    console.log('✅ Tablet Portrait Homepage');
    
    await tabletPage.goto('http://localhost:5000/category/protocols-transport', { waitUntil: 'networkidle0' });
    await tabletPage.waitForTimeout(2000);
    await tabletPage.screenshot({ path: 'LIVE-Tablet-Portrait-02-Category.png', fullPage: false });
    console.log('✅ Tablet Portrait Category');
    
    await tabletPage.close();

    // Tablet Landscape - 1024x768
    console.log('\n📸 Capturing TABLET LANDSCAPE screenshots (1024x768)...');
    const tabletLandscapePage = await browser.newPage();
    await tabletLandscapePage.setViewport({ width: 1024, height: 768 });
    
    await tabletLandscapePage.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    await tabletLandscapePage.waitForTimeout(2000);
    await tabletLandscapePage.screenshot({ path: 'LIVE-Tablet-Landscape-01-Homepage.png', fullPage: false });
    console.log('✅ Tablet Landscape Homepage');
    
    await tabletLandscapePage.goto('http://localhost:5000/category/media-tools', { waitUntil: 'networkidle0' });
    await tabletLandscapePage.waitForTimeout(2000);
    await tabletLandscapePage.screenshot({ path: 'LIVE-Tablet-Landscape-02-Category.png', fullPage: false });
    console.log('✅ Tablet Landscape Category');
    
    await tabletLandscapePage.close();

    // Mobile - 375x667
    console.log('\n📸 Capturing MOBILE screenshots (375x667)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 667 });
    
    await mobilePage.goto('http://localhost:5000/', { waitUntil: 'networkidle0' });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: 'LIVE-Mobile-01-Homepage.png', fullPage: false });
    console.log('✅ Mobile Homepage');
    
    await mobilePage.goto('http://localhost:5000/category/community-events', { waitUntil: 'networkidle0' });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: 'LIVE-Mobile-02-Category.png', fullPage: false });
    console.log('✅ Mobile Category');
    
    await mobilePage.close();

    console.log('\n✨ All screenshots captured successfully!');
    console.log('📁 Screenshots saved as LIVE-*.png');
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
