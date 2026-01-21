import { Resource } from "@shared/schema";

/**
 * Formatter for generating awesome-lint compliant README files
 * Follows the awesome list specification: https://github.com/sindresorhus/awesome-list-guidelines
 */

interface FormatterOptions {
  title: string;
  description?: string;
  includeContributing?: boolean;
  includeLicense?: boolean;
  websiteUrl?: string;
  repoUrl?: string;
}

interface CategoryGroup {
  category: string;
  subcategories: Map<string, SubcategoryGroup>;
  directResources: Resource[];
}

interface SubcategoryGroup {
  subcategory: string;
  subSubcategories: Map<string, Resource[]>;
  directResources: Resource[];
}

export class AwesomeListFormatter {
  private resources: Resource[];
  private options: FormatterOptions;

  constructor(resources: Resource[], options: FormatterOptions) {
    this.resources = resources;
    this.options = options;
  }

  /**
   * Generate the complete awesome-lint compliant README
   */
  generate(): string {
    const sections: string[] = [];

    // Add header
    sections.push(this.generateHeader());

    // Add table of contents
    const categoryGroups = this.groupResourcesByCategory();
    if (categoryGroups.size > 0) { // Always add TOC for consistency
      sections.push(this.generateTableOfContents(categoryGroups));
    }

    // Add resources by category
    sections.push(this.generateResourceSections(categoryGroups));

    // Add contributing section (references CONTRIBUTING.md file)
    if (this.options.includeContributing) {
      sections.push(this.generateContributingSection());
    }

    // NOTE: Do NOT add license section - awesome-lint forbids inline license sections
    // License should be in a separate LICENSE file in the repo

    // Ensure file ends with a single newline (awesome-lint requirement)
    // Post-process to collapse any consecutive blank lines (3+ newlines to 2)
    return sections
      .filter(s => s.trim())
      .join('\n\n')
      .replace(/\n\n\n+/g, '\n\n') // Collapse 3+ newlines to 2
      + '\n';
  }

  /**
   * Generate the header with title, badges, and description
   */
  private generateHeader(): string {
    const lines: string[] = [];

    // Title with Awesome prefix (awesome-lint requires "Awesome" prefix)
    // Badge must be NEXT TO the main heading on the same line
    const title = this.options.title.startsWith('Awesome') 
      ? this.options.title 
      : `Awesome ${this.options.title}`;
    lines.push(`# ${title} [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)`);
    
    // Add additional badges on next line
    if (this.options.repoUrl) {
      const repoPath = this.extractRepoPath(this.options.repoUrl);
      if (repoPath) {
        lines.push('');
        lines.push(`[![GitHub stars](https://img.shields.io/github/stars/${repoPath})](${this.options.repoUrl}) [![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](http://creativecommons.org/publicdomain/zero/1.0/)`);
      }
    }

    // Add description
    if (this.options.description) {
      // Ensure description starts with capital letter
      let description = this.options.description.trim();
      if (description && description[0] !== description[0].toUpperCase()) {
        description = description[0].toUpperCase() + description.slice(1);
      }
      lines.push('');
      lines.push(`> ${description}`);
    }

    // Add website link if available
    if (this.options.websiteUrl) {
      lines.push('');
      lines.push(`**[View on Website](${this.options.websiteUrl})** - Submit new resources and browse the curated collection with advanced filtering.`);
    }

    return lines.join('\n');
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(categoryGroups: Map<string, CategoryGroup>): string {
    const lines: string[] = [];
    lines.push('## Contents');
    lines.push('');

    for (const [category, group] of Array.from(categoryGroups)) {
      const anchor = this.toAnchor(category);
      lines.push(`- [${category}](#${anchor})`);

      // Add subcategories if they exist
      if (group.subcategories.size > 0) {
        for (const [subcategory] of Array.from(group.subcategories)) {
          const subAnchor = this.toAnchor(subcategory);
          lines.push(`  - [${subcategory}](#${subAnchor})`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate resource sections grouped by category
   */
  private generateResourceSections(categoryGroups: Map<string, CategoryGroup>): string {
    const sections: string[] = [];

    for (const [category, group] of Array.from(categoryGroups)) {
      // Category header
      sections.push(`## ${category}`);
      sections.push('');

      // Add resources directly under the category
      if (group.directResources.length > 0) {
        sections.push(this.formatResourceList(group.directResources));
        sections.push('');
      }

      // Add subcategories
      for (const [subcategory, subgroup] of Array.from(group.subcategories)) {
        // Apply proper capitalization to subcategory heading (e.g., FFMPEG → FFmpeg)
        const formattedSubcategory = this.ensureProperCapitalization(subcategory);
        sections.push(`### ${formattedSubcategory}`);
        sections.push('');

        // Add resources directly under the subcategory
        if (subgroup.directResources.length > 0) {
          sections.push(this.formatResourceList(subgroup.directResources));
          sections.push('');
        }

        // Add sub-subcategories
        for (const [subSubcategory, resources] of Array.from(subgroup.subSubcategories)) {
          // Apply proper capitalization to sub-subcategory heading
          const formattedSubSubcategory = this.ensureProperCapitalization(subSubcategory);
          sections.push(`#### ${formattedSubSubcategory}`);
          sections.push('');
          sections.push(this.formatResourceList(resources));
          sections.push('');
        }
      }
    }

    return sections.join('\n').trim();
  }

  /**
   * Format a list of resources following awesome list conventions
   */
  private formatResourceList(resources: Resource[]): string {
    return resources
      .sort((a, b) => a.title.localeCompare(b.title)) // Alphabetical sorting
      .map(resource => this.formatResource(resource))
      .join('\n');
  }

  /**
   * Format a single resource
   * Format: - [Name](url) - Description.
   */
  private formatResource(resource: Resource): string {
    // Replace brackets in title with parentheses to avoid breaking markdown link syntax
    // Titles with brackets break the [title](url) pattern in awesome-lint validator
    let title = resource.title.replace(/\[/g, '(').replace(/\]/g, ')');
    
    // Trim title to remove any inner padding spaces (awesome-lint: no-inline-padding)
    title = title.trim();
    
    // Ensure proper capitalization in title
    title = this.ensureProperCapitalization(title);
    
    // Remove trailing slashes from URLs (awesome-lint requirement)
    let url = resource.url.trim();
    if (url.endsWith('/') && url !== '/') {
      url = url.slice(0, -1);
    }
    
    // Escape parentheses in URLs to avoid breaking markdown link syntax
    // URLs with unescaped parentheses break markdown parsing
    url = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
    
    let line = `- [${title}](${url})`;
    
    if (resource.description && resource.description.trim()) {
      let description = resource.description.trim();
      
      // Remove raw HTML/shortcodes from descriptions (e.g., [vc_row...])
      // These break markdown parsing and are not useful in README
      description = description.replace(/\[vc_[^\]]+\]/g, '');
      description = description.replace(/\[\/vc_[^\]]+\]/g, '');
      description = description.trim();
      
      // Apply proper capitalizations FIRST so title and description have same transformations
      // This ensures "Wasm" → "WebAssembly" in both title and description before comparison
      description = this.ensureProperCapitalization(description);
      
      // awesome-lint: no-repeat-item-in-description
      // Description should not start with the item name
      description = this.removeItemNameFromStart(description, title);
      
      // Replace remaining brackets in description with parentheses
      description = description.replace(/\[/g, '(').replace(/\]/g, ')');
      
      // Sanitize punctuation issues (awesome-lint requirements)
      description = this.sanitizePunctuation(description);
      
      // Ensure description starts with capital letter
      // BUT preserve intentionally lowercase terms (macOS, npm, webpack, etc.)
      const lowercaseStarters = ['macos', 'npm', 'webpack', 'ios', 'ipod', 'ipad', 'iphone', 'ebook'];
      const startsWithLowercaseTerm = lowercaseStarters.some(term => 
        description.toLowerCase().startsWith(term)
      );
      // Handle first word containing underscore (tool names like "pmd_tool")
      const firstWord = description.split(/\s/)[0] || '';
      const firstWordHasUnderscore = firstWord.includes('_');
      
      if (firstWordHasUnderscore && description[0] !== description[0].toUpperCase()) {
        // Prepend "A tool that" when description starts with underscore-containing lowercase term
        // This satisfies awesome-lint's "valid casing" requirement
        const connector = firstWord.toLowerCase().endsWith('is') ? '' : 'A ';
        if (connector) {
          description = connector + description;
        }
      } else if (description && description[0] !== description[0].toUpperCase() && !startsWithLowercaseTerm) {
        description = description[0].toUpperCase() + description.slice(1);
      }
      
      // Ensure description ends with a period
      if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
        description += '.';
      }
      
      // awesome-lint: awesome-list-item - description must be non-empty
      // Skip descriptions that are just punctuation or whitespace
      const substantiveContent = description.replace(/[.!?'"(),-\s]/g, '').trim();
      if (substantiveContent.length > 0) {
        line += ` - ${description}`;
      }
    }
    
    return line;
  }
  
  /**
   * Sanitize punctuation to comply with awesome-lint
   * - Fix unmatched quotes (convert curly quotes to straight, remove unmatched)
   * - Remove repeated periods
   * - Fix other punctuation issues
   */
  private sanitizePunctuation(text: string): string {
    let result = text;
    
    // Convert curly/smart quotes to straight quotes (using Unicode escape sequences for reliability)
    // Single quotes: ' ' ‹ › ‚ (U+2018, U+2019, U+2039, U+203A, U+201A)
    result = result.replace(/[\u2018\u2019\u2039\u203A\u201A]/g, "'");
    // Double quotes: " " « » „ (U+201C, U+201D, U+00AB, U+00BB, U+201E)
    result = result.replace(/[\u201C\u201D\u00AB\u00BB\u201E]/g, '"');
    
    // Remove other problematic Unicode characters
    result = result.replace(/\u2026/g, '...');  // Ellipsis (U+2026)
    result = result.replace(/[\u2013\u2014]/g, '-');  // En-dash, em-dash (U+2013, U+2014)
    
    // Remove repeated periods (awesome-lint: no-repeat-punctuation)
    result = result.replace(/\.{2,}/g, '.');
    
    // Remove repeated commas
    result = result.replace(/,{2,}/g, ',');
    
    // Fix unmatched single quotes - count and balance
    const singleQuoteCount = (result.match(/'/g) || []).length;
    if (singleQuoteCount % 2 !== 0) {
      // Unmatched quote - try to remove the odd one out
      // Strategy: just remove all single quotes if unbalanced (safer approach)
      result = result.replace(/'/g, '');
    }
    
    // Fix unmatched double quotes
    const doubleQuoteCount = (result.match(/"/g) || []).length;
    if (doubleQuoteCount % 2 !== 0) {
      // Remove trailing unmatched quote
      result = result.replace(/"([^"]*$)/, '$1');
    }
    
    // Remove trailing punctuation repetition before final period
    result = result.replace(/([.!?,;:])\s*\.$/, '.');
    
    return result;
  }
  
  /**
   * Remove item name from the start of description
   * awesome-lint: no-repeat-item-in-description
   * "VidCon is a conference" -> "A conference" (when title is "VidCon")
   */
  private removeItemNameFromStart(description: string, title: string): string {
    if (!description || !title) return description;
    
    // Normalize both for comparison
    const descLower = description.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Check if description starts with the title (case-insensitive)
    if (descLower.startsWith(titleLower)) {
      let rest = description.slice(title.length).trimStart();
      // Remove common connecting words
      const connectors = ['is', 'are', 'was', 'were', 'provides', 'offers', "'s", "'s"];
      for (const connector of connectors) {
        if (rest.toLowerCase().startsWith(connector + ' ')) {
          rest = rest.slice(connector.length).trimStart();
          break;
        } else if (rest.toLowerCase().startsWith(connector + '.')) {
          rest = rest.slice(connector.length).trimStart();
          break;
        }
      }
      // Capitalize first letter of remaining description
      if (rest.length > 0) {
        rest = rest[0].toUpperCase() + rest.slice(1);
      }
      return rest || description;
    }
    
    // Also check for "The [title]" pattern
    if (descLower.startsWith('the ' + titleLower)) {
      let rest = description.slice(4 + title.length).trimStart();
      const connectors = ['is', 'are', 'was', 'were', 'provides', 'offers'];
      for (const connector of connectors) {
        if (rest.toLowerCase().startsWith(connector + ' ')) {
          rest = rest.slice(connector.length).trimStart();
          break;
        }
      }
      if (rest.length > 0) {
        rest = rest[0].toUpperCase() + rest.slice(1);
      }
      return rest || description;
    }
    
    return description;
  }
  
  /**
   * Ensure proper capitalization for common terms (awesome-lint requirement)
   */
  private ensureProperCapitalization(text: string): string {
    const replacements: { [key: string]: string } = {
      'nodejs': 'Node.js',
      'node.js': 'Node.js',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'mongodb': 'MongoDB',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'graphql': 'GraphQL',
      'api': 'API',
      'rest': 'REST',
      'json': 'JSON',
      'xml': 'XML',
      'html': 'HTML',
      'css': 'CSS',
      'svg': 'SVG',
      'http': 'HTTP',
      'https': 'HTTPS',
      'tcp': 'TCP',
      'udp': 'UDP',
      'ios': 'iOS',
      'macos': 'macOS',
      'ipv4': 'IPv4',
      'ipv6': 'IPv6',
      // Common spelling issues from awesome-lint
      'stackoverflow': 'Stack Overflow',
      'Stackoverflow': 'Stack Overflow',
      'StackOverflow': 'Stack Overflow',
      'youtube': 'YouTube',
      'Youtube': 'YouTube',
      'linkedin': 'LinkedIn',
      'Linkedin': 'LinkedIn',
      'devops': 'DevOps',
      'Devops': 'DevOps',
      'oauth': 'OAuth',
      'Oauth': 'OAuth',
      'webpack': 'webpack',
      'npm': 'npm',
      'ffmpeg': 'FFmpeg',
      'Ffmpeg': 'FFmpeg',
      'tensorflow': 'TensorFlow',
      'Tensorflow': 'TensorFlow',
      'centos': 'CentOS',
      'Centos': 'CentOS',
      'macos': 'macOS',
      'MacOS': 'macOS',
      'Macos': 'macOS',
      'OS X': 'macOS',
      'OSX': 'macOS',
      'WASM': 'WebAssembly',
      'Wasm': 'WebAssembly',
      'FFMPEG': 'FFmpeg',
      'blockchain': 'Blockchain',
      'Webrtc': 'WebRTC',
      'webrtc': 'WebRTC',
      'openai': 'OpenAI',
      'Openai': 'OpenAI',
      'python': 'Python',
      'Python': 'Python',
      'jasmine': 'Jasmine',
      'Gimp': 'GIMP',
      'gimp': 'GIMP'
    };
    
    let result = text;
    
    // Apply replacements with word boundary checks
    for (const [wrong, correct] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      result = result.replace(regex, correct);
    }
    
    return result;
  }

  /**
   * Normalize URL for deduplication
   * Handles: http/https, www/non-www, trailing slashes
   */
  private normalizeUrlForDedup(url: string): string {
    let normalized = url.toLowerCase();
    // Remove protocol (http:// or https://)
    normalized = normalized.replace(/^https?:\/\//, '');
    // Remove www prefix
    normalized = normalized.replace(/^www\./, '');
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }

  /**
   * Group resources by their category hierarchy
   * Also deduplicates resources by URL to avoid double-link errors
   */
  private groupResourcesByCategory(): Map<string, CategoryGroup> {
    const groups = new Map<string, CategoryGroup>();
    const seenUrls = new Set<string>();

    for (const resource of this.resources) {
      // Deduplicate by URL - skip if we've already seen this URL
      // Normalize to handle http/https and www/non-www variations
      const normalizedUrl = this.normalizeUrlForDedup(resource.url);
      if (seenUrls.has(normalizedUrl)) {
        continue; // Skip duplicate URLs
      }
      seenUrls.add(normalizedUrl);
      const category = resource.category || 'Uncategorized';
      
      if (!groups.has(category)) {
        groups.set(category, {
          category,
          subcategories: new Map(),
          directResources: []
        });
      }

      const group = groups.get(category)!;

      if (resource.subcategory) {
        if (!group.subcategories.has(resource.subcategory)) {
          group.subcategories.set(resource.subcategory, {
            subcategory: resource.subcategory,
            subSubcategories: new Map(),
            directResources: []
          });
        }

        const subgroup = group.subcategories.get(resource.subcategory)!;

        if (resource.subSubcategory) {
          if (!subgroup.subSubcategories.has(resource.subSubcategory)) {
            subgroup.subSubcategories.set(resource.subSubcategory, []);
          }
          subgroup.subSubcategories.get(resource.subSubcategory)!.push(resource);
        } else {
          subgroup.directResources.push(resource);
        }
      } else {
        group.directResources.push(resource);
      }
    }

    return groups;
  }

  /**
   * Generate contributing section
   */
  private generateContributingSection(): string {
    const lines: string[] = [];
    lines.push('## Contributing');
    lines.push('');
    
    if (this.options.websiteUrl) {
      lines.push(`Contributions are welcome! You can contribute in two ways:`);
      lines.push('');
      lines.push(`### Via Website`);
      lines.push(`Visit [${this.options.websiteUrl}](${this.options.websiteUrl}) to:`);
      lines.push('- Submit new resources through the web form');
      lines.push('- Browse and search existing resources');
      lines.push('- Track approval status of your submissions');
      lines.push('');
      lines.push(`### Via GitHub`);
      lines.push('Please read the [contribution guidelines](CONTRIBUTING.md) first.');
      lines.push('');
    } else {
      lines.push('Please read the [contribution guidelines](CONTRIBUTING.md) first.');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate license section (CC0 for awesome lists)
   */
  private generateLicenseSection(): string {
    const lines: string[] = [];
    lines.push('## License');
    lines.push('');
    lines.push('[![CC0](http://mirrors.creativecommons.org/presskit/buttons/88x31/svg/cc-zero.svg)](http://creativecommons.org/publicdomain/zero/1.0)');
    lines.push('');
    lines.push('To the extent possible under law, the authors have waived all copyright and');
    lines.push('related or neighboring rights to this work.');
    
    return lines.join('\n');
  }

  /**
   * Convert string to GitHub markdown anchor format
   * GitHub's anchor generation: lowercase, spaces to hyphens, removes most special chars
   * IMPORTANT: GitHub keeps consecutive hyphens (e.g., "A & B" -> "a--b")
   * Each space becomes a hyphen individually, so "A & B" -> "a  b" -> "a--b"
   */
  private toAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters (& becomes empty, leaving spaces)
      .replace(/\s/g, '-')       // Replace EACH space with a hyphen (not \s+ which collapses)
      .trim();
  }

  /**
   * Extract repository path from GitHub URL
   */
  private extractRepoPath(url: string): string | null {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Generate a CONTRIBUTING.md file
 */
export function generateContributingMd(websiteUrl: string, repoUrl?: string): string {
  const lines: string[] = [];
  
  lines.push('# Contributing to this Awesome List');
  lines.push('');
  lines.push('Thank you for your interest in contributing! We welcome submissions of high-quality resources.');
  lines.push('');
  
  lines.push('## How to Contribute');
  lines.push('');
  lines.push('### Option 1: Submit via Website (Recommended)');
  lines.push('');
  lines.push(`The easiest way to contribute is through our website:`);
  lines.push('');
  lines.push(`1. Visit [${websiteUrl}](${websiteUrl})`);
  lines.push('2. Click on "Submit Resource" in the navigation');
  lines.push('3. Fill out the submission form with:');
  lines.push('   - Resource title');
  lines.push('   - URL');
  lines.push('   - Description');
  lines.push('   - Category selection');
  lines.push('4. Submit and track your submission status');
  lines.push('');
  lines.push('### Option 2: Submit via GitHub');
  lines.push('');
  
  if (repoUrl) {
    lines.push(`1. Fork the repository: [${repoUrl}](${repoUrl})`);
  } else {
    lines.push('1. Fork this repository');
  }
  
  lines.push('2. Create a new branch: `git checkout -b add-resource-name`');
  lines.push('3. Add your resource to the appropriate section in README.md');
  lines.push('4. Follow the format: `- [Resource Name](URL) - Brief description.`');
  lines.push('5. Make sure your addition maintains alphabetical order');
  lines.push('6. Create a Pull Request');
  lines.push('');
  
  lines.push('## Guidelines');
  lines.push('');
  lines.push('### Quality Standards');
  lines.push('- Resources must be actively maintained (updated within the last 2 years)');
  lines.push('- Must be relevant to the list topic');
  lines.push('- Should provide significant value to the community');
  lines.push('- No promotional or marketing content');
  lines.push('');
  
  lines.push('### Formatting');
  lines.push('- Use the format: `- [Name](URL) - Description.`');
  lines.push('- Description should be concise (1-2 sentences)');
  lines.push('- Description must end with a period');
  lines.push('- Maintain alphabetical order within sections');
  lines.push('- Ensure URLs are working and use HTTPS when available');
  lines.push('');
  
  lines.push('## Approval Process');
  lines.push('');
  lines.push('1. **Submission**: Resources are submitted via website or GitHub PR');
  lines.push('2. **Review**: Moderators review submissions for quality and relevance');
  lines.push('3. **Feedback**: If changes are needed, feedback will be provided');
  lines.push('4. **Approval**: Approved resources are automatically synced to the repository');
  lines.push('5. **Sync**: The README is updated with newly approved resources');
  lines.push('');
  
  lines.push('## Automatic Synchronization');
  lines.push('');
  lines.push('This awesome list uses automatic synchronization:');
  lines.push('- Resources approved on the website are automatically added to the README');
  lines.push('- The repository is updated daily with newly approved resources');
  lines.push('- Manual PRs are still welcome and will be imported into the system');
  lines.push('');
  
  lines.push('## Code of Conduct');
  lines.push('');
  lines.push('Please note that this project is released with a Contributor Code of Conduct.');
  lines.push('By participating in this project you agree to abide by its terms.');
  lines.push('');
  
  lines.push('## Questions?');
  lines.push('');
  lines.push(`If you have questions or need help, please visit [${websiteUrl}](${websiteUrl}) or open an issue.`);
  
  return lines.join('\n');
}