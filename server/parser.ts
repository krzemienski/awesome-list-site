import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import fetch from 'node-fetch';

interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  license?: string;
  language?: string;
  sourceCode?: string;
  demo?: string;
}

interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
}

function log(message: string) {
  console.log(`${new Date().toISOString()} - ${message}`);
}

/**
 * Extract GitHub repo info from URL
 */
function extractRepoInfo(url: string) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Generate unique ID for resource
 */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Clean markdown text by removing links and formatting
 */
function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/`([^`]+)`/g, '$1') // Remove code formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Generate automatic tags based on URL and content
 */
function generateAutoTags(url: string, title: string, description: string): string[] {
  const tags: string[] = [];
  
  // URL-based tags
  if (url.includes('github.com')) {
    tags.push('GitHub');
  } else if (url.includes('gitlab.com')) {
    tags.push('GitLab');
  } else if (url.includes('bitbucket.org')) {
    tags.push('Bitbucket');
  }
  
  // Documentation/website tags
  if (url.includes('docs.') || url.includes('/docs/') || url.includes('documentation')) {
    tags.push('Documentation');
  }
  
  if (url.includes('blog.') || url.includes('/blog/')) {
    tags.push('Blog');
  }
  
  if (url.includes('api.') || url.includes('/api/')) {
    tags.push('API');
  }
  
  // Content-based tags
  const content = `${title} ${description}`.toLowerCase();
  
  if (content.includes('cli') || content.includes('command line')) {
    tags.push('CLI');
  }
  
  if (content.includes('web') || content.includes('http') || content.includes('server')) {
    tags.push('Web');
  }
  
  if (content.includes('database') || content.includes('db') || content.includes('sql')) {
    tags.push('Database');
  }
  
  if (content.includes('api') || content.includes('rest') || content.includes('graphql')) {
    tags.push('API');
  }
  
  if (content.includes('library') || content.includes('package')) {
    tags.push('Library');
  }
  
  if (content.includes('framework')) {
    tags.push('Framework');
  }
  
  if (content.includes('tool') || content.includes('utility')) {
    tags.push('Tool');
  }
  
  if (content.includes('test') || content.includes('testing')) {
    tags.push('Testing');
  }
  
  if (content.includes('docker') || content.includes('container')) {
    tags.push('Docker');
  }
  
  if (content.includes('kubernetes') || content.includes('k8s')) {
    tags.push('Kubernetes');
  }
  
  if (content.includes('json') || content.includes('xml') || content.includes('yaml')) {
    tags.push('Data Format');
  }
  
  if (content.includes('security') || content.includes('auth') || content.includes('crypto')) {
    tags.push('Security');
  }
  
  if (content.includes('monitor') || content.includes('log') || content.includes('metrics')) {
    tags.push('Monitoring');
  }
  
  if (content.includes('embed') || content.includes('lightweight') || content.includes('minimal')) {
    tags.push('Lightweight');
  }
  
  if (content.includes('performance') || content.includes('fast') || content.includes('speed')) {
    tags.push('Performance');
  }
  
  // Remove duplicates and return
  const uniqueTags: string[] = [];
  tags.forEach(tag => {
    if (!uniqueTags.includes(tag)) {
      uniqueTags.push(tag);
    }
  });
  return uniqueTags;
}

/**
 * Extract metadata from resource text (license, language, etc.)
 */
function extractMetadata(text: string) {
  const metadata: any = {};
  
  // Extract source code link
  const sourceMatch = text.match(/\[Source Code\]\(([^)]+)\)/i);
  if (sourceMatch) {
    metadata.sourceCode = sourceMatch[1];
  }
  
  // Extract demo link
  const demoMatch = text.match(/\[Demo\]\(([^)]+)\)/i);
  if (demoMatch) {
    metadata.demo = demoMatch[1];
  }
  
  // Extract license (usually in backticks)
  const licenseMatch = text.match(/`([A-Z][A-Z0-9\-\.]+)`/);
  if (licenseMatch) {
    metadata.license = licenseMatch[1];
  }
  
  // Extract language/platform (usually the last backtick item)
  const platformMatches = text.match(/`([^`]+)`/g);
  if (platformMatches && platformMatches.length > 1) {
    const lastMatch = platformMatches[platformMatches.length - 1];
    const platform = lastMatch.replace(/`/g, '');
    if (!platform.match(/^[A-Z][A-Z0-9\-\.]+$/)) { // Not a license format
      metadata.language = platform;
    }
  }
  
  return metadata;
}

/**
 * Parse list items into resources
 */
function parseListItems(tree: any, currentCategory: string, currentSubcategory?: string): Resource[] {
  const resources: Resource[] = [];
  
  visit(tree, 'listItem', (node: any) => {
    // Skip if this is a table of contents item (contains only links to headers)
    const text = extractTextFromNode(node);
    if (text.startsWith('#') || text.includes('back to top')) {
      return;
    }
    
    // Extract the main link (first link in the list item)
    let title = '';
    let url = '';
    let description = '';
    
    let linkCount = 0;
    visit(node, 'link', (linkNode: any) => {
      if (linkCount === 0) { // First link is the main resource
        title = extractTextFromNode(linkNode);
        url = linkNode.url;
      }
      linkCount++;
    });
    
    // Skip if no main link found or if it's an internal anchor link
    if (!title || !url || url.startsWith('#')) {
      return;
    }
    
    // Extract description (text after the first link)
    const fullText = extractTextFromNode(node);
    const titleIndex = fullText.indexOf(title);
    if (titleIndex !== -1) {
      description = fullText.substring(titleIndex + title.length).trim();
      // Remove leading dashes and clean up
      description = description.replace(/^[\s\-]+/, '').trim();
    }
    
    // Extract metadata
    const metadata = extractMetadata(fullText);
    
    // Clean description by removing metadata parts
    description = cleanText(description);
    
    // Generate automatic tags
    const autoTags = generateAutoTags(url, title, description);
    
    const resource: Resource = {
      id: generateId(),
      title: cleanText(title),
      url,
      description,
      category: currentCategory,
      subcategory: currentSubcategory,
      tags: autoTags,
      ...metadata
    };
    
    resources.push(resource);
  });
  
  return resources;
}

/**
 * Get default description based on the awesome list title
 */
function getDefaultDescription(title: string): string {
  const cleanTitle = title.toLowerCase();
  
  if (cleanTitle.includes('go')) {
    return 'A curated list of awesome Go frameworks, libraries and software';
  } else if (cleanTitle.includes('python')) {
    return 'A curated list of awesome Python frameworks, libraries and software';
  } else if (cleanTitle.includes('javascript') || cleanTitle.includes('js')) {
    return 'A curated list of awesome JavaScript frameworks, libraries and software';
  } else if (cleanTitle.includes('react')) {
    return 'A curated list of awesome React frameworks, libraries and software';
  } else if (cleanTitle.includes('vue')) {
    return 'A curated list of awesome Vue.js frameworks, libraries and software';
  } else if (cleanTitle.includes('node')) {
    return 'A curated list of awesome Node.js frameworks, libraries and software';
  } else {
    const topic = title.replace(/^awesome\s*/i, '').trim();
    return `A curated list of awesome ${topic} frameworks, libraries and software`;
  }
}

/**
 * Extract plain text from markdown node
 */
function extractTextFromNode(node: any): string {
  let text = '';
  
  visit(node, (child: any) => {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'inlineCode') {
      text += '`' + child.value + '`';
    }
  });
  
  return text;
}

/**
 * Parse markdown content into structured data
 */
async function parseMarkdown(content: string, repoUrl: string): Promise<AwesomeListData> {
  const tree = remark().parse(content);
  const resources: Resource[] = [];
  
  let currentCategory = '';
  let currentSubcategory = '';
  
  // Extract title and description from the top of the document
  let title = 'Awesome List';
  let description = '';
  
  // Find the first h1 heading that contains "Awesome"
  let titleFound = false;
  visit(tree, 'heading', (node: any) => {
    if (node.depth === 1 && !titleFound) {
      const headingText = extractTextFromNode(node);
      if (headingText.toLowerCase().includes('awesome')) {
        title = headingText;
        titleFound = true;
      }
    }
  });
  
  // Extract description from the first meaningful paragraph after title
  let foundDescription = false;
  visit(tree, 'paragraph', (node: any) => {
    if (!foundDescription && !description) {
      const text = extractTextFromNode(node);
      // Skip badges, build status, and other metadata
      if (text && 
          !text.includes('badge') && 
          !text.includes('build') && 
          !text.includes('Build Status') &&
          !text.includes('Awesome') &&
          !text.includes('Slack') &&
          !text.includes('Netlify') &&
          !text.includes('Track Awesome') &&
          !text.includes('Last Commit') &&
          text.length > 20) {
        description = cleanText(text);
        foundDescription = true;
      }
    }
  });
  
  // Track if we're inside the main content area (after Contents)
  let insideMainContent = false;
  let skipContentsSection = true;
  
  // Process each section
  visit(tree, (node: any) => {
    if (node.type === 'heading') {
      const headingText = extractTextFromNode(node);
      
      // Skip certain sections entirely
      if (headingText.toLowerCase().includes('contributing') ||
          headingText.toLowerCase().includes('license') ||
          headingText.toLowerCase().includes('external') ||
          headingText.toLowerCase().includes('anti-features') ||
          headingText.toLowerCase().includes('credits')) {
        currentCategory = '';
        currentSubcategory = '';
        return;
      }
      
      // Handle Contents section specially - this marks the start of categories
      if (headingText.toLowerCase().includes('contents')) {
        insideMainContent = true;
        skipContentsSection = true;
        currentCategory = '';
        currentSubcategory = '';
        return;
      }
      
      // Skip the Contents section itself but process everything after it
      if (skipContentsSection && headingText.toLowerCase().includes('contents')) {
        return;
      }
      
      if (node.depth === 2 && insideMainContent) {
        // Main category (## Category) - these are the real categories
        currentCategory = headingText;
        currentSubcategory = '';
        skipContentsSection = false;
      } else if (node.depth === 3 && currentCategory) {
        // Subcategory (### Subcategory)
        currentSubcategory = headingText;
      }
    } else if (node.type === 'list' && currentCategory && !skipContentsSection) {
      // Parse resources from this list
      const sectionResources = parseListItems(node, currentCategory, currentSubcategory);
      resources.push(...sectionResources);
    }
  });
  
  const data: AwesomeListData = {
    title: cleanText(title),
    description: description || getDefaultDescription(title),
    repoUrl,
    resources: resources.filter(r => r.title && r.url && !r.url.startsWith('#'))
  };
  
  log(`Parsed ${data.resources.length} resources from ${repoUrl}`);
  log(`Title extracted: "${data.title}"`);
  log(`Description extracted: "${data.description}"`);
  return data;
}

/**
 * Fetch and parse awesome list from GitHub
 */
export async function fetchAwesomeList(rawUrl: string): Promise<AwesomeListData> {
  try {
    log(`Fetching awesome list from: ${rawUrl}`);
    
    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Extract repo URL from raw URL
    const repoUrl = rawUrl
      .replace('raw.githubusercontent.com', 'github.com')
      .replace(/\/[^\/]+\/README\.md$/, '');
    
    const data = await parseMarkdown(content, repoUrl);
    log(`Successfully parsed ${data.resources.length} resources`);
    
    return data;
  } catch (error: any) {
    log(`Error fetching awesome list: ${error.message}`);
    throw error;
  }
}