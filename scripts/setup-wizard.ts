#!/usr/bin/env tsx

/**
 * Interactive Configuration Wizard for Awesome List Projects
 * 
 * This wizard guides users through the complete setup process:
 * 1. Project information (title, description, author)
 * 2. Awesome list source selection
 * 3. Theme and design configuration
 * 4. Feature selection (AI, analytics, search)
 * 5. Environment setup guidance
 * 6. Initial deployment preparation
 */

import { createInterface } from 'readline';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface WizardConfig {
  site: {
    title: string;
    description: string;
    url: string;
    author: string;
  };
  source: {
    url: string;
    format: string;
    refresh_interval: number;
  };
  theme: {
    default: string;
    primary_color: string;
  };
  features: {
    ai_tags: boolean;
    ai_descriptions: boolean;
    ai_categories: boolean;
    search: boolean;
    categories: boolean;
    analytics_dashboard: boolean;
  };
  analytics?: {
    google_analytics?: string;
  };
}

interface AwesomeListOption {
  name: string;
  title: string;
  description: string;
  url: string;
  category: string;
  stars: number;
  language?: string;
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m'     // yellow
  };
  const reset = '\x1b[0m';
  const prefix = level === 'success' ? '✅' : level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${colors[level]}${prefix} ${message}${reset}`);
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function header(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`🧙‍♂️ ${title}`);
  console.log('='.repeat(60));
}

function section(title: string): void {
  console.log('\n' + '-'.repeat(40));
  console.log(`📋 ${title}`);
  console.log('-'.repeat(40));
}

function choice(options: string[], question: string): Promise<number> {
  return new Promise(async (resolve) => {
    console.log(`\n${question}`);
    options.forEach((option, index) => {
      console.log(`${index + 1}. ${option}`);
    });
    
    while (true) {
      const answer = await prompt('\nEnter your choice (number): ');
      const choice = parseInt(answer);
      if (choice >= 1 && choice <= options.length) {
        resolve(choice - 1);
        break;
      }
      log('Invalid choice. Please enter a valid number.', 'error');
    }
  });
}

function multiChoice(options: { name: string; description: string; recommended?: boolean }[], question: string): Promise<string[]> {
  return new Promise(async (resolve) => {
    console.log(`\n${question}`);
    console.log('(Enter multiple numbers separated by commas, or "all" for all options)');
    
    options.forEach((option, index) => {
      const recommended = option.recommended ? ' (recommended)' : '';
      console.log(`${index + 1}. ${option.name}${recommended}`);
      console.log(`   ${option.description}`);
    });
    
    while (true) {
      const answer = await prompt('\nEnter your choices: ');
      
      if (answer.toLowerCase() === 'all') {
        resolve(options.map(o => o.name));
        break;
      }
      
      const choices = answer.split(',').map(s => s.trim());
      const indices: number[] = [];
      let valid = true;
      
      for (const choice of choices) {
        const index = parseInt(choice);
        if (index >= 1 && index <= options.length) {
          indices.push(index - 1);
        } else {
          valid = false;
          break;
        }
      }
      
      if (valid) {
        resolve(indices.map(i => options[i].name));
        break;
      }
      
      log('Invalid choices. Please enter valid numbers separated by commas.', 'error');
    }
  });
}

const POPULAR_AWESOME_LISTS: AwesomeListOption[] = [
  {
    name: 'awesome-video',
    title: 'Awesome Video',
    description: 'A curated list of awesome video frameworks, libraries, and tools',
    url: 'https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json',
    category: 'Media & Entertainment',
    stars: 1500,
    language: 'JSON'
  },
  {
    name: 'awesome-javascript',
    title: 'Awesome JavaScript',
    description: 'A collection of awesome browser-side JavaScript libraries',
    url: 'https://raw.githubusercontent.com/sorrycc/awesome-javascript/master/README.md',
    category: 'Programming Languages',
    stars: 33000
  },
  {
    name: 'awesome-python',
    title: 'Awesome Python',
    description: 'A curated list of awesome Python frameworks, libraries, and software',
    url: 'https://raw.githubusercontent.com/vinta/awesome-python/master/README.md',
    category: 'Programming Languages',
    stars: 220000
  },
  {
    name: 'awesome-react',
    title: 'Awesome React',
    description: 'A collection of awesome things regarding React ecosystem',
    url: 'https://raw.githubusercontent.com/enaqx/awesome-react/master/README.md',
    category: 'Frontend Frameworks',
    stars: 64000
  },
  {
    name: 'awesome-vue',
    title: 'Awesome Vue.js',
    description: 'A curated list of awesome things related to Vue.js',
    url: 'https://raw.githubusercontent.com/vuejs/awesome-vue/master/README.md',
    category: 'Frontend Frameworks',
    stars: 72000
  },
  {
    name: 'awesome-nodejs',
    title: 'Awesome Node.js',
    description: 'Delightful Node.js packages and resources',
    url: 'https://raw.githubusercontent.com/sindresorhus/awesome-nodejs/main/readme.md',
    category: 'Backend Development',
    stars: 58000
  },
  {
    name: 'awesome-machine-learning',
    title: 'Awesome Machine Learning',
    description: 'A curated list of awesome Machine Learning frameworks and libraries',
    url: 'https://raw.githubusercontent.com/josephmisiti/awesome-machine-learning/master/README.md',
    category: 'AI & Machine Learning',
    stars: 65000
  },
  {
    name: 'awesome-docker',
    title: 'Awesome Docker',
    description: 'A curated list of Docker resources and projects',
    url: 'https://raw.githubusercontent.com/veggiemonk/awesome-docker/master/README.md',
    category: 'DevOps & Infrastructure',
    stars: 30000
  }
];

const THEME_OPTIONS = [
  { name: 'red', description: 'Bold red theme with high contrast', color: '#ef4444' },
  { name: 'blue', description: 'Professional blue theme', color: '#3b82f6' },
  { name: 'green', description: 'Nature-inspired green theme', color: '#10b981' },
  { name: 'purple', description: 'Creative purple theme', color: '#8b5cf6' },
  { name: 'orange', description: 'Energetic orange theme', color: '#f97316' },
  { name: 'teal', description: 'Modern teal theme', color: '#14b8a6' }
];

const FEATURE_OPTIONS = [
  {
    name: 'search',
    description: 'Real-time search with filters and sorting',
    recommended: true
  },
  {
    name: 'categories',
    description: 'Category-based navigation and filtering',
    recommended: true
  },
  {
    name: 'ai_tags',
    description: 'AI-powered automatic tagging (requires API key)',
    recommended: false
  },
  {
    name: 'ai_descriptions',
    description: 'AI-enhanced descriptions (requires API key)',
    recommended: false
  },
  {
    name: 'ai_categories',
    description: 'AI-powered categorization (requires API key)',
    recommended: false
  },
  {
    name: 'analytics_dashboard',
    description: 'Built-in analytics and usage statistics',
    recommended: true
  }
];

async function welcomeScreen(): Promise<void> {
  header('Awesome List Configuration Wizard');
  
  console.log(`
Welcome to the Awesome List Configuration Wizard! 🧙‍♂️

This wizard will guide you through setting up your awesome list dashboard:

• Project information and branding
• Awesome list source selection
• Theme and design customization  
• Feature selection and AI integration
• Analytics and tracking setup
• Environment configuration guidance
• Deployment preparation

Let's create something awesome together!
  `);
  
  await prompt('Press Enter to continue...');
}

async function collectProjectInfo(): Promise<WizardConfig['site']> {
  section('Project Information');
  
  console.log('Let\'s start with basic information about your project.');
  
  const title = await prompt('📄 Project title (e.g., "My Awesome Dashboard"): ');
  const description = await prompt('📝 Short description (e.g., "A curated collection of awesome resources"): ');
  const author = await prompt('👤 Author name: ');
  
  // Generate URL suggestion based on current git repository
  let suggestedUrl = '';
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (remoteUrl.includes('github.com')) {
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^./]+)/);
      if (match) {
        const [, username, repo] = match;
        suggestedUrl = `https://${username}.github.io/${repo}`;
      }
    }
  } catch {
    // No git repository or remote, that's fine
  }
  
  const urlPrompt = suggestedUrl ? 
    `🌐 Site URL (suggested: ${suggestedUrl}): ` : 
    '🌐 Site URL (e.g., "https://username.github.io/awesome-list"): ';
  
  const urlInput = await prompt(urlPrompt);
  const url = urlInput.trim() || suggestedUrl;
  
  return {
    title: title || 'Awesome Dashboard',
    description: description || 'A curated collection of awesome resources',
    url: url || 'https://example.github.io/awesome-list',
    author: author || 'Anonymous'
  };
}

async function selectAwesomeList(): Promise<WizardConfig['source']> {
  section('Awesome List Source Selection');
  
  console.log('Choose an awesome list to power your dashboard:');
  
  const listOptions = POPULAR_AWESOME_LISTS.map(list => 
    `${list.title} - ${list.description} (⭐ ${list.stars.toLocaleString()})`
  );
  listOptions.push('Custom URL - I have my own awesome list');
  
  const selectedIndex = await choice(listOptions, 'Which awesome list would you like to use?');
  
  if (selectedIndex === listOptions.length - 1) {
    // Custom URL
    const customUrl = await prompt('Enter the raw URL of your awesome list: ');
    const formatChoice = await choice(['Markdown', 'JSON'], 'What format is your awesome list?');
    
    return {
      url: customUrl,
      format: formatChoice === 0 ? 'markdown' : 'json',
      refresh_interval: 24
    };
  } else {
    const selectedList = POPULAR_AWESOME_LISTS[selectedIndex];
    return {
      url: selectedList.url,
      format: selectedList.language === 'JSON' ? 'json' : 'markdown',
      refresh_interval: 24
    };
  }
}

async function selectTheme(): Promise<WizardConfig['theme']> {
  section('Theme Selection');
  
  console.log('Choose a theme for your dashboard:');
  
  const themeOptions = THEME_OPTIONS.map(theme => 
    `${theme.name.charAt(0).toUpperCase() + theme.name.slice(1)} - ${theme.description}`
  );
  
  const selectedIndex = await choice(themeOptions, 'Which theme would you like?');
  const selectedTheme = THEME_OPTIONS[selectedIndex];
  
  return {
    default: selectedTheme.name,
    primary_color: selectedTheme.color
  };
}

async function selectFeatures(): Promise<WizardConfig['features']> {
  section('Feature Selection');
  
  console.log('Select the features you want to enable:');
  
  const selectedFeatures = await multiChoice(FEATURE_OPTIONS, 'Which features would you like?');
  
  const features: WizardConfig['features'] = {
    ai_tags: selectedFeatures.includes('ai_tags'),
    ai_descriptions: selectedFeatures.includes('ai_descriptions'),
    ai_categories: selectedFeatures.includes('ai_categories'),
    search: selectedFeatures.includes('search'),
    categories: selectedFeatures.includes('categories'),
    analytics_dashboard: selectedFeatures.includes('analytics_dashboard')
  };
  
  // Show AI features cost warning
  if (features.ai_tags || features.ai_descriptions || features.ai_categories) {
    log('AI features require an Anthropic API key and have usage costs ($0.25-$15/month)', 'warn');
  }
  
  return features;
}

async function setupAnalytics(): Promise<WizardConfig['analytics'] | undefined> {
  section('Analytics Configuration');
  
  const enableAnalytics = await prompt('🔍 Enable Google Analytics? (y/n): ');
  
  if (enableAnalytics.toLowerCase() === 'y' || enableAnalytics.toLowerCase() === 'yes') {
    console.log(`
To set up Google Analytics:
1. Go to https://analytics.google.com
2. Create a new GA4 property
3. Get your Measurement ID (starts with "G-")
    `);
    
    const gaId = await prompt('Enter your Google Analytics Measurement ID (or leave blank): ');
    
    if (gaId.trim()) {
      return {
        google_analytics: gaId.trim()
      };
    }
  }
  
  return undefined;
}

async function generateConfiguration(config: WizardConfig): Promise<void> {
  section('Generating Configuration');
  
  const configContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 80,
    noRefs: true
  });
  
  // Add header comment
  const headerComment = `# Awesome List Configuration
# Generated by Configuration Wizard
# 
# This file configures your awesome list dashboard.
# You can edit these settings at any time.
#
# For more information, see: README.md

`;
  
  const finalConfig = headerComment + configContent;
  
  fs.writeFileSync('awesome-list.config.yaml', finalConfig, 'utf8');
  log('Configuration file created: awesome-list.config.yaml', 'success');
}

async function environmentGuidance(config: WizardConfig): Promise<void> {
  section('Environment Setup Guidance');
  
  console.log('To complete your setup, you may need to configure these environment variables:');
  
  // Check which secrets are needed
  const needsAnthropicKey = config.features.ai_tags || config.features.ai_descriptions || config.features.ai_categories;
  const needsGAKey = !!config.analytics?.google_analytics;
  
  if (needsAnthropicKey) {
    console.log(`
🤖 ANTHROPIC_API_KEY (Required for AI features)
   • Get your API key from: https://console.anthropic.com
   • Format: sk-ant-your-key-here
   • Cost: $0.25-$15/month depending on usage
    `);
  }
  
  if (needsGAKey) {
    console.log(`
📊 VITE_GA_MEASUREMENT_ID (For Google Analytics)
   • Your Measurement ID: ${config.analytics?.google_analytics}
   • Already configured in your config file
    `);
  }
  
  console.log(`
For local development, set these in your terminal:
export ANTHROPIC_API_KEY="sk-ant-your-key"
export VITE_GA_MEASUREMENT_ID="${config.analytics?.google_analytics || 'G-YOUR-ID'}"

For deployment, add these as repository secrets:
• Go to GitHub repository Settings → Secrets and variables → Actions
• Add each secret with the exact names above
  `);
}

async function nextStepsGuidance(): Promise<void> {
  section('Next Steps');
  
  console.log(`
🎉 Configuration complete! Here's what to do next:

1. 🧪 Test your configuration:
   npm run dev

2. 🚀 Deploy to production:
   npx tsx scripts/build-and-deploy.ts

3. 📊 View your dashboard:
   Your site will be live at the URL you specified

4. 🔧 Customize further:
   • Edit awesome-list.config.yaml for advanced settings
   • Modify themes in client/src/styles/
   • Add custom features in client/src/components/

5. 📚 Need help?
   • Check README.md for detailed documentation
   • Visit GitHub issues for support
   • Review deployment troubleshooting guides

Happy building! 🚀
  `);
}

async function main(): Promise<void> {
  try {
    await welcomeScreen();
    
    // Step 1: Project Information
    const siteConfig = await collectProjectInfo();
    
    // Step 2: Awesome List Source
    const sourceConfig = await selectAwesomeList();
    
    // Step 3: Theme Selection
    const themeConfig = await selectTheme();
    
    // Step 4: Feature Selection
    const featuresConfig = await selectFeatures();
    
    // Step 5: Analytics Setup
    const analyticsConfig = await setupAnalytics();
    
    // Compile final configuration
    const config: WizardConfig = {
      site: siteConfig,
      source: sourceConfig,
      theme: themeConfig,
      features: featuresConfig,
      ...(analyticsConfig && { analytics: analyticsConfig })
    };
    
    // Step 6: Generate configuration file
    await generateConfiguration(config);
    
    // Step 7: Environment guidance
    await environmentGuidance(config);
    
    // Step 8: Next steps
    await nextStepsGuidance();
    
    log('Configuration wizard completed successfully!', 'success');
    
  } catch (error) {
    log(`Wizard failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}