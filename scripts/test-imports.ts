import { GitHubSyncService } from "../server/github/syncService";

const testRepos = [
  "https://github.com/manuzhang/awesome-streaming",
  "https://github.com/lnishan/awesome-competitive-programming", 
  "https://github.com/academic/awesome-datascience",
  "https://github.com/JStumpp/awesome-android",
  "https://github.com/avelino/awesome-go",
  "https://github.com/rust-unofficial/awesome-rust",
  "https://github.com/vinta/awesome-python",
  "https://github.com/enaqx/awesome-react"
];

async function testImports() {
  const syncService = new GitHubSyncService();
  
  console.log("Testing GitHub import with 8 awesome list repositories...\n");
  console.log("Running in dry-run mode to validate without making database changes.\n");
  
  const results: Array<{
    repo: string;
    validationPassed: boolean;
    resources: number;
    categories: number;
    errors: number;
    warnings: number;
  }> = [];
  
  for (const repoUrl of testRepos) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${repoUrl}`);
    console.log(`${"=".repeat(60)}`);
    
    try {
      const result = await syncService.importFromGitHub(repoUrl, { 
        dryRun: true,
        strictMode: false 
      });
      
      results.push({
        repo: repoUrl.split('/').slice(-2).join('/'),
        validationPassed: result.validationPassed,
        resources: result.validationStats.totalResources,
        categories: result.validationStats.totalCategories,
        errors: result.validationErrors.filter(e => e.severity === 'error').length,
        warnings: result.validationErrors.filter(e => e.severity === 'warning').length
      });
      
      console.log(`\nValidation: ${result.validationPassed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`Resources: ${result.validationStats.totalResources}`);
      console.log(`Categories: ${result.validationStats.totalCategories}`);
      console.log(`Errors: ${result.validationErrors.filter(e => e.severity === 'error').length}`);
      console.log(`Warnings: ${result.validationErrors.filter(e => e.severity === 'warning').length}`);
      
      if (!result.validationPassed && result.validationErrors.length > 0) {
        console.log("\nFirst 5 validation errors:");
        result.validationErrors
          .filter(e => e.severity === 'error')
          .slice(0, 5)
          .forEach((e, i) => {
            console.log(`  ${i + 1}. [Line ${e.line}] ${e.rule}: ${e.message}`);
          });
      }
      
    } catch (error: any) {
      console.log(`\n✗ FAILED TO FETCH: ${error.message}`);
      results.push({
        repo: repoUrl.split('/').slice(-2).join('/'),
        validationPassed: false,
        resources: 0,
        categories: 0,
        errors: 1,
        warnings: 0
      });
    }
    
    // Rate limit - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n\n");
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log("\n");
  
  console.log("| Repository | Validation | Resources | Categories | Errors | Warnings |");
  console.log("|------------|------------|-----------|------------|--------|----------|");
  
  for (const r of results) {
    const status = r.validationPassed ? "✓ PASS" : "✗ FAIL";
    console.log(`| ${r.repo.padEnd(10).slice(0, 25)} | ${status.padEnd(10)} | ${String(r.resources).padStart(9)} | ${String(r.categories).padStart(10)} | ${String(r.errors).padStart(6)} | ${String(r.warnings).padStart(8)} |`);
  }
  
  const passed = results.filter(r => r.validationPassed).length;
  const failed = results.filter(r => !r.validationPassed).length;
  
  console.log("\n");
  console.log(`Total: ${passed} passed, ${failed} failed out of ${results.length} repositories`);
  console.log("\n");
}

testImports().catch(console.error);
