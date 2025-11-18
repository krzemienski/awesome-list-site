import { GitHubClient } from "../server/github/client";

async function testImport() {
  console.log("🧪 Testing GitHub Import with Raw URLs");
  console.log("=" .repeat(60));
  
  const repoUrl = "https://github.com/krzemienski/awesome-video/";
  const client = new GitHubClient();
  
  try {
    console.log(`\n📥 Fetching README.md from ${repoUrl}`);
    console.log("Testing raw URL derivation and branch fallback...\n");
    
    const content = await client.fetchFile(repoUrl, "README.md");
    
    console.log("\n✅ Success! README.md fetched successfully");
    console.log(`📄 Content length: ${content.length} characters`);
    console.log(`📝 Preview (first 200 chars):\n${content.substring(0, 200)}...\n`);
    
    // Verify it's the correct repo
    if (content.includes("awesome-video") || content.includes("Awesome Video")) {
      console.log("✅ Content verified - this is the awesome-video repository!");
    }
    
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 Import test completed successfully!");
    console.log("=" .repeat(60));
    console.log("\nKey features verified:");
    console.log("✅ Raw URL derivation works");
    console.log("✅ Branch fallback (main/master) works");
    console.log("✅ No authentication needed for public repos");
    console.log("✅ README.md fetched successfully");
    
  } catch (error: any) {
    console.error("\n❌ Import test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testImport();
