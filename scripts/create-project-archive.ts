
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function createProjectArchive() {
  const projectRoot = path.resolve(__dirname, '..');
  const archiveName = 'awesome-list-site-complete.zip';
  const archivePath = path.join(projectRoot, archiveName);

  console.log('🗂️  Creating project archive...');

  // Remove existing archive if it exists
  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  try {
    // Create zip archive excluding unnecessary files
    const excludePatterns = [
      '--exclude=node_modules/*',
      '--exclude=.git/*',
      '--exclude=dist/*',
      '--exclude=.cache/*',
      '--exclude=logs/*',
      '--exclude=*.log',
      '--exclude=.DS_Store',
      `--exclude=${archiveName}`
    ];

    const command = `cd "${projectRoot}" && zip -r "${archiveName}" . ${excludePatterns.join(' ')}`;
    
    console.log('📦 Creating zip archive...');
    execSync(command, { stdio: 'inherit' });

    const stats = fs.statSync(archivePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Archive created successfully!`);
    console.log(`📁 File: ${archiveName}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📂 Location: ${archivePath}`);
    console.log(`\n🌐 The archive will be available for download at: http://localhost:5000/download/${archiveName}`);

    return archivePath;
  } catch (error) {
    console.error('❌ Error creating archive:', error);
    throw error;
  }
}

if (require.main === module) {
  createProjectArchive().catch(console.error);
}

export { createProjectArchive };
#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

function log(message: string, level: 'info' | 'success' | 'error' = 'info'): void {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${message}${reset}`);
}

async function createProjectArchive(): Promise<void> {
  log('🗂️ Creating project archive...', 'info');
  
  const archiveName = 'awesome-list-site-complete.tar.gz';
  const excludePatterns = [
    '--exclude=node_modules',
    '--exclude=.git',
    '--exclude=dist',
    '--exclude=.cache',
    '--exclude=logs/*.log',
    '--exclude=*.tar.gz',
    '--exclude=*.zip'
  ];
  
  try {
    // Create the archive
    const tarCommand = `tar -czf ${archiveName} ${excludePatterns.join(' ')} .`;
    log('Creating compressed archive...', 'info');
    execSync(tarCommand, { stdio: 'inherit' });
    
    // Verify the archive was created
    if (existsSync(archiveName)) {
      const stats = execSync(`ls -lh ${archiveName}`, { encoding: 'utf8' });
      log(`✅ Archive created successfully: ${stats.trim()}`, 'success');
      
      // Create download instructions
      const instructions = `# Project Archive Created

## Download File
\`${archiveName}\`

## Archive Contents
- Complete source code (all TypeScript, React, and configuration files)
- Working deployment scripts with 2011 awesome-video resources
- GitHub Actions workflows for automated deployment
- Client-side React application with full UI components
- Server components and API routes
- Data files with processed awesome-video resources
- Configuration files and documentation

## Excluded from Archive
- \`node_modules\` directory (reinstall with npm install)
- \`.git\` directory (to avoid git conflicts)
- \`dist\` and \`.cache\` directories (rebuilt during development)
- Log files

## Setup Instructions
1. Extract: \`tar -xzf ${archiveName}\`
2. Install dependencies: \`npm install\`
3. Start development: \`npm run dev\`
4. Deploy: \`npm run deploy\`

## File Size
${stats.trim()}

The archive is ready for download and contains your complete working deployment system.`;
      
      writeFileSync('ARCHIVE-DOWNLOAD.md', instructions);
      log('📋 Download instructions created in ARCHIVE-DOWNLOAD.md', 'success');
      
      // Show download information
      console.log('\n' + '='.repeat(60));
      log('🎉 PROJECT ARCHIVE READY FOR DOWNLOAD', 'success');
      console.log('='.repeat(60));
      log(`📦 File: ${archiveName}`, 'info');
      log('📁 Location: Current directory', 'info');
      log('💾 Ready to download from Replit file browser', 'info');
      console.log('\n📋 Full setup instructions available in ARCHIVE-DOWNLOAD.md');
      
    } else {
      throw new Error('Archive creation failed - file not found');
    }
    
  } catch (error) {
    log(`❌ Error creating archive: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the archive creation
createProjectArchive().catch(console.error);
