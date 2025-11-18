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
    if (categoryGroups.size > 3) { // Only add TOC if we have more than 3 categories
      sections.push(this.generateTableOfContents(categoryGroups));
    }

    // Add resources by category
    sections.push(this.generateResourceSections(categoryGroups));

    // Add contributing section
    if (this.options.includeContributing) {
      sections.push(this.generateContributingSection());
    }

    // Add license section
    if (this.options.includeLicense) {
      sections.push(this.generateLicenseSection());
    }

    return sections.join('\n\n');
  }

  /**
   * Generate the header with title, badges, and description
   */
  private generateHeader(): string {
    const lines: string[] = [];

    // Title with Awesome prefix
    const title = this.options.title.startsWith('Awesome') 
      ? this.options.title 
      : `Awesome ${this.options.title}`;
    lines.push(`# ${title}`);
    lines.push('');

    // Add the awesome badge (required for awesome lists)
    lines.push('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
    
    // Add additional badges if needed
    if (this.options.repoUrl) {
      const repoPath = this.extractRepoPath(this.options.repoUrl);
      if (repoPath) {
        lines.push(`[![GitHub stars](https://img.shields.io/github/stars/${repoPath})](${this.options.repoUrl})`);
        lines.push(`[![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](http://creativecommons.org/publicdomain/zero/1.0/)`);
      }
    }
    lines.push('');

    // Add description
    if (this.options.description) {
      lines.push(`> ${this.options.description}`);
      lines.push('');
    }

    // Add website link if available
    if (this.options.websiteUrl) {
      lines.push(`**[View on Website](${this.options.websiteUrl})** - Submit new resources and browse the curated collection with advanced filtering.`);
      lines.push('');
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

    for (const [category, group] of categoryGroups) {
      const anchor = this.toAnchor(category);
      lines.push(`- [${category}](#${anchor})`);

      // Add subcategories if they exist
      if (group.subcategories.size > 0) {
        for (const [subcategory] of group.subcategories) {
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

    for (const [category, group] of categoryGroups) {
      // Category header
      sections.push(`## ${category}`);
      sections.push('');

      // Add resources directly under the category
      if (group.directResources.length > 0) {
        sections.push(this.formatResourceList(group.directResources));
        sections.push('');
      }

      // Add subcategories
      for (const [subcategory, subgroup] of group.subcategories) {
        sections.push(`### ${subcategory}`);
        sections.push('');

        // Add resources directly under the subcategory
        if (subgroup.directResources.length > 0) {
          sections.push(this.formatResourceList(subgroup.directResources));
          sections.push('');
        }

        // Add sub-subcategories
        for (const [subSubcategory, resources] of subgroup.subSubcategories) {
          sections.push(`#### ${subSubcategory}`);
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
    let line = `- [${resource.title}](${resource.url})`;
    
    if (resource.description && resource.description.trim()) {
      // Ensure description ends with a period
      let description = resource.description.trim();
      if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
        description += '.';
      }
      line += ` - ${description}`;
    }
    
    return line;
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