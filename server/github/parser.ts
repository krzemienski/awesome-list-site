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
   * Note: AI-assisted parsing is available but not enabled by default
   * Set enableAI=true in parse() to use Claude for edge cases
   */
  private async extractResourcesWithAI(enableAI: boolean = false): Promise<ParsedResource[]> {
    const resources: ParsedResource[] = [];
    let currentCategory = '';
    let currentSubcategory = '';
    let currentSubSubcategory = '';
    const failedLines: Array<{ line: string; lineNumber: number }> = [];

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

      // Parse resource lines with standard regex
      const resource = this.parseResourceLine(line);
      if (resource && currentCategory) {
        resources.push({
          ...resource,
          category: currentCategory,
          subcategory: currentSubcategory || undefined,
          subSubcategory: currentSubSubcategory || undefined
        });
      } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        // Line looks like a resource but failed parsing
        // Save for potential AI processing
        if (enableAI) {
          failedLines.push({ line, lineNumber: i + 1 });
        }
      }
    }

    // If AI parsing is enabled and there are failed lines, try AI
    if (enableAI && failedLines.length > 0) {
      console.log(`🤖 AI parsing ${failedLines.length} ambiguous lines...`);

      // Dynamically import AI assistant (only if needed)
      const { parseAmbiguousResource } = await import('../ai/parsingAssistant');

      for (const { line, lineNumber } of failedLines) {
        try {
          const aiResult = await parseAmbiguousResource(line, {
            previousCategory: currentCategory,
            previousSubcategory: currentSubcategory,
            lineNumber
          });

          if (aiResult && !aiResult.skip) {
            resources.push({
              title: aiResult.title,
              url: aiResult.url,
              description: aiResult.description || '',
              category: aiResult.category || currentCategory,
              subcategory: aiResult.subcategory || currentSubcategory,
              subSubcategory: currentSubSubcategory || undefined
            });
            console.log(`  ✅ AI recovered: "${aiResult.title}"`);
          }
        } catch (error) {
          console.error(`  ❌ AI failed for line ${lineNumber}`);
        }
      }
    }

    return resources;
  }

  /**
   * Extract resources with their category hierarchy (synchronous version)
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
   * Detect format deviations from standard awesome list specification
   * Returns warnings and suggestions for user review
   */
  detectFormatDeviations(): {
    deviations: string[];
    warnings: string[];
    canProceed: boolean;
  } {
    const deviations: string[] = [];
    const warnings: string[] = [];

    // Check: Standard awesome badge
    const hasBadge = this.content.includes('[![Awesome](https://awesome.re/badge') ||
                     this.content.includes('[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome');
    if (!hasBadge) {
      warnings.push('Missing standard awesome badge (non-critical)');
    }

    // Check: Resource list marker consistency
    const dashResources = (this.content.match(/^- \[/gm) || []).length;
    const asteriskResources = (this.content.match(/^\* \[/gm) || []).length;
    const totalResources = dashResources + asteriskResources;

    if (asteriskResources > dashResources && dashResources > 0) {
      deviations.push(`Mixed list markers: ${asteriskResources} asterisk (*) vs ${dashResources} dash (-) resources`);
    } else if (dashResources > asteriskResources * 2) {
      warnings.push(`Using dashes (-) for list items (common variation from standard asterisk format)`);
    }

    // Check: Description presence
    const resourcesWithDesc = (this.content.match(/^\* \[[^\]]+\]\([^)]+\)\s*[-–:]\s*.+$/gm) || []).length +
                               (this.content.match(/^- \[[^\]]+\]\([^)]+\)\s*[-–:]\s*.+$/gm) || []).length;
    const resourcesWithoutDesc = totalResources - resourcesWithDesc;

    if (resourcesWithoutDesc > totalResources * 0.2) {
      warnings.push(`${resourcesWithoutDesc} resources (${Math.round(resourcesWithoutDesc/totalResources*100)}%) lack descriptions`);
    }

    // Check: Heading depth (2-level vs 3-level hierarchy)
    const level2Headers = (this.content.match(/^## /gm) || []).length;
    const level3Headers = (this.content.match(/^### /gm) || []).length;
    const level4Headers = (this.content.match(/^#### /gm) || []).length;

    if (level4Headers === 0 && level3Headers > 0 && level2Headers > 0) {
      warnings.push('Uses 2-level hierarchy (## → ###) instead of 3-level (## → ### → ####)');
    } else if (level4Headers > 0) {
      warnings.push(`Contains ${level4Headers} sub-subcategories (####) - 3-level hierarchy detected`);
    }

    // Check: Metadata sections as categories (known issue)
    const hasRegistries = this.content.includes('## Registries');
    const hasResources = this.content.includes('## Resources');
    if (hasRegistries || hasResources) {
      deviations.push('Contains metadata sections as category headers (Registries, Resources) - will be filtered');
    }

    // Check: Badges in content
    const badgeCount = (this.content.match(/\[!\[[^\]]+\]\([^)]+\)\]\([^)]+\)/g) || []).length;
    if (badgeCount > totalResources * 0.5) {
      warnings.push(`${badgeCount} badges detected in content (will be preserved in descriptions)`);
    }

    // Determine if import can proceed safely
    const canProceed = deviations.length <= 3; // Too many deviations = manual review

    return { deviations, warnings, canProceed };
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