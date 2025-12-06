import { Resource } from "@shared/schema";
import yaml from "js-yaml";

/**
 * Parser for awesome list README files
 * Supports various awesome list formats and extracts resources in a structured format
 */

interface ParsedResource {
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  subSubcategory?: string;
}

interface ParsedAwesomeList {
  title: string;
  description: string;
  badges: string[];
  resources: ParsedResource[];
  metadata: {
    license?: string;
    contributors?: string[];
    lastUpdated?: string;
  };
}

export class AwesomeListParser {
  private content: string;
  private lines: string[];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split('\n');
  }

  /**
   * Parse the awesome list README content
   */
  parse(): ParsedAwesomeList {
    const result: ParsedAwesomeList = {
      title: this.extractTitle(),
      description: this.extractDescription(),
      badges: this.extractBadges(),
      resources: [],
      metadata: this.extractMetadata()
    };

    // Parse resources with their categories
    result.resources = this.extractResources();

    return result;
  }

  /**
   * Extract the main title from the README
   */
  private extractTitle(): string {
    const titleLine = this.lines.find(line => line.startsWith('# '));
    if (titleLine) {
      return titleLine.replace(/^# /, '').replace(/^Awesome /, '').trim();
    }
    return 'Untitled List';
  }

  /**
   * Extract the description (usually the first paragraph after title)
   */
  private extractDescription(): string {
    let inDescription = false;
    let description = '';
    
    for (const line of this.lines) {
      if (line.startsWith('# ')) {
        inDescription = true;
        continue;
      }
      
      if (inDescription) {
        if (line.startsWith('##') || line.startsWith('---') || line.includes('badge')) {
          break;
        }
        if (line.trim()) {
          description += line + ' ';
        }
      }
    }
    
    return description.trim();
  }

  /**
   * Extract badges (awesome badge, CI badges, etc.)
   */
  private extractBadges(): string[] {
    const badges: string[] = [];
    const badgeRegex = /\[!\[([^\]]+)\]\(([^)]+)\)\]\(([^)]+)\)/g;
    
    for (const line of this.lines.slice(0, 10)) { // Check first 10 lines for badges
      let match;
      while ((match = badgeRegex.exec(line)) !== null) {
        badges.push(match[0]);
      }
    }
    
    return badges;
  }

  /**
   * Extract resources with their category hierarchy
   */
  private extractResources(): ParsedResource[] {
    const resources: ParsedResource[] = [];
    let currentCategory = '';
    let currentSubcategory = '';
    let currentSubSubcategory = '';
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      // Skip table of contents and metadata sections
      if (this.isTableOfContents(line) || this.isMetadataSection(line)) {
        continue;
      }
      
      // Handle category headers
      if (line.startsWith('## ')) {
        currentCategory = line.replace(/^## /, '').trim();
        currentSubcategory = '';
        currentSubSubcategory = '';
        continue;
      }
      
      if (line.startsWith('### ')) {
        currentSubcategory = line.replace(/^### /, '').trim();
        currentSubSubcategory = '';
        continue;
      }
      
      if (line.startsWith('#### ')) {
        currentSubSubcategory = line.replace(/^#### /, '').trim();
        continue;
      }
      
      // Parse resource lines
      const resource = this.parseResourceLine(line);
      if (resource && currentCategory) {
        resources.push({
          ...resource,
          category: currentCategory,
          subcategory: currentSubcategory || undefined,
          subSubcategory: currentSubSubcategory || undefined
        });
      }
    }
    
    return resources;
  }

  /**
   * Parse a single resource line
   * Supports formats:
   * - [Name](url) - Description
   * - [Name](url) – Description  
   * - [Name](url): Description
   * - * [Name](url) - Description (with bullet)
   */
  private parseResourceLine(line: string): { title: string; url: string; description: string } | null {
    // Remove leading bullet points and whitespace
    const cleanLine = line.replace(/^[\s*-]+/, '').trim();
    
    // Match [title](url) followed by separator and description
    const resourceRegex = /^\[([^\]]+)\]\(([^)]+)\)\s*[-–:]\s*(.+)$/;
    const match = cleanLine.match(resourceRegex);
    
    if (match) {
      return {
        title: match[1].trim(),
        url: match[2].trim(),
        description: match[3].trim()
      };
    }
    
    // Try without description
    const simpleRegex = /^\[([^\]]+)\]\(([^)]+)\)$/;
    const simpleMatch = cleanLine.match(simpleRegex);
    
    if (simpleMatch) {
      return {
        title: simpleMatch[1].trim(),
        url: simpleMatch[2].trim(),
        description: ''
      };
    }
    
    return null;
  }

  /**
   * Check if a line is part of table of contents
   */
  private isTableOfContents(line: string): boolean {
    const tocIndicators = ['Table of Contents', 'Contents', '- ['];
    return tocIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Check if a line is part of metadata sections
   */
  private isMetadataSection(line: string): boolean {
    const metadataSections = [
      'License', 'Contributing', 'Contributors', 'Code of Conduct',
      'Registries', 'Resources', 'Table of Contents', 'Contents'
    ];
    return metadataSections.some(section =>
      line.toLowerCase().includes(section.toLowerCase())
    );
  }

  /**
   * Extract metadata from the README
   */
  private extractMetadata(): ParsedAwesomeList['metadata'] {
    const metadata: ParsedAwesomeList['metadata'] = {};
    
    // Find license section
    const licenseIndex = this.lines.findIndex(line => 
      line.toLowerCase().includes('license')
    );
    
    if (licenseIndex !== -1) {
      // Look for CC0 or other license mentions
      const licenseText = this.lines.slice(licenseIndex, licenseIndex + 5).join(' ');
      if (licenseText.toLowerCase().includes('cc0') || licenseText.toLowerCase().includes('creative commons')) {
        metadata.license = 'CC0';
      } else if (licenseText.toLowerCase().includes('mit')) {
        metadata.license = 'MIT';
      }
    }
    
    return metadata;
  }

  /**
   * Extract hierarchy structure from markdown headers
   * Returns categories, subcategories with parent mapping, and sub-subcategories with parent mapping
   */
  extractHierarchy(): {
    categories: Set<string>;
    subcategories: Map<string, string>; // subcategory name → parent category name
    subSubcategories: Map<string, { parent: string; category: string }>; // sub-subcategory name → {parent subcategory, grandparent category}
  } {
    const categories = new Set<string>();
    const subcategories = new Map<string, string>();
    const subSubcategories = new Map<string, { parent: string; category: string }>();

    let currentCategory = '';
    let currentSubcategory = '';

    for (const line of this.lines) {
      // Skip metadata sections
      if (this.isMetadataSection(line) || this.isTableOfContents(line)) {
        continue;
      }

      // Track category hierarchy from markdown headers
      if (line.startsWith('## ') && !line.includes('Contents')) {
        currentCategory = line.replace(/^## /, '').trim();
        categories.add(currentCategory);
        currentSubcategory = '';
      } else if (line.startsWith('### ')) {
        currentSubcategory = line.replace(/^### /, '').trim();
        if (currentCategory) {
          subcategories.set(currentSubcategory, currentCategory);
        }
      } else if (line.startsWith('#### ')) {
        const subSubcategory = line.replace(/^#### /, '').trim();
        if (currentCategory && currentSubcategory) {
          subSubcategories.set(subSubcategory, {
            parent: currentSubcategory,
            category: currentCategory
          });
        }
      }
    }

    return { categories, subcategories, subSubcategories };
  }

  /**
   * Parse YAML front matter if present
   */
  private parseFrontMatter(): Record<string, any> | null {
    if (!this.content.startsWith('---')) {
      return null;
    }
    
    const endIndex = this.content.indexOf('\n---', 3);
    if (endIndex === -1) {
      return null;
    }
    
    try {
      const frontMatter = this.content.substring(3, endIndex);
      return yaml.load(frontMatter) as Record<string, any>;
    } catch (error) {
      console.error('Error parsing front matter:', error);
      return null;
    }
  }
}

/**
 * Parse an awesome list from a URL or file content
 */
export async function parseAwesomeList(content: string): Promise<ParsedAwesomeList> {
  const parser = new AwesomeListParser(content);
  return parser.parse();
}

/**
 * Convert parsed resources to database format
 */
export function convertToDbResources(parsed: ParsedAwesomeList): Partial<Resource>[] {
  return parsed.resources.map(resource => ({
    title: resource.title,
    url: resource.url,
    description: resource.description || '',
    category: normalizeCategory(resource.category),
    subcategory: resource.subcategory ? normalizeCategory(resource.subcategory) : undefined,
    subSubcategory: resource.subSubcategory ? normalizeCategory(resource.subSubcategory) : undefined,
    status: 'approved',
    githubSynced: true,
    metadata: {
      sourceList: parsed.title,
      importedAt: new Date().toISOString()
    }
  }));
}

/**
 * Normalize category names for consistency
 */
function normalizeCategory(category: string): string {
  return category
    .replace(/[^a-zA-Z0-9\s&-]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}