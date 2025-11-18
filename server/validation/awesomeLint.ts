/**
 * Awesome List Linter
 * Implements validation rules from awesome-lint specification
 * https://github.com/sindresorhus/awesome-lint
 */

export interface ValidationError {
  line: number;
  column?: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalLines: number;
    totalResources: number;
    totalCategories: number;
  };
}

export class AwesomeLintValidator {
  private content: string;
  private lines: string[];
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split('\n');
  }

  /**
   * Validate the entire awesome list
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Run all validation rules
    this.validateTitle();
    this.validateBadge();
    this.validateTableOfContents();
    this.validateListItems();
    this.validateCategories();
    this.validateDescriptions();
    this.validateURLs();
    this.validateCapitalization();
    this.validateFormatting();
    this.validateLicense();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: {
        totalLines: this.lines.length,
        totalResources: this.countResources(),
        totalCategories: this.countCategories()
      }
    };
  }

  /**
   * Validate that title starts with "Awesome"
   */
  private validateTitle(): void {
    const titleLine = this.lines.find(line => line.startsWith('# '));
    if (!titleLine) {
      this.addError(1, 'title', 'Missing main title (should start with "# Awesome")');
      return;
    }

    const titleIndex = this.lines.indexOf(titleLine);
    if (!titleLine.includes('Awesome')) {
      this.addError(titleIndex + 1, 'title', 'Title must start with "Awesome"');
    }
  }

  /**
   * Validate that awesome badge is present and properly formatted
   */
  private validateBadge(): void {
    const badgePattern = /\[!\[Awesome\]\(https:\/\/awesome\.re\/badge\.svg\)\]\(https:\/\/awesome\.re\)/;
    const hasBadge = this.lines.some(line => badgePattern.test(line));
    
    if (!hasBadge) {
      // Find where the badge should be (after title and blank line)
      const titleIndex = this.lines.findIndex(line => line.startsWith('# '));
      if (titleIndex !== -1) {
        const expectedBadgeLine = titleIndex + 2; // Title, blank line, then badge
        this.addError(
          expectedBadgeLine,
          'badge',
          'Missing awesome badge. Add: [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)'
        );
      }
    }
  }

  /**
   * Validate table of contents structure
   */
  private validateTableOfContents(): void {
    const tocIndex = this.lines.findIndex(line => 
      line === '## Contents' || line === '## Table of Contents'
    );

    if (tocIndex === -1) {
      // TOC is optional for small lists
      const categoryCount = this.countCategories();
      if (categoryCount > 3) {
        this.addWarning(5, 'toc', 'Consider adding a table of contents for better navigation');
      }
      return;
    }

    // Validate TOC format
    for (let i = tocIndex + 1; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      // Stop at next section
      if (line.startsWith('## ') && !line.includes('Contents')) {
        break;
      }

      // Check TOC item format
      if (line.startsWith('- [') || line.startsWith('  - [')) {
        const linkPattern = /^(\s*)- \[([^\]]+)\]\(#([^)]+)\)$/;
        if (!linkPattern.test(line)) {
          this.addError(i + 1, 'toc-format', 'Invalid TOC link format');
        }
      }
    }
  }

  /**
   * Validate list items follow the correct format
   */
  private validateListItems(): void {
    const listItemPattern = /^- \[([^\]]+)\]\(([^)]+)\)( - (.+))?$/;
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Skip non-list items
      if (!line.startsWith('- [')) {
        continue;
      }

      const match = line.match(listItemPattern);
      if (!match) {
        this.addError(i + 1, 'list-format', 'Invalid list item format. Use: - [Name](url) - Description.');
        continue;
      }

      const [, name, url, , description] = match;

      // Validate URL doesn't have trailing slash (except root)
      if (url !== '/' && url.endsWith('/')) {
        this.addError(i + 1, 'url-trailing-slash', `Remove trailing slash from URL: ${url}`);
      }

      // Validate description if present
      if (description) {
        // Check description starts with capital
        if (description[0] !== description[0].toUpperCase()) {
          this.addError(i + 1, 'description-capital', 'Description must start with a capital letter');
        }

        // Check description ends with period
        if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
          this.addError(i + 1, 'description-period', 'Description must end with a period');
        }
      }
    }
  }

  /**
   * Validate category structure and nesting
   */
  private validateCategories(): void {
    // Start at 1 because all awesome lists have a # Title header
    let lastCategoryLevel = 1;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 0;
        
        // Check for proper nesting
        if (level > lastCategoryLevel + 1) {
          this.addError(i + 1, 'category-nesting', 'Improper category nesting (skipped level)');
        }
        
        // Check category format
        if (level === 2 && !line.match(/^## [A-Z]/)) {
          this.addWarning(i + 1, 'category-capital', 'Category should start with capital letter');
        }
        
        lastCategoryLevel = level;
      }
    }
  }

  /**
   * Validate descriptions are properly formatted
   */
  private validateDescriptions(): void {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      // Check main description (blockquote)
      if (line.startsWith('> ')) {
        const description = line.substring(2).trim();
        
        if (description && description[0] !== description[0].toUpperCase()) {
          this.addWarning(i + 1, 'description-capital', 'Description should start with capital letter');
        }
        
        if (description && !description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
          this.addWarning(i + 1, 'description-period', 'Description should end with punctuation');
        }
      }
    }
  }

  /**
   * Validate URLs are properly formatted
   */
  private validateURLs(): void {
    const urlPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      let match;

      while ((match = urlPattern.exec(line)) !== null) {
        const [, , url] = match;

        // Check for common URL issues
        if (url.includes(' ')) {
          this.addError(i + 1, 'url-spaces', `URL contains spaces: ${url}`);
        }

        // Check for protocol
        if (!url.startsWith('#') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
          this.addWarning(i + 1, 'url-protocol', `URL should include protocol: ${url}`);
        }

        // Prefer HTTPS over HTTP
        if (url.startsWith('http://') && !url.includes('localhost')) {
          this.addWarning(i + 1, 'url-https', `Consider using HTTPS instead of HTTP: ${url}`);
        }
      }
    }
  }

  /**
   * Validate proper capitalization of common terms
   */
  private validateCapitalization(): void {
    const incorrectTerms: { [key: string]: string } = {
      'nodejs': 'Node.js',
      'Github': 'GitHub',
      'github': 'GitHub',
      'Javascript': 'JavaScript',
      'javascript': 'JavaScript',
      'Typescript': 'TypeScript',
      'typescript': 'TypeScript',
      'Graphql': 'GraphQL',
      'graphql': 'GraphQL',
      'Mongodb': 'MongoDB',
      'mongodb': 'MongoDB',
      'Postgresql': 'PostgreSQL',
      'postgresql': 'PostgreSQL',
      'Api': 'API',
      'Json': 'JSON',
      'Xml': 'XML',
      'Html': 'HTML',
      'Css': 'CSS',
      'Http': 'HTTP',
      'Ios': 'iOS',
      'MacOS': 'macOS',
      'Macos': 'macOS'
    };

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      for (const [wrong, correct] of Object.entries(incorrectTerms)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'g');
        if (regex.test(line)) {
          this.addWarning(i + 1, 'capitalization', `Use "${correct}" instead of "${wrong}"`);
        }
      }
    }
  }

  /**
   * Validate general formatting rules
   */
  private validateFormatting(): void {
    // Check for trailing whitespace
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      if (line !== line.trimEnd()) {
        this.addWarning(i + 1, 'trailing-whitespace', 'Line has trailing whitespace');
      }
    }

    // Check for consistent list markers (should use - not *)
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      if (line.startsWith('* ')) {
        this.addError(i + 1, 'list-marker', 'Use "-" for list items, not "*"');
      }
    }

    // Check file ends with single newline
    if (this.content.length > 0 && !this.content.endsWith('\n')) {
      this.addError(this.lines.length, 'final-newline', 'File should end with a single newline');
    }

    // Check for double blank lines
    for (let i = 1; i < this.lines.length; i++) {
      if (this.lines[i] === '' && this.lines[i - 1] === '') {
        this.addWarning(i + 1, 'double-blank', 'Avoid double blank lines');
      }
    }
  }

  /**
   * Validate license section exists
   */
  private validateLicense(): void {
    const hasLicense = this.lines.some(line => 
      line.toLowerCase().includes('license') || 
      line.includes('CC0') ||
      line.includes('cc-zero')
    );

    if (!hasLicense) {
      this.addWarning(
        this.lines.length,
        'license',
        'Consider adding a license section (CC0 recommended for awesome lists)'
      );
    }
  }

  /**
   * Add an error to the list
   */
  private addError(line: number, rule: string, message: string): void {
    this.errors.push({
      line,
      rule,
      message,
      severity: 'error'
    });
  }

  /**
   * Add a warning to the list
   */
  private addWarning(line: number, rule: string, message: string): void {
    this.warnings.push({
      line,
      rule,
      message,
      severity: 'warning'
    });
  }

  /**
   * Count the number of resources
   */
  private countResources(): number {
    return this.lines.filter(line => line.trim().match(/^- \[.+\]\(.+\)/)).length;
  }

  /**
   * Count the number of categories
   */
  private countCategories(): number {
    return this.lines.filter(line => line.startsWith('## ') && !line.includes('Contents')).length;
  }
}

/**
 * Validate awesome list content
 */
export function validateAwesomeList(content: string): ValidationResult {
  const validator = new AwesomeLintValidator(content);
  return validator.validate();
}

/**
 * Format validation results as a report
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('# Awesome List Validation Report');
  lines.push('');
  lines.push(`Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push('');
  
  lines.push('## Statistics');
  lines.push(`- Total Lines: ${result.stats.totalLines}`);
  lines.push(`- Total Resources: ${result.stats.totalResources}`);
  lines.push(`- Total Categories: ${result.stats.totalCategories}`);
  lines.push('');
  
  if (result.errors.length > 0) {
    lines.push(`## Errors (${result.errors.length})`);
    lines.push('');
    for (const error of result.errors) {
      lines.push(`- Line ${error.line}: **${error.rule}** - ${error.message}`);
    }
    lines.push('');
  }
  
  if (result.warnings.length > 0) {
    lines.push(`## Warnings (${result.warnings.length})`);
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- Line ${warning.line}: **${warning.rule}** - ${warning.message}`);
    }
    lines.push('');
  }
  
  if (result.valid) {
    lines.push('✨ Your awesome list passes all validation rules!');
  } else {
    lines.push('Please fix the errors above to ensure your list is awesome-lint compliant.');
  }
  
  return lines.join('\n');
}