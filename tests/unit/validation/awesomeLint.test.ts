/**
 * Unit Tests for awesomeLint.ts
 *
 * Tests the awesome-lint validation rules including:
 * - Title validation
 * - Badge validation
 * - Table of contents validation
 * - List item formatting
 * - Category structure
 * - URL validation
 * - Capitalization rules
 * - General formatting rules
 * - License validation
 */

import { describe, it, expect } from 'vitest';
import {
  AwesomeLintValidator,
  validateAwesomeList,
  formatValidationReport,
  ValidationResult,
} from '../../../server/validation/awesomeLint';

describe('AwesomeLintValidator - Title Validation', () => {
  it('should pass validation for valid "Awesome" title', () => {
    const content = `# Awesome Test

A test list.

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const titleErrors = result.errors.filter(e => e.rule === 'title');
    expect(titleErrors).toHaveLength(0);
  });

  it('should fail validation when title is missing', () => {
    const content = `A list without a title

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const titleErrors = result.errors.filter(e => e.rule === 'title');
    expect(titleErrors.length).toBeGreaterThan(0);
    expect(titleErrors[0].message).toContain('Missing main title');
  });

  it('should fail validation when title does not include "Awesome"', () => {
    const content = `# Great Resources

A list without Awesome in the title.

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const titleErrors = result.errors.filter(e => e.rule === 'title');
    expect(titleErrors.length).toBeGreaterThan(0);
    expect(titleErrors[0].message).toContain('Title must start with "Awesome"');
  });
});

describe('AwesomeLintValidator - Badge Validation', () => {
  it('should pass validation with correct awesome badge', () => {
    const content = `# Awesome Test

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

A test list.

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const badgeErrors = result.errors.filter(e => e.rule === 'badge');
    expect(badgeErrors).toHaveLength(0);
  });

  it('should fail validation when awesome badge is missing', () => {
    const content = `# Awesome Test

A test list without a badge.

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const badgeErrors = result.errors.filter(e => e.rule === 'badge');
    expect(badgeErrors.length).toBeGreaterThan(0);
    expect(badgeErrors[0].message).toContain('Missing awesome badge');
  });
});

describe('AwesomeLintValidator - Table of Contents Validation', () => {
  it('should pass validation with properly formatted TOC', () => {
    const content = `# Awesome Test

## Contents

- [Category One](#category-one)
- [Category Two](#category-two)

## Category One

- [Resource](https://example.com) - Description.

## Category Two

- [Resource 2](https://example.com/2) - Description 2.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const tocErrors = result.errors.filter(e => e.rule.includes('toc'));
    expect(tocErrors).toHaveLength(0);
  });

  it('should warn about missing TOC for lists with many categories', () => {
    const content = `# Awesome Test

## Category One

- [Resource](https://example.com) - Description.

## Category Two

- [Resource 2](https://example.com/2) - Description 2.

## Category Three

- [Resource 3](https://example.com/3) - Description 3.

## Category Four

- [Resource 4](https://example.com/4) - Description 4.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const tocWarnings = result.warnings.filter(w => w.rule === 'toc');
    expect(tocWarnings.length).toBeGreaterThan(0);
    expect(tocWarnings[0].message).toContain('table of contents');
  });

  it('should fail validation for invalid TOC link format', () => {
    const content = `# Awesome Test

## Contents

- [Category One](category-one)
- [Category Two](#category-two)

## Category One

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const tocErrors = result.errors.filter(e => e.rule === 'toc-format');
    expect(tocErrors.length).toBeGreaterThan(0);
  });
});

describe('AwesomeLintValidator - List Items Validation', () => {
  it('should pass validation for properly formatted list items', () => {
    const content = `# Awesome Test

## Category

- [Resource One](https://example.com) - This is a description.
- [Resource Two](https://example.com/two) - Another description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const listErrors = result.errors.filter(e => e.rule === 'list-format');
    expect(listErrors).toHaveLength(0);
  });

  it('should fail validation for invalid list item format', () => {
    const content = `# Awesome Test

## Category

- [Resource One] https://example.com - Description.
- [Resource Two](https://example.com/two) - Another description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const listErrors = result.errors.filter(e => e.rule === 'list-format');
    expect(listErrors.length).toBeGreaterThan(0);
  });

  it('should fail validation for URLs with trailing slashes', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com/) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlErrors = result.errors.filter(e => e.rule === 'url-trailing-slash');
    expect(urlErrors.length).toBeGreaterThan(0);
    expect(urlErrors[0].message).toContain('trailing slash');
  });

  it('should allow root URL with slash', () => {
    const content = `# Awesome Test

## Category

- [Resource](/) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlErrors = result.errors.filter(e => e.rule === 'url-trailing-slash');
    expect(urlErrors).toHaveLength(0);
  });

  it('should fail validation when description does not start with capital letter', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - lowercase description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const descErrors = result.errors.filter(e => e.rule === 'description-capital');
    expect(descErrors.length).toBeGreaterThan(0);
  });

  it('should fail validation when description does not end with punctuation', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description without period
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const descErrors = result.errors.filter(e => e.rule === 'description-period');
    expect(descErrors.length).toBeGreaterThan(0);
  });

  it('should allow descriptions ending with exclamation or question marks', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Amazing resource!
- [Resource 2](https://example.com/2) - Is this great?
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const descErrors = result.errors.filter(e => e.rule === 'description-period');
    expect(descErrors).toHaveLength(0);
  });
});

describe('AwesomeLintValidator - Category Validation', () => {
  it('should pass validation for properly nested categories', () => {
    const content = `# Awesome Test

## Category One

- [Resource](https://example.com) - Description.

### Subcategory

- [Sub Resource](https://example.com/sub) - Sub description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const categoryErrors = result.errors.filter(e => e.rule === 'category-nesting');
    expect(categoryErrors).toHaveLength(0);
  });

  it('should fail validation for improper category nesting', () => {
    const content = `# Awesome Test

## Category One

- [Resource](https://example.com) - Description.

#### Skipped Level

- [Sub Resource](https://example.com/sub) - Sub description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const categoryErrors = result.errors.filter(e => e.rule === 'category-nesting');
    expect(categoryErrors.length).toBeGreaterThan(0);
  });

  it('should warn about categories not starting with capital letter', () => {
    const content = `# Awesome Test

## category one

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const categoryWarnings = result.warnings.filter(w => w.rule === 'category-capital');
    expect(categoryWarnings.length).toBeGreaterThan(0);
  });
});

describe('AwesomeLintValidator - Description Validation', () => {
  it('should warn about blockquote descriptions not starting with capital', () => {
    const content = `# Awesome Test

> this is a description.

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const descWarnings = result.warnings.filter(w => w.rule === 'description-capital');
    expect(descWarnings.length).toBeGreaterThan(0);
  });

  it('should warn about blockquote descriptions not ending with punctuation', () => {
    const content = `# Awesome Test

> This is a description

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const descWarnings = result.warnings.filter(w => w.rule === 'description-period');
    expect(descWarnings.length).toBeGreaterThan(0);
  });
});

describe('AwesomeLintValidator - URL Validation', () => {
  it('should fail validation for URLs with spaces', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com/path with spaces) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlErrors = result.errors.filter(e => e.rule === 'url-spaces');
    expect(urlErrors.length).toBeGreaterThan(0);
  });

  it('should warn about URLs without protocol', () => {
    const content = `# Awesome Test

## Category

- [Resource](example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlWarnings = result.warnings.filter(w => w.rule === 'url-protocol');
    expect(urlWarnings.length).toBeGreaterThan(0);
  });

  it('should allow anchor links without protocol', () => {
    const content = `# Awesome Test

## Contents

- [Category](#category)

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlWarnings = result.warnings.filter(w =>
      w.rule === 'url-protocol' && w.message.includes('#category')
    );
    expect(urlWarnings).toHaveLength(0);
  });

  it('should allow mailto links', () => {
    const content = `# Awesome Test

## Category

- [Contact](mailto:test@example.com) - Email contact.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlWarnings = result.warnings.filter(w =>
      w.rule === 'url-protocol' && w.message.includes('mailto')
    );
    expect(urlWarnings).toHaveLength(0);
  });

  it('should warn about HTTP instead of HTTPS', () => {
    const content = `# Awesome Test

## Category

- [Resource](http://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlWarnings = result.warnings.filter(w => w.rule === 'url-https');
    expect(urlWarnings.length).toBeGreaterThan(0);
    expect(urlWarnings[0].message).toContain('HTTPS');
  });

  it('should allow HTTP for localhost', () => {
    const content = `# Awesome Test

## Category

- [Local Dev](http://localhost:3000) - Local development.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const urlWarnings = result.warnings.filter(w =>
      w.rule === 'url-https' && w.message.includes('localhost')
    );
    expect(urlWarnings).toHaveLength(0);
  });
});

describe('AwesomeLintValidator - Capitalization Validation', () => {
  it('should warn about incorrect "nodejs" capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - A nodejs library.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
    expect(capWarnings[0].message).toContain('Node.js');
  });

  it('should warn about incorrect "Github" capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Hosted on Github.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
    expect(capWarnings[0].message).toContain('GitHub');
  });

  it('should warn about incorrect "javascript" capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - A javascript framework.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
    expect(capWarnings[0].message).toContain('JavaScript');
  });

  it('should warn about incorrect "typescript" capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Written in typescript.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
    expect(capWarnings[0].message).toContain('TypeScript');
  });

  it('should warn about incorrect technology name capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Uses mongodb and postgresql.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
  });

  it('should warn about incorrect "MacOS" capitalization', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Works on MacOS.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const capWarnings = result.warnings.filter(w => w.rule === 'capitalization');
    expect(capWarnings.length).toBeGreaterThan(0);
    expect(capWarnings[0].message).toContain('macOS');
  });
});

describe('AwesomeLintValidator - Formatting Validation', () => {
  it('should warn about trailing whitespace', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const formatWarnings = result.warnings.filter(w => w.rule === 'trailing-whitespace');
    expect(formatWarnings.length).toBeGreaterThan(0);
  });

  it('should fail validation for asterisk list markers', () => {
    const content = `# Awesome Test

## Category

* [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const listErrors = result.errors.filter(e => e.rule === 'list-marker');
    expect(listErrors.length).toBeGreaterThan(0);
    expect(listErrors[0].message).toContain('Use "-" for list items');
  });

  it('should fail validation when file does not end with newline', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description.`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const formatErrors = result.errors.filter(e => e.rule === 'final-newline');
    expect(formatErrors.length).toBeGreaterThan(0);
  });

  it('should warn about double blank lines', () => {
    const content = `# Awesome Test


## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const formatWarnings = result.warnings.filter(w => w.rule === 'double-blank');
    expect(formatWarnings.length).toBeGreaterThan(0);
  });
});

describe('AwesomeLintValidator - License Validation', () => {
  it('should pass validation when license is present', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description.

## License

CC0
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const licenseWarnings = result.warnings.filter(w => w.rule === 'license');
    expect(licenseWarnings).toHaveLength(0);
  });

  it('should warn when license section is missing', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    const licenseWarnings = result.warnings.filter(w => w.rule === 'license');
    expect(licenseWarnings.length).toBeGreaterThan(0);
    expect(licenseWarnings[0].message).toContain('license');
  });
});

describe('AwesomeLintValidator - Statistics', () => {
  it('should count total lines correctly', () => {
    const content = `# Awesome Test
Line 2
Line 3
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.stats.totalLines).toBe(4);
  });

  it('should count resources correctly', () => {
    const content = `# Awesome Test

## Category

- [Resource 1](https://example.com/1) - Description 1.
- [Resource 2](https://example.com/2) - Description 2.
- [Resource 3](https://example.com/3) - Description 3.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.stats.totalResources).toBe(3);
  });

  it('should count categories correctly', () => {
    const content = `# Awesome Test

## Category One

- [Resource](https://example.com) - Description.

## Category Two

- [Resource 2](https://example.com/2) - Description 2.

## Contents

- [Category One](#category-one)
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.stats.totalCategories).toBe(2);
  });

  it('should not count "Contents" as a category', () => {
    const content = `# Awesome Test

## Contents

- [Category](#category)

## Category

- [Resource](https://example.com) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.stats.totalCategories).toBe(1);
  });
});

describe('AwesomeLintValidator - Validation Result', () => {
  it('should return valid=true when no errors exist', () => {
    const content = `# Awesome Test

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

A great test list.

## Category

- [Resource](https://example.com) - Description.

## License

CC0
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid=false when errors exist', () => {
    const content = `# Great Resources

No badge here.

## Category

- [Resource](https://example.com/) - Description.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should include both errors and warnings in result', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com/) - Description with nodejs.
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateAwesomeList - Helper Function', () => {
  it('should validate content and return result', () => {
    const content = `# Awesome Test

## Category

- [Resource](https://example.com) - Description.
`;

    const result = validateAwesomeList(content);

    expect(result).toBeDefined();
    expect(result.valid).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(result.warnings).toBeDefined();
    expect(result.stats).toBeDefined();
  });
});

describe('formatValidationReport - Report Formatting', () => {
  it('should format a passing validation report', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        totalLines: 10,
        totalResources: 5,
        totalCategories: 2,
      },
    };

    const report = formatValidationReport(result);

    expect(report).toContain('✅ PASSED');
    expect(report).toContain('Total Lines: 10');
    expect(report).toContain('Total Resources: 5');
    expect(report).toContain('Total Categories: 2');
    expect(report).toContain('✨ Your awesome list passes all validation rules!');
  });

  it('should format a failing validation report with errors', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          line: 5,
          rule: 'title',
          message: 'Title must start with "Awesome"',
          severity: 'error',
        },
        {
          line: 10,
          rule: 'badge',
          message: 'Missing awesome badge',
          severity: 'error',
        },
      ],
      warnings: [],
      stats: {
        totalLines: 15,
        totalResources: 3,
        totalCategories: 1,
      },
    };

    const report = formatValidationReport(result);

    expect(report).toContain('❌ FAILED');
    expect(report).toContain('Errors (2)');
    expect(report).toContain('Line 5');
    expect(report).toContain('**title**');
    expect(report).toContain('Title must start with "Awesome"');
    expect(report).toContain('Line 10');
    expect(report).toContain('**badge**');
    expect(report).toContain('Please fix the errors above');
  });

  it('should format a report with warnings', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [
        {
          line: 8,
          rule: 'capitalization',
          message: 'Use "Node.js" instead of "nodejs"',
          severity: 'warning',
        },
      ],
      stats: {
        totalLines: 20,
        totalResources: 8,
        totalCategories: 3,
      },
    };

    const report = formatValidationReport(result);

    expect(report).toContain('Warnings (1)');
    expect(report).toContain('Line 8');
    expect(report).toContain('**capitalization**');
    expect(report).toContain('Use "Node.js" instead of "nodejs"');
  });

  it('should format a report with both errors and warnings', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          line: 1,
          rule: 'title',
          message: 'Missing main title',
          severity: 'error',
        },
      ],
      warnings: [
        {
          line: 15,
          rule: 'license',
          message: 'Consider adding a license section',
          severity: 'warning',
        },
      ],
      stats: {
        totalLines: 25,
        totalResources: 10,
        totalCategories: 4,
      },
    };

    const report = formatValidationReport(result);

    expect(report).toContain('❌ FAILED');
    expect(report).toContain('Errors (1)');
    expect(report).toContain('Warnings (1)');
    expect(report).toContain('Missing main title');
    expect(report).toContain('Consider adding a license section');
  });
});

describe('AwesomeLintValidator - Complex Integration Tests', () => {
  it('should validate a complete awesome list with multiple issues', () => {
    const content = `# Great Resources

This is a test list.

## contents

- [Category One](#category-one)

## Category One

* [Resource](https://example.com/) - description without capital
- [Another](https://example.com/path with spaces) - Another.
- [Tool](http://example.com) - Uses nodejs and Github.


## Category Two

- [Item](https://example.com/item) - Description
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.valid).toBe(false);

    const errorRules = result.errors.map(e => e.rule);
    expect(errorRules).toContain('title');
    expect(errorRules).toContain('badge');
    expect(errorRules).toContain('list-marker');
    expect(errorRules).toContain('url-trailing-slash');
    expect(errorRules).toContain('url-spaces');
    expect(errorRules).toContain('description-capital');
    expect(errorRules).toContain('description-period');
    expect(errorRules).toContain('final-newline');

    const warningRules = result.warnings.map(w => w.rule);
    expect(warningRules).toContain('category-capital');
    expect(warningRules).toContain('trailing-whitespace');
    expect(warningRules).toContain('url-https');
    expect(warningRules).toContain('capitalization');
    expect(warningRules).toContain('double-blank');
  });

  it('should validate a well-formatted awesome list', () => {
    const content = `# Awesome Testing

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated list of awesome testing resources.

## Contents

- [Tools](#tools)
- [Frameworks](#frameworks)

## Tools

- [Jest](https://github.com/facebook/jest) - Delightful JavaScript testing.
- [Mocha](https://github.com/mochajs/mocha) - Simple, flexible testing framework.

## Frameworks

### JavaScript

- [Cypress](https://github.com/cypress-io/cypress) - Fast, easy testing for anything.
- [Playwright](https://github.com/microsoft/playwright) - Cross-browser automation.

### Python

- [Pytest](https://github.com/pytest-dev/pytest) - Makes it easy to write tests.

## License

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)
`;

    const validator = new AwesomeLintValidator(content);
    const result = validator.validate();

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
    expect(result.stats.totalResources).toBeGreaterThan(0);
    expect(result.stats.totalCategories).toBeGreaterThan(0);
  });
});
