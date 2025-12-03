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

    // Add contributing section
    if (this.options.includeContributing) {
      sections.push(this.generateContributingSection());
    }

    // License section removed - awesome-lint forbids explicit license sections
    // The CC0 license is already indicated in the badge in the header

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
    const title = this.options.title.startsWith('Awesome') 
      ? this.options.title 
      : `Awesome ${this.options.title}`;
    lines.push(`# ${title}`);
    
    // Awesome badge must be on the line directly after the title with no blank line
    lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
    
    // Add additional badges on same line to avoid double blank lines
    if (this.options.repoUrl) {
      const repoPath = this.extractRepoPath(this.options.repoUrl);
      if (repoPath) {
        lines.push(`[![GitHub stars](https://img.shields.io/github/stars/${repoPath})](${this.options.repoUrl})`);
        lines.push(`[![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](http://creativecommons.org/publicdomain/zero/1.0/)`);
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
   * Uses global URL deduplication to prevent same URL appearing multiple times
   */
  private generateResourceSections(categoryGroups: Map<string, CategoryGroup>): string {
    const sections: string[] = [];
    const globalSeenUrls = new Set<string>(); // Global deduplication across all categories

    for (const [category, group] of Array.from(categoryGroups)) {
      // Category header
      sections.push(`## ${category}`);
      sections.push('');

      // Add resources directly under the category
      if (group.directResources.length > 0) {
        sections.push(this.formatResourceList(group.directResources, globalSeenUrls));
        sections.push('');
      }

      // Add subcategories
      for (const [subcategory, subgroup] of Array.from(group.subcategories)) {
        sections.push(`### ${subcategory}`);
        sections.push('');

        // Add resources directly under the subcategory
        if (subgroup.directResources.length > 0) {
          sections.push(this.formatResourceList(subgroup.directResources, globalSeenUrls));
          sections.push('');
        }

        // Add sub-subcategories
        for (const [subSubcategory, resources] of Array.from(subgroup.subSubcategories)) {
          sections.push(`#### ${subSubcategory}`);
          sections.push('');
          sections.push(this.formatResourceList(resources, globalSeenUrls));
          sections.push('');
        }
      }
    }

    return sections.join('\n').trim();
  }

  /**
   * Format a list of resources following awesome list conventions
   * @param globalSeenUrls Optional set for global deduplication across all categories
   */
  private formatResourceList(resources: Resource[], globalSeenUrls?: Set<string>): string {
    // Use provided global set or create local one
    const seenUrls = globalSeenUrls || new Set<string>();
    
    // Deduplicate by URL - keep first occurrence only
    const uniqueResources = resources.filter(resource => {
      const normalizedUrl = resource.url.trim().toLowerCase();
      if (seenUrls.has(normalizedUrl)) {
        return false; // Skip duplicate
      }
      seenUrls.add(normalizedUrl);
      return true;
    });
    
    return uniqueResources
      .sort((a, b) => a.title.localeCompare(b.title)) // Alphabetical sorting
      .map(resource => this.formatResource(resource))
      .join('\n');
  }

  /**
   * Format a single resource
   * Format: - [Name](url) - Description.
   */
  private formatResource(resource: Resource): string {
    // Trim title to remove leading/trailing whitespace (fixes no-inline-padding)
    let title = resource.title.trim();

    // Normalize quotes and punctuation in title (match-punctuation fix)
    title = title.replace(/\u2026/g, '...'); // Horizontal ellipsis
    title = title.replace(/[\u2018\u2019'']/g, "'"); // Curly single quotes
    title = title.replace(/[\u201C\u201D""]/g, '"'); // Curly double quotes
    title = title.replace(/[\u2013\u2014]/g, '-'); // Em/en dashes

    // Replace brackets in title with parentheses to avoid breaking markdown link syntax
    // Titles with brackets break the [title](url) pattern in awesome-lint validator
    title = title.replace(/\[/g, '(').replace(/\]/g, ')');

    // Ensure proper capitalization in title
    title = this.ensureProperCapitalization(title);

    // Normalize URL (awesome-lint requirements):
    let url = resource.url.trim();

    // 1. Force HTTPS for http URLs (except localhost)
    if (url.startsWith('http://') && !url.includes('localhost')) {
      url = url.replace(/^http:\/\//, 'https://');
    }

    // 2. Remove trailing slashes (but not for root URLs)
    while (url.endsWith('/') && url.length > 8 && !url.match(/^https?:\/\/$/)) {
      url = url.slice(0, -1);
    }

    // 3. Normalize domain casing (lowercase domain only)
    try {
      const urlMatch = url.match(/^(https?:\/\/)([^\/\?#]+)(.*)$/);
      if (urlMatch) {
        url = urlMatch[1] + urlMatch[2].toLowerCase() + (urlMatch[3] || '');
      }
    } catch {
      // Keep original URL if parsing fails
    }

    // 4. Escape parentheses in URLs to avoid breaking markdown link syntax
    url = url.replace(/\(/g, '%28').replace(/\)/g, '%29');

    let line = `- [${title}](${url})`;

    if (resource.description && resource.description.trim()) {
      let description = resource.description.trim();

      // Remove raw HTML/shortcodes from descriptions (e.g., [vc_row...])
      // These break markdown parsing and are not useful in README
      description = description.replace(/\[vc_[^\]]+\]/g, '');
      description = description.replace(/\[\/vc_[^\]]+\]/g, '');
      description = description.trim();

      // Remove title duplication from end of description (e.g., "... - krad/morsel")
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleSuffixPattern = new RegExp(`\\s*-\\s*${escapedTitle}\\s*\\.?$`, 'i');
      description = description.replace(titleSuffixPattern, '');
      description = description.trim();

      // Replace remaining brackets in description with parentheses
      description = description.replace(/\[/g, '(').replace(/\]/g, ')');

      // Replace ALL quote and punctuation variants (match-punctuation fix)
      // Horizontal ellipsis → three periods
      description = description.replace(/\u2026/g, '...');
      // Curly single quotes: ' ' 
      description = description.replace(/[\u2018\u2019'']/g, "'");
      // Curly double quotes: " "
      description = description.replace(/[\u201C\u201D""]/g, '"');
      // Prime and double-prime (sometimes used)
      description = description.replace(/[′″]/g, "'");
      // Em dash and en dash → regular hyphen
      description = description.replace(/[\u2013\u2014]/g, '-');

      // Remove leading emojis from descriptions (awesome-lint requires letter start)
      // Common emoji ranges: 🎬📹🎥📺📇🔥👻🐋📼
      description = description.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, '');
      description = description.trim();

      // Ensure description starts with capital letter (skip emojis/symbols)
      // Find first letter character and capitalize it
      const firstLetterMatch = description.match(/[a-zA-Z]/);
      if (firstLetterMatch) {
        const firstLetterIndex = description.indexOf(firstLetterMatch[0]);
        if (firstLetterIndex >= 0 && description[firstLetterIndex] !== description[firstLetterIndex].toUpperCase()) {
          description = 
            description.slice(0, firstLetterIndex) +
            description[firstLetterIndex].toUpperCase() +
            description.slice(firstLetterIndex + 1);
        }
      }

      // Ensure description ends with exactly one period (no-repeat-punctuation)
      // But respect ellipsis (...) as intentional
      description = description.replace(/\.{2,}$/g, '.'); // Replace 2+ periods at end with single period
      
      // Don't add period if already ends with punctuation or ellipsis
      if (!description.match(/[.!?]$/) && !description.match(/\.\.\./)) {
        description += '.';
      }

      // Apply proper capitalizations in description
      description = this.ensureProperCapitalization(description);

      line += ` - ${description}`;
    }

    return line;
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
      'ipv6': 'IPv6'
    };

    let result = text;

    // Apply replacements with word boundary checks
    for (const [wrong, correct] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      result = result.replace(regex, correct);
    }

    // Special cases (case-sensitive replacements)
    result = result.replace(/\bOS X\b/g, 'macOS');
    result = result.replace(/\bOSX\b/g, 'macOS');
    result = result.replace(/\bOsx\b/g, 'macOS');
    result = result.replace(/\bStackoverflow\b/gi, 'Stack Overflow');
    result = result.replace(/\bstackoverflow\b/g, 'Stack Overflow');

    return result;
  }

  /**
   * Group resources by their category hierarchy
   */
  private groupResourcesByCategory(): Map<string, CategoryGroup> {
    const groups = new Map<string, CategoryGroup>();

    for (const resource of this.resources) {
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
   */
  private toAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove duplicate hyphens
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