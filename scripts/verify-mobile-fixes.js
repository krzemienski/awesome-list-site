// Mobile verification script - Run this in browser console to test mobile functionality
const testMobileDialogs = () => {
  console.log('🔍 Testing Mobile Dialog Positioning...');
  
  // Check if dialogs are properly centered
  const checkDialogPositioning = () => {
    const dialogs = document.querySelectorAll('[data-radix-dialog-content]');
    dialogs.forEach((dialog, index) => {
      const rect = dialog.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const isWithinViewport = 
        rect.left >= 0 && 
        rect.right <= viewportWidth && 
        rect.top >= 0 && 
        rect.bottom <= viewportHeight;
      
      const isCentered = Math.abs((rect.left + rect.width/2) - viewportWidth/2) < 20;
      
      console.log(`Dialog ${index + 1}:`, {
        position: {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        },
        viewport: {
          width: viewportWidth,
          height: viewportHeight
        },
        status: {
          withinViewport: isWithinViewport,
          centered: isCentered
        }
      });
      
      if (!isWithinViewport) {
        console.error(`❌ Dialog ${index + 1} is positioned outside viewport!`);
      } else if (!isCentered) {
        console.warn(`⚠️ Dialog ${index + 1} is not properly centered`);
      } else {
        console.log(`✅ Dialog ${index + 1} is properly positioned`);
      }
    });
  };
  
  // Check sidebar functionality
  const checkSidebar = () => {
    console.log('🔍 Testing Sidebar...');
    const sidebar = document.querySelector('[data-sidebar]');
    const sidebarTrigger = document.querySelector('[data-sidebar-trigger]');
    
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      console.log('Sidebar found:', {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      });
    } else {
      console.warn('⚠️ No sidebar found');
    }
    
    if (sidebarTrigger) {
      console.log('✅ Sidebar trigger button found');
    } else {
      console.warn('⚠️ No sidebar trigger found');
    }
  };
  
  // Check mobile viewport meta tag
  const checkViewportMeta = () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      console.log('✅ Viewport meta tag:', viewport.content);
    } else {
      console.error('❌ No viewport meta tag found!');
    }
  };
  
  // Check touch targets
  const checkTouchTargets = () => {
    console.log('🔍 Checking touch target sizes...');
    const buttons = document.querySelectorAll('button');
    let smallButtons = 0;
    
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      if (rect.height < 44 || rect.width < 44) {
        smallButtons++;
      }
    });
    
    if (smallButtons > 0) {
      console.warn(`⚠️ ${smallButtons} buttons have touch targets smaller than 44px`);
    } else {
      console.log('✅ All buttons have adequate touch target size');
    }
  };
  
  // Run all checks
  checkViewportMeta();
  checkSidebar();
  checkDialogPositioning();
  checkTouchTargets();
  
  // Return summary
  return {
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    userAgent: navigator.userAgent,
    isMobile: window.innerWidth <= 768
  };
};

// Export for use in browser console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testMobileDialogs;
} else {
  console.log('📱 Mobile Test Script Loaded');
  console.log('Run testMobileDialogs() to test mobile functionality');
  window.testMobileDialogs = testMobileDialogs;
}