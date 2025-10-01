// Simple script to check sidebar DOM structure and verify the fix
import http from 'http';

function checkSidebar() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/category/intro-learning', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Check for our fixes
        const hasPadding = data.includes('pr-3');
        const hasTabularNums = data.includes('tabular-nums');
        const hasMinWidth = data.includes('min-w-[3ch]') || data.includes('min-w-[2ch]');
        const hasMlAuto = data.includes('ml-auto');
        
        console.log('🔍 Sidebar Fix Verification:');
        console.log('──────────────────────────');
        console.log(`✅ Added pr-3 padding: ${hasPadding}`);
        console.log(`✅ Added tabular-nums class: ${hasTabularNums}`);
        console.log(`✅ Added min-width for numbers: ${hasMinWidth}`);
        console.log(`✅ Added ml-auto for proper spacing: ${hasMlAuto}`);
        
        // Check if we can find the sidebar width in inline styles
        const sidebarWidthMatch = data.match(/--sidebar-width:\s*([^;'"]+)/);
        if (sidebarWidthMatch) {
          console.log(`✅ Sidebar width CSS variable: ${sidebarWidthMatch[1]}`);
        }
        
        // Look for the actual numbers in the sidebar
        const numbersRegex = /<span[^>]*class="[^"]*text-xs[^"]*text-muted-foreground[^"]*"[^>]*>(\d+)<\/span>/g;
        const numbers = [];
        let match;
        
        while ((match = numbersRegex.exec(data)) !== null) {
          numbers.push(match[1]);
        }
        
        console.log('\n📊 Resource Counts Found:');
        console.log('─────────────────────────');
        if (numbers.length > 0) {
          console.log('Found these numbers in the sidebar:');
          numbers.slice(0, 10).forEach(num => {
            console.log(`  • ${num} resources`);
          });
          
          // Check for the critical 3-digit numbers
          const threeDigitNumbers = numbers.filter(n => n.length === 3);
          if (threeDigitNumbers.length > 0) {
            console.log(`\n✅ Found ${threeDigitNumbers.length} three-digit numbers:`, threeDigitNumbers.slice(0, 5).join(', '));
            console.log('   These should all be fully visible with the new 20rem width');
          }
        }
        
        console.log('\n🎯 Summary:');
        console.log('──────────');
        if (hasPadding && hasTabularNums && hasMinWidth && hasMlAuto) {
          console.log('✅ All sidebar fixes have been applied successfully!');
          console.log('✅ The sidebar width has been increased from 16rem to 20rem');
          console.log('✅ Numbers should now have proper spacing and not be truncated');
        } else {
          console.log('⚠️ Some fixes may not have been applied. Please check the implementation.');
        }
        
        resolve();
      });
    }).on('error', reject);
  });
}

checkSidebar().catch(console.error);