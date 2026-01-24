import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAwesomeList } from '../parser';
import fetch from 'node-fetch';

// Mock node-fetch
vi.mock('node-fetch');

describe('Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAwesomeList', () => {
    describe('URL validation', () => {
      it('should reject non-GitHub/GitLab URLs', async () => {
        await expect(
          fetchAwesomeList('https://example.com/README.md')
        ).rejects.toThrow('Invalid URL');
      });

      it('should reject non-raw GitHub URLs', async () => {
        await expect(
          fetchAwesomeList('https://github.com/user/repo/blob/main/README.md')
        ).rejects.toThrow('Please use the raw GitHub URL');
      });

      it('should accept raw GitHub URLs', async () => {
        const mockMarkdown = `# Awesome Test

A curated list of awesome test frameworks.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
- [Resource 2](https://github.com/user/repo2) - Description 2
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result).toBeDefined();
        expect(result.resources.length).toBeGreaterThan(0);
      });

      it('should accept GitLab URLs', async () => {
        const mockMarkdown = `# Awesome Test

A curated list of awesome test frameworks.

## Category 1

- [Resource 1](https://gitlab.com/user/repo1) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://gitlab.com/user/repo/-/raw/main/README.md'
        );

        expect(result).toBeDefined();
        expect(result.resources.length).toBeGreaterThan(0);
      });
    });

    describe('Network error handling', () => {
      it('should handle timeout errors', async () => {
        vi.mocked(fetch).mockImplementation(() => {
          const error: any = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        });

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Request timeout');
      });

      it('should handle network errors', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Network error');
      });

      it('should handle 404 errors', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('File not found');
      });

      it('should handle 403 errors', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Access forbidden');
      });

      it('should handle 429 rate limit errors', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle 500 server errors', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Server error');
      });
    });

    describe('Content validation', () => {
      it('should reject empty content', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => '',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('Empty file');
      });

      it('should reject content without headings', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => 'Just some text without any structure',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('No category headings found');
      });

      it('should reject content without list items', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => '## Category\n\nSome text but no list items',
        } as any);

        await expect(
          fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
        ).rejects.toThrow('No properly formatted resource links found');
      });

      it('should reject content with too few resources', async () => {
        const mockMarkdown = `# Awesome Test

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        // Should succeed but log warnings - we don't fail on this
        expect(result).toBeDefined();
        expect(result.resources.length).toBe(1);
      });
    });

    describe('Markdown parsing', () => {
      it('should parse title from h1 heading', async () => {
        const mockMarkdown = `# Awesome Test List

A curated list of awesome test frameworks.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
- [Resource 2](https://github.com/user/repo2) - Description 2
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.title).toBe('Awesome Test List');
      });

      it('should parse description from first paragraph', async () => {
        const mockMarkdown = `# Awesome Test

A curated list of awesome test frameworks and tools for testing.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.description).toBe(
          'A curated list of awesome test frameworks and tools for testing.'
        );
      });

      it('should use default description when none found', async () => {
        const mockMarkdown = `# Awesome Go

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.description).toContain('Go frameworks, libraries and software');
      });

      it('should skip badges in description', async () => {
        const mockMarkdown = `# Awesome Test

[![Build Status](https://badge.svg)](https://example.com)

This is the real description.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.description).toBe('This is the real description.');
      });
    });

    describe('Resource extraction', () => {
      it('should extract basic resource information', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Test Resource](https://github.com/user/repo) - A test resource description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].title).toBe('Test Resource');
        expect(result.resources[0].url).toBe('https://github.com/user/repo');
        expect(result.resources[0].description).toBe('A test resource description');
        expect(result.resources[0].category).toBe('Category 1');
      });

      it('should skip table of contents items', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Contents

- [Category 1](#category-1)
- [Category 2](#category-2)

## Category 1

- [Real Resource](https://github.com/user/repo) - Real description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].title).toBe('Real Resource');
      });

      it('should skip internal anchor links', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Back to top](#top)
- [Real Resource](https://github.com/user/repo) - Real description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].title).toBe('Real Resource');
      });

      it('should skip Contributing and License sections', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1

## Contributing

- [Contribution Guide](https://github.com/user/guide) - How to contribute

## License

- [MIT License](https://opensource.org/licenses/MIT) - License info
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].title).toBe('Resource 1');
      });
    });

    describe('Category and subcategory handling', () => {
      it('should handle categories (h2 headings)', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Web Frameworks

- [Framework 1](https://github.com/user/repo1) - Description 1

## Database Tools

- [Tool 1](https://github.com/user/repo2) - Description 2
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(2);
        expect(result.resources[0].category).toBe('Web Frameworks');
        expect(result.resources[1].category).toBe('Database Tools');
      });

      it('should handle subcategories (h3 headings)', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Web Development

### Frontend Frameworks

- [React](https://github.com/facebook/react) - A JavaScript library

### Backend Frameworks

- [Express](https://github.com/expressjs/express) - Fast web framework
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(2);
        expect(result.resources[0].category).toBe('Web Development');
        expect(result.resources[0].subcategory).toBe('Frontend Frameworks');
        expect(result.resources[1].category).toBe('Web Development');
        expect(result.resources[1].subcategory).toBe('Backend Frameworks');
      });

      it('should add subcategory as a tag', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

### Subcategory 1

- [Resource 1](https://github.com/user/repo) - Description 1
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].tags).toContain('Subcategory 1');
      });
    });

    describe('Tag generation', () => {
      it('should add GitHub tag for GitHub URLs', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].tags).toContain('GitHub');
      });

      it('should add GitLab tag for GitLab URLs', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://gitlab.com/user/repo) - Description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].tags).toContain('GitLab');
      });

      it('should add Bitbucket tag for Bitbucket URLs', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://bitbucket.org/user/repo) - Description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].tags).toContain('Bitbucket');
      });
    });

    describe('Metadata extraction', () => {
      it('should extract license information', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description \`MIT\`
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].license).toBe('MIT');
      });

      it('should extract source code link', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://example.com) - Description [Source Code](https://github.com/user/repo)
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].sourceCode).toBe('https://github.com/user/repo');
      });

      it('should extract demo link', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description [Demo](https://demo.example.com)
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].demo).toBe('https://demo.example.com');
      });

      it('should extract language/platform', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description \`Python\` \`MIT\`
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].language).toBe('Python');
        expect(result.resources[0].license).toBe('MIT');
      });
    });

    describe('Text cleaning', () => {
      it('should remove markdown formatting from title', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [**Bold Title**](https://github.com/user/repo) - Description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].title).toBe('Bold Title');
      });

      it('should remove markdown links from description', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description with [link text](https://example.com)
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].description).toBe('Description with link text');
      });

      it('should remove code formatting from description', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description with \`code\` blocks
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        // Description should still contain 'code' but without backticks
        expect(result.resources[0].description).toContain('code');
        expect(result.resources[0].description).not.toContain('`');
      });

      it('should normalize whitespace', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description   with   extra    spaces
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources[0].description).toBe('Description with extra spaces');
      });
    });

    describe('Repository URL extraction', () => {
      it('should extract repo URL from raw URL', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource](https://github.com/user/repo) - Description
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/awesome-list/main/README.md'
        );

        expect(result.repoUrl).toBe('https://github.com/user/awesome-list');
      });
    });

    describe('Complex scenarios', () => {
      it('should handle a complete awesome list', async () => {
        const mockMarkdown = `# Awesome Testing

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

A curated list of awesome testing frameworks, tools, and resources.

## Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)

## Unit Testing

### JavaScript

- [Jest](https://github.com/facebook/jest) - Delightful JavaScript testing \`JavaScript\` \`MIT\`
- [Mocha](https://github.com/mochajs/mocha) - Simple, flexible testing framework \`JavaScript\`

### Python

- [pytest](https://github.com/pytest-dev/pytest) - Makes it easy to write small tests \`Python\` \`MIT\`

## Integration Testing

- [Selenium](https://github.com/SeleniumHQ/selenium) - Browser automation [Demo](https://selenium.dev)
- [Cypress](https://github.com/cypress-io/cypress) - Fast, easy testing [Source Code](https://github.com/cypress-io/cypress)

## Contributing

Contributions welcome!

## License

CC0 License
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/awesome-testing/main/README.md'
        );

        expect(result.title).toBe('Awesome Testing');
        expect(result.description).toContain('testing frameworks');
        expect(result.resources.length).toBeGreaterThanOrEqual(5);

        // Check Jest resource
        const jest = result.resources.find(r => r.title === 'Jest');
        expect(jest).toBeDefined();
        expect(jest?.category).toBe('Unit Testing');
        expect(jest?.subcategory).toBe('JavaScript');
        expect(jest?.license).toBe('MIT');
        expect(jest?.language).toBe('JavaScript');
        expect(jest?.tags).toContain('GitHub');
        expect(jest?.tags).toContain('JavaScript');

        // Check Selenium resource
        const selenium = result.resources.find(r => r.title === 'Selenium');
        expect(selenium).toBeDefined();
        expect(selenium?.category).toBe('Integration Testing');
        expect(selenium?.demo).toBe('https://selenium.dev');

        // Check Cypress resource
        const cypress = result.resources.find(r => r.title === 'Cypress');
        expect(cypress).toBeDefined();
        expect(cypress?.sourceCode).toBe('https://github.com/cypress-io/cypress');
      });

      it('should handle resources without subcategories', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
- [Resource 2](https://github.com/user/repo2) - Description 2

## Category 2

- [Resource 3](https://github.com/user/repo3) - Description 3
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        expect(result.resources).toHaveLength(3);
        expect(result.resources[0].subcategory).toBeUndefined();
        expect(result.resources[1].subcategory).toBeUndefined();
        expect(result.resources[2].subcategory).toBeUndefined();
      });

      it('should generate unique IDs for resources', async () => {
        const mockMarkdown = `# Awesome Test

Description here.

## Category 1

- [Resource 1](https://github.com/user/repo1) - Description 1
- [Resource 2](https://github.com/user/repo2) - Description 2
- [Resource 3](https://github.com/user/repo3) - Description 3
`;

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          text: async () => mockMarkdown,
        } as any);

        const result = await fetchAwesomeList(
          'https://raw.githubusercontent.com/user/repo/main/README.md'
        );

        const ids = result.resources.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });
});
