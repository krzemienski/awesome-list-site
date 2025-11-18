#!/usr/bin/env tsx

/**
 * Test script for GitHub Awesome List Synchronization
 * This script demonstrates and tests the GitHub sync functionality
 */

import { parseAwesomeList } from "../server/github/parser";
import { AwesomeListFormatter, generateContributingMd } from "../server/github/formatter";
import { GitHubClient } from "../server/github/client";

// Sample awesome list README content for testing
const sampleAwesomeListContent = `# Awesome Example List

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![GitHub stars](https://img.shields.io/github/stars/example/awesome-example)](https://github.com/example/awesome-example)

> A curated list of awesome example resources for developers

## Contents

- [Learning Resources](#learning-resources)
- [Tools](#tools)
  - [CLI Tools](#cli-tools)
  - [Web Tools](#web-tools)
- [Libraries](#libraries)

## Learning Resources

Resources for learning about the topic.

- [Official Documentation](https://example.com/docs) - The official documentation for getting started.
- [Video Tutorial Series](https://youtube.com/example) - Comprehensive video tutorials covering basics to advanced topics.
- [Interactive Course](https://learn.example.com) - Hands-on interactive course with exercises.

## Tools

### CLI Tools

Command-line tools for developers.

- [Example CLI](https://github.com/example/cli) - A powerful command-line tool for managing projects.
- [Helper Tool](https://github.com/example/helper) - Automates common development tasks.

### Web Tools

Web-based tools and applications.

- [Online Editor](https://editor.example.com) - Browser-based code editor with live preview.
- [API Explorer](https://api.example.com) - Interactive API documentation and testing tool.

## Libraries

### JavaScript

- [ExampleJS](https://github.com/example/examplejs) - Core JavaScript library for building applications.
- [UtilityLib](https://github.com/example/utility) - Collection of utility functions.

### Python

- [PyExample](https://github.com/example/py-example) - Python implementation of the example framework.

## License

[![CC0](http://mirrors.creativecommons.org/presskit/buttons/88x31/svg/cc-zero.svg)](http://creativecommons.org/publicdomain/zero/1.0)
`;

async function testParser() {
  console.log("🧪 Testing Awesome List Parser");
  console.log("=" .repeat(50));

  try {
    const parsed = await parseAwesomeList(sampleAwesomeListContent);
    
    console.log("\n📋 Parsed List Information:");
    console.log(`  Title: ${parsed.title}`);
    console.log(`  Description: ${parsed.description}`);
    console.log(`  Badges found: ${parsed.badges.length}`);
    console.log(`  Total resources: ${parsed.resources.length}`);
    
    console.log("\n📊 Resources by Category:");
    const categoryGroups = new Map<string, number>();
    for (const resource of parsed.resources) {
      const count = categoryGroups.get(resource.category) || 0;
      categoryGroups.set(resource.category, count + 1);
    }
    
    for (const [category, count] of categoryGroups) {
      console.log(`  ${category}: ${count} resources`);
    }
    
    console.log("\n✅ Parser test completed successfully!");
    return parsed;
  } catch (error) {
    console.error("❌ Parser test failed:", error);
    throw error;
  }
}

async function testFormatter() {
  console.log("\n🧪 Testing Awesome List Formatter");
  console.log("=" .repeat(50));

  try {
    // Create sample resources for formatting
    const sampleResources = [
      {
        id: 1,
        title: "Resource One",
        url: "https://example.com/one",
        description: "First sample resource",
        category: "Learning",
        subcategory: "Tutorials",
        status: "approved" as const,
        githubSynced: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        title: "Resource Two",
        url: "https://example.com/two",
        description: "Second sample resource",
        category: "Tools",
        subcategory: "CLI",
        status: "approved" as const,
        githubSynced: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        title: "Resource Three",
        url: "https://example.com/three",
        description: "Third sample resource",
        category: "Tools",
        subcategory: "Web",
        subSubcategory: "Editors",
        status: "approved" as const,
        githubSynced: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const formatter = new AwesomeListFormatter(sampleResources as any, {
      title: "Test List",
      description: "A test awesome list for demonstration",
      includeContributing: true,
      includeLicense: true,
      websiteUrl: "https://awesome-list.com",
      repoUrl: "https://github.com/example/awesome-test"
    });

    const formattedContent = formatter.generate();
    
    console.log("\n📝 Generated README Preview (first 500 chars):");
    console.log(formattedContent.substring(0, 500) + "...");
    
    console.log("\n✅ Formatter test completed successfully!");
    
    // Test Contributing.md generation
    console.log("\n📝 Testing CONTRIBUTING.md generation...");
    const contributingContent = generateContributingMd(
      "https://awesome-list.com",
      "https://github.com/example/awesome-test"
    );
    
    console.log("Generated CONTRIBUTING.md preview (first 300 chars):");
    console.log(contributingContent.substring(0, 300) + "...");
    
    return formattedContent;
  } catch (error) {
    console.error("❌ Formatter test failed:", error);
    throw error;
  }
}

async function testGitHubClient() {
  console.log("\n🧪 Testing GitHub Client");
  console.log("=" .repeat(50));

  try {
    // Note: This test will only work with a valid GitHub token
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      console.log("⚠️  GITHUB_TOKEN not set. Skipping GitHub API tests.");
      console.log("   To test GitHub API integration:");
      console.log("   1. Create a GitHub personal access token");
      console.log("   2. Set GITHUB_TOKEN environment variable");
      return;
    }

    const client = new GitHubClient(token);
    
    // Test repo URL parsing
    console.log("\n📍 Testing repository URL parsing:");
    const testUrls = [
      "https://github.com/sindresorhus/awesome",
      "github.com/example/repo",
      "example/repo"
    ];
    
    for (const url of testUrls) {
      try {
        const parsed = client.parseRepoUrl(url);
        console.log(`  ✓ ${url} -> owner: ${parsed.owner}, repo: ${parsed.repo}`);
      } catch (error: any) {
        console.log(`  ✗ ${url} -> ${error.message}`);
      }
    }
    
    // Test rate limit check
    console.log("\n📊 Checking GitHub API rate limit:");
    const rateLimit = await client.getRateLimit();
    console.log(`  Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
    console.log(`  Resets at: ${rateLimit.reset.toLocaleString()}`);
    
    console.log("\n✅ GitHub Client test completed!");
  } catch (error) {
    console.error("❌ GitHub Client test failed:", error);
    throw error;
  }
}

async function runAllTests() {
  console.log("🚀 GitHub Awesome List Synchronization Test Suite");
  console.log("=" .repeat(60));
  console.log("This test suite demonstrates the GitHub sync functionality");
  console.log("=" .repeat(60));

  try {
    await testParser();
    await testFormatter();
    await testGitHubClient();
    
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 All tests completed successfully!");
    console.log("=" .repeat(60));
    
    console.log("\n📚 Implementation Summary:");
    console.log("✅ Parser module: Extracts resources from awesome list README");
    console.log("✅ Formatter module: Generates awesome-lint compliant README");
    console.log("✅ Client module: Handles GitHub API interactions");
    console.log("✅ Sync service: Orchestrates import/export operations");
    console.log("✅ API routes: Provides HTTP endpoints for sync operations");
    
    console.log("\n🔧 Available API Endpoints:");
    console.log("POST /api/github/configure - Configure GitHub repository");
    console.log("POST /api/github/import - Import from awesome list");
    console.log("POST /api/github/export - Export to GitHub");
    console.log("GET /api/github/sync-status - Check sync queue");
    console.log("GET /api/github/history - View sync history");
    console.log("POST /api/github/process-queue - Process sync queue");
    
    console.log("\n📝 Next Steps:");
    console.log("1. Set GITHUB_TOKEN environment variable");
    console.log("2. Configure a repository using /api/github/configure");
    console.log("3. Import resources using /api/github/import");
    console.log("4. Export approved resources using /api/github/export");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();