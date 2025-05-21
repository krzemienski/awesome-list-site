import fetch from "node-fetch";
import * as remark from "remark";
import { visit } from "unist-util-visit";
import * as z from "zod";
import { nanoid } from "nanoid";
import { createLogger } from "vite";
import path from "path";
import fs from "fs";

// Define types
interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
}

interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
}

// Set up logging
const logger = createLogger();
const logFilePath = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(logFilePath)) {
  fs.mkdirSync(logFilePath, { recursive: true });
}

const logFile = path.resolve(
  logFilePath, 
  `build-${new Date().toISOString().split('T')[0]}.log`
);

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  
  logger.info(logMessage);
  
  // Append to log file
  fs.appendFileSync(logFile, logMessage + "\n");
}

// Resource schema
const resourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  description: z.string().optional().default(""),
  category: z.string(),
  subcategory: z.string().optional(),
});

/**
 * Extract GitHub repo info from URL
 */
function extractRepoInfo(url: string) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'github.com') {
      const parts = urlObj.pathname.split('/');
      if (parts.length >= 3) {
        return {
          owner: parts[1],
          repo: parts[2],
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Remove badges from markdown content
 */
function removeBadges() {
  return (tree: any) => {
    visit(tree, 'paragraph', (node: any) => {
      // Check if paragraph contains only images
      const hasBadges = node.children.every(
        (child: any) => child.type === 'image' || 
          (child.type === 'text' && child.value.trim() === '')
      );
      
      if (hasBadges) {
        node.children = [];
      }
    });
  };
}

/**
 * Parse list items into resources
 */
function parseListItems(tree: any, currentCategory: string, currentSubcategory?: string) {
  const resources: Resource[] = [];
  
  visit(tree, 'listItem', (node: any) => {
    try {
      const paragraphs = node.children.filter((n: any) => n.type === 'paragraph');
      
      if (paragraphs.length === 0) return;
      
      const firstParagraph = paragraphs[0];
      const link = firstParagraph.children.find((n: any) => n.type === 'link');
      
      if (!link) return;
      
      // Extract title and URL
      const title = link.children[0]?.value || "";
      const url = link.url || "";
      
      if (!title || !url) return;
      
      // Extract description (text after the link)
      let description = "";
      let foundLink = false;
      
      for (const child of firstParagraph.children) {
        if (foundLink) {
          if (child.type === 'text') {
            description += child.value;
          }
        }
        
        if (child === link) {
          foundLink = true;
        }
      }
      
      // Clean up description
      description = description.replace(/^(\s*[-–—]\s*)/, "").trim();
      
      // Create resource
      const resource: Resource = {
        id: nanoid(),
        title,
        url,
        description,
        category: currentCategory,
      };
      
      if (currentSubcategory) {
        resource.subcategory = currentSubcategory;
      }
      
      // Validate resource
      try {
        resourceSchema.parse(resource);
        resources.push(resource);
      } catch (e) {
        log(`Invalid resource: ${JSON.stringify(resource)}`);
      }
    } catch (e) {
      log(`Error parsing list item: ${e}`);
    }
  });
  
  return resources;
}

/**
 * Parse markdown content into list data
 */
async function parseMarkdown(content: string, repoUrl: string): Promise<AwesomeListData> {
  log(`Parsing markdown content from ${repoUrl}`);
  
  // Initialize data
  const data: AwesomeListData = {
    title: "Awesome List",
    description: "",
    repoUrl,
    resources: [],
  };
  
  try {
    // Parse markdown
    const processor = remark.remark().use(removeBadges);
    const tree = processor.parse(content);
    
    // Extract title and description
    let titleFound = false;
    
    visit(tree, 'heading', (node: any) => {
      if (node.depth === 1 && !titleFound) {
        data.title = node.children[0]?.value || data.title;
        titleFound = true;
      } else if (node.depth === 2 && node.children[0]?.value === 'Contents') {
        // Skip contents section
        return;
      }
    });
    
    // Find first paragraph after title for description
    let foundTitle = false;
    visit(tree, 'paragraph', (node: any) => {
      if (foundTitle && !data.description) {
        const text = node.children
          .filter((n: any) => n.type === 'text')
          .map((n: any) => n.value)
          .join(' ');
        
        if (text) {
          data.description = text.trim();
        }
      }
      
      if (node.children[0]?.value === data.title) {
        foundTitle = true;
      }
    });
    
    // Extract resources by category and subcategory
    let currentCategory = "";
    let currentSubcategory: string | undefined = undefined;
    
    visit(tree, 'heading', (node: any, _: any, parent: any) => {
      const headingText = node.children[0]?.value || "";
      
      if (node.depth === 2) {
        // Skip certain sections
        if (['Contents', 'Contributing', 'License'].includes(headingText)) {
          return;
        }
        
        currentCategory = headingText;
        currentSubcategory = undefined;
        
        // Find the next list and parse resources
        const listIndex = parent.children.findIndex((n: any) => n === node);
        
        for (let i = listIndex + 1; i < parent.children.length; i++) {
          const child = parent.children[i];
          
          if (child.type === 'heading' && child.depth <= 2) {
            break;
          }
          
          if (child.type === 'list') {
            const resources = parseListItems(child, currentCategory);
            data.resources.push(...resources);
          }
        }
      } else if (node.depth === 3 && currentCategory) {
        currentSubcategory = headingText;
        
        // Find the next list and parse resources
        const listIndex = parent.children.findIndex((n: any) => n === node);
        
        for (let i = listIndex + 1; i < parent.children.length; i++) {
          const child = parent.children[i];
          
          if (child.type === 'heading') {
            break;
          }
          
          if (child.type === 'list') {
            const resources = parseListItems(child, currentCategory, currentSubcategory);
            data.resources.push(...resources);
          }
        }
      }
    });
    
    log(`Parsed ${data.resources.length} resources from ${repoUrl}`);
    return data;
  } catch (e) {
    log(`Error parsing markdown: ${e}`);
    throw new Error(`Failed to parse markdown content: ${e}`);
  }
}

/**
 * Fetch and parse awesome list from GitHub
 */
export async function fetchAwesomeList(rawUrl: string): Promise<AwesomeListData> {
  log(`Fetching awesome list from ${rawUrl}`);
  
  try {
    // Fetch markdown content
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch awesome list: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Parse repo URL from raw URL
    const repoInfo = extractRepoInfo(rawUrl);
    let repoUrl = rawUrl;
    
    if (repoInfo) {
      repoUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
    }
    
    // Parse markdown into list data
    return await parseMarkdown(content, repoUrl);
  } catch (e) {
    log(`Error fetching awesome list: ${e}`);
    throw new Error(`Failed to fetch awesome list: ${e}`);
  }
}
