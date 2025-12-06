import { AwesomeListParser } from '../server/github/parser';
import * as fs from 'fs/promises';

async function testDeviationDetection() {
  try {
    console.log('🔍 Testing Format Deviation Detection\n');

    // Test awesome-video
    const videoMarkdown = await fs.readFile('/tmp/awesome-video-current.md', 'utf-8');
    const videoParser = new AwesomeListParser(videoMarkdown);
    const videoDeviations = videoParser.detectFormatDeviations();

    console.log('📹 awesome-video Deviations:');
    console.log(`   Deviations (${videoDeviations.deviations.length}):`);
    videoDeviations.deviations.forEach(d => console.log(`     - ${d}`));
    console.log(`   Warnings (${videoDeviations.warnings.length}):`);
    videoDeviations.warnings.forEach(w => console.log(`     - ${w}`));
    console.log(`   Can Proceed: ${videoDeviations.canProceed ? '✅ YES' : '❌ NO (manual review needed)'}\n`);

    // Test awesome-rust
    const rustMarkdown = await fs.readFile('/tmp/awesome-rust-raw.md', 'utf-8');
    const rustParser = new AwesomeListParser(rustMarkdown);
    const rustDeviations = rustParser.detectFormatDeviations();

    console.log('🦀 awesome-rust Deviations:');
    console.log(`   Deviations (${rustDeviations.deviations.length}):`);
    rustDeviations.deviations.forEach(d => console.log(`     - ${d}`));
    console.log(`   Warnings (${rustDeviations.warnings.length}):`);
    rustDeviations.warnings.forEach(w => console.log(`     - ${w}`));
    console.log(`   Can Proceed: ${rustDeviations.canProceed ? '✅ YES' : '❌ NO (manual review needed)'}\n`);

    console.log('✅ Deviation detection working!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDeviationDetection();
