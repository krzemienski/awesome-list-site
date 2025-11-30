import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import fetch, { Response as NodeFetchResponse } from 'node-fetch';

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

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`${timestamp} - ${prefix} ${message}`);
}

function logParsingStats(data: AwesomeListData, parseTime: number) {
  const stats = {
    totalResources: data.resources.length,
    categories: Array.from(new Set(data.resources.map(r => r.category))).length,
    tags: Array.from(new Set(data.resources.flatMap(r => r.tags || []))).length,
    githubRepos: data.resources.filter(r => r.url.includes('github.com')).length,
    gitlabRepos: data.resources.filter(r => r.url.includes('gitlab.com')).length,
    parseTime: parseTime.toFixed(2)
  };
  
  log(`Successfully parsed awesome list:`);
  log(`📄 Source: ${data.repoUrl}`);
  log(`📊 Found ${stats.totalResources} resources across ${stats.categories} categories`);
  log(`🏷️ Extracted ${stats.tags} unique tags`);
  log(`⏱️ Parsing completed in ${stats.parseTime}s`);
  log(`🔗 Repository detection: ${((stats.githubRepos / stats.totalResources) * 100).toFixed(1)}% GitHub, ${((stats.gitlabRepos / stats.totalResources) * 100).toFixed(1)}% GitLab`);
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
 * Generate simple URL-based tags only
 */
function generateUrlTags(url: string): string[] {
  const tags: string[] = [];
  
  // Only add URL-based tags for now
  if (url.includes('github.com')) {
    tags.push('GitHub');
  } else if (url.includes('gitlab.com')) {
    tags.push('GitLab');
  } else if (url.includes('bitbucket.org')) {
    tags.push('Bitbucket');
  }
  
  return tags;
}

/**
 * Extract existing tags from markdown text (preserve original list tags)
 */
function extractExistingTags(text: string): string[] {
  const tags: string[] = [];
  
  // Look for common tag patterns in markdown
  // This could be expanded based on how the original list formats tags
  
  return tags; // For now, return empty - we'll add AI-based tagging later
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
    
    // Generate simple URL-based tags only (GitHub, GitLab, etc.)
    const urlTags = generateUrlTags(url);
    
    // Add subcategory as a tag if it exists (this is what shows below resources)
    const subcategoryTags = currentSubcategory ? [currentSubcategory] : [];
    
    // Combine URL tags with subcategory tags
    const allTags = [...urlTags, ...subcategoryTags];
    
    const resource: Resource = {
      id: generateId(),
      title: cleanText(title),
      url,
      description,
      category: currentCategory,
      subcategory: currentSubcategory,
      tags: allTags,
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
 * Validate URL format and accessibility
 */
function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    if (!url.includes('raw.githubusercontent.com') && !url.includes('github.com') && !url.includes('gitlab.com')) {
      return {
        isValid: false,
        error: 'URL should be a raw GitHub/GitLab URL (e.g., https://raw.githubusercontent.com/user/repo/main/README.md)'
      };
    }
    
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      return {
        isValid: false,
        error: 'Please use the raw GitHub URL. Replace "github.com" with "raw.githubusercontent.com" and adjust the path.'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate markdown structure for awesome list compliance
 */
function validateMarkdownStructure(content: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isValid = true;
  
  const hasHeadings = /^#{2,3}\s+.+$/m.test(content);
  if (!hasHeadings) {
    warnings.push('No category headings found (## or ###)');
    isValid = false;
  }
  
  const hasListItems = /^- \[.+\]\(.+\)/m.test(content);
  if (!hasListItems) {
    warnings.push('No properly formatted resource links found');
    isValid = false;
  }
  
  if (content.length < 500) {
    warnings.push('Content seems unusually short for an awesome list');
  }
  
  const linkCount = (content.match(/- \[.+\]\(.+\)/g) || []).length;
  if (linkCount < 5) {
    warnings.push(`Only ${linkCount} resources found, expected more for a typical awesome list`);
  }
  
  return { isValid, warnings };
}

/**
 * Fetch and parse awesome list from GitHub with comprehensive error handling
 */
export async function fetchAwesomeList(rawUrl: string): Promise<AwesomeListData> {
  const startTime = Date.now();
  
  try {
    log(`Fetching awesome list from: ${rawUrl}`);
    
    // Validate URL format
    const urlValidation = validateUrl(rawUrl);
    if (!urlValidation.isValid) {
      log(`URL validation failed: ${urlValidation.error}`, 'error');
      throw new Error(`Invalid URL: ${urlValidation.error}`);
    }
    
    // Fetch with timeout and detailed error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response: NodeFetchResponse;
    try {
      response = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Awesome-List-Generator/1.0',
          'Accept': 'text/plain,text/markdown,text/*'
        }
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        log('Request timed out after 30 seconds', 'error');
        throw new Error('Request timeout: The awesome list URL took too long to respond');
      }
      log(`Network error: ${fetchError.message}`, 'error');
      throw new Error(`Network error: Unable to connect to ${rawUrl}. Please check the URL and try again.`);
    }
    
    // Handle HTTP errors with specific messages
    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        404: 'File not found. Please verify the repository exists and the file path is correct.',
        403: 'Access forbidden. The repository might be private or you may have hit rate limits.',
        429: 'Rate limit exceeded. Please try again later.',
        500: 'Server error on GitHub/GitLab. Please try again later.',
      };
      
      const errorMessage = errorMessages[response.status] || `HTTP ${response.status}: ${response.statusText}`;
      log(`HTTP error ${response.status}: ${errorMessage}`, 'error');
      throw new Error(`Failed to fetch awesome list: ${errorMessage}`);
    }
    
    const content = await response.text();
    
    if (!content || content.trim().length === 0) {
      log('Empty content received from URL', 'error');
      throw new Error('Empty file: The awesome list file appears to be empty');
    }
    
    log(`Content fetched successfully (${content.length} characters)`);
    
    // Validate markdown structure
    const structureValidation = validateMarkdownStructure(content);
    if (!structureValidation.isValid) {
      log('Markdown structure validation failed:', 'error');
      structureValidation.warnings.forEach(warning => log(`  - ${warning}`, 'error'));
      throw new Error(`Invalid awesome list format: ${structureValidation.warnings.join(', ')}`);
    }
    
    if (structureValidation.warnings.length > 0) {
      structureValidation.warnings.forEach(warning => log(`Warning: ${warning}`, 'warn'));
    }
    
    // Extract repo URL from raw URL
    const repoUrl = rawUrl
      .replace('raw.githubusercontent.com', 'github.com')
      .replace(/\/[^\/]+\/README\.md$/, '');
    
    const data = await parseMarkdown(content, repoUrl);
    
    if (data.resources.length === 0) {
      log('No resources were extracted from the markdown', 'error');
      throw new Error('Parsing failed: No valid resources found in the awesome list. Please check the markdown format.');
    }
    
    const parseTime = (Date.now() - startTime) / 1000;
    logParsingStats(data, parseTime);
    
    return data;
    
  } catch (error: any) {
    const parseTime = (Date.now() - startTime) / 1000;
    log(`Parsing failed after ${parseTime.toFixed(2)}s: ${error.message}`, 'error');
    
    log('Debugging information:', 'info');
    log(`  - URL: ${rawUrl}`, 'info');
    log(`  - Error type: ${error.constructor.name}`, 'info');
    log(`  - Time elapsed: ${parseTime.toFixed(2)}s`, 'info');
    
    throw error;
  }
}