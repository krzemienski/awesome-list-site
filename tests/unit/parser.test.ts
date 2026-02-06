/**
 * Unit Tests for parser.ts
 *
 * Tests the markdown parsing logic for awesome lists including:
 * - URL validation
 * - Markdown structure validation
 * - Resource extraction
 * - Metadata extraction
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAwesomeList } from '../../server/parser';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

describe('Parser - URL Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject non-GitHub/GitLab URLs', async () => {
    await expect(
      fetchAwesomeList('https://example.com/README.md')
    ).rejects.toThrow('URL should be a raw GitHub/GitLab URL');
  });

  it('should reject regular GitHub URLs (not raw)', async () => {
    await expect(
      fetchAwesomeList('https://github.com/user/repo/blob/main/README.md')
    ).rejects.toThrow('Please use the raw GitHub URL');
  });

  it('should reject invalid URL formats', async () => {
    await expect(
      fetchAwesomeList('not-a-url')
    ).rejects.toThrow('Invalid URL format');
  });

  it('should accept raw GitHub URLs', async () => {
    const validUrl = 'https://raw.githubusercontent.com/user/repo/main/README.md';

    const markdown = `# Awesome Test

A description of the awesome test list for testing purposes.

## Contents

- [Category](#category)

## Category

- [Resource 1](https://example.com/1) - Description 1
- [Resource 2](https://example.com/2) - Description 2
- [Resource 3](https://example.com/3) - Description 3
- [Resource 4](https://example.com/4) - Description 4
- [Resource 5](https://example.com/5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList(validUrl);
    expect(result).toBeDefined();
    expect(result.resources.length).toBeGreaterThan(0);
  });

  it('should accept raw GitLab URLs', async () => {
    const validUrl = 'https://gitlab.com/user/repo/-/raw/main/README.md';

    const markdown = `# Awesome Test

A description of the awesome test list for testing purposes.

## Contents

- [Category](#category)

## Category

- [Resource 1](https://example.com/1) - Description 1
- [Resource 2](https://example.com/2) - Description 2
- [Resource 3](https://example.com/3) - Description 3
- [Resource 4](https://example.com/4) - Description 4
- [Resource 5](https://example.com/5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList(validUrl);
    expect(result).toBeDefined();
  });
});

describe('Parser - Network Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('File not found');
  });

  it('should handle 403 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Access forbidden');
  });

  it('should handle 429 rate limit errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('should handle 500 server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Server error on GitHub/GitLab');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Network error');
  });

  it('should handle timeout errors', async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }));

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Request timeout');
  });

  it('should handle empty content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('Empty file');
  });
});

describe('Parser - Markdown Structure Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject markdown without headings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'Just some text without headings or lists',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('No category headings found');
  });

  it('should reject markdown without list items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '## Category\n\nNo list items here',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('No properly formatted resource links found');
  });

  it('should reject very short content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '## Cat\n\n- [A](http://a.com) - Desc',
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('No valid resources found');
  });

  it('should warn about few resources', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const content = `# Awesome List

A description of the list with enough text to pass the length check but not many resources.

## Contents

- [Category One](#category-one)

## Category One

- [Resource 1](https://github.com/user/repo1) - Description 1
- [Resource 2](https://example.com/repo2) - Description 2
- [Resource 3](https://gitlab.com/user/repo3) - Description 3
- [Resource 4](https://example.com/repo4) - Description 4
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => content,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    // Check that warning was logged (expects < 5 resources)
    const logs = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');
    expect(logs).toContain('Warning');

    consoleLogSpy.mockRestore();
  });
});

describe('Parser - Basic Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse a simple awesome list', async () => {
    const markdown = `# Awesome Test

A curated list of awesome test resources.

## Contents

- [Category 1](#category-1)
- [Category 2](#category-2)

## Category 1

- [Resource 1](https://github.com/user/repo1) - A great resource for testing
- [Resource 2](https://example.com/repo2) - Another resource

## Category 2

- [Resource 3](https://gitlab.com/user/repo3) - A GitLab resource
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.title).toBe('Awesome Test');
    expect(result.description).toBe('A curated list of awesome test resources.');
    expect(result.repoUrl).toBe('https://github.com/user/repo');
    expect(result.resources).toHaveLength(3);
  });

  it('should extract resource properties correctly', async () => {
    const markdown = `# Awesome Go

A curated list of awesome Go resources for testing.

## Contents

- [Database](#database)

## Database

- [PostgreSQL Driver](https://github.com/lib/pq) - Pure Go Postgres driver for database/sql
- [MySQL Driver](https://github.com/go-sql-driver/mysql) - MySQL driver
- [SQLite Driver](https://github.com/mattn/go-sqlite3) - SQLite driver
- [Redis Client](https://github.com/go-redis/redis) - Redis client
- [MongoDB Driver](https://github.com/mongodb/mongo-go-driver) - MongoDB driver
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(1);

    const resource = result.resources.find(r => r.title === 'PostgreSQL Driver');
    expect(resource).toBeDefined();
    expect(resource?.url).toBe('https://github.com/lib/pq');
    expect(resource?.description).toBe('Pure Go Postgres driver for database/sql');
    expect(resource?.category).toBe('Database');
    expect(resource?.id).toBeDefined();
    expect(resource?.tags).toContain('GitHub');
  });

  it('should skip table of contents links', async () => {
    const markdown = `# Awesome List

## Contents

- [Category 1](#category-1)
- [Category 2](#category-2)
- [Back to top](#awesome-list)

## Category 1

- [Real Resource](https://github.com/user/repo) - This should be included
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].title).toBe('Real Resource');
  });

  it('should skip internal anchor links', async () => {
    const markdown = `# Awesome List

A description for the awesome list with sufficient length for validation.

## Contents

- [Category](#category)

## Category

- [Valid Resource](https://github.com/user/repo) - Description
- [Internal Link](#section) - Should be skipped
- [Resource 2](https://github.com/user/repo2) - Description 2
- [Resource 3](https://github.com/user/repo3) - Description 3
- [Resource 4](https://github.com/user/repo4) - Description 4
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(4);
    expect(result.resources.find(r => r.url === 'https://github.com/user/repo')).toBeDefined();
    expect(result.resources.find(r => r.url.startsWith('#'))).toBeUndefined();
  });
});

describe('Parser - Category and Subcategory Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle categories and subcategories', async () => {
    const markdown = `# Awesome Test

A curated list of awesome web frameworks and tools for testing purposes.

## Contents

- [Web Frameworks](#web-frameworks)

## Web Frameworks

### Frontend

- [React](https://github.com/facebook/react) - A JavaScript library
- [Vue](https://github.com/vuejs/vue) - Progressive framework
- [Angular](https://github.com/angular/angular) - Platform for building mobile and desktop

### Backend

- [Express](https://github.com/expressjs/express) - Fast, unopinionated web framework
- [Koa](https://github.com/koajs/koa) - Next generation web framework
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(3);

    const react = result.resources.find(r => r.title === 'React');
    expect(react?.category).toBe('Web Frameworks');
    expect(react?.subcategory).toBe('Frontend');
    expect(react?.tags).toContain('Frontend');

    const express = result.resources.find(r => r.title === 'Express');
    expect(express?.category).toBe('Web Frameworks');
    expect(express?.subcategory).toBe('Backend');
    expect(express?.tags).toContain('Backend');
  });

  it('should skip Contributing and License sections', async () => {
    const markdown = `# Awesome Test

A curated list of awesome libraries for testing purposes.

## Contents

- [Libraries](#libraries)

## Libraries

- [Library 1](https://github.com/user/lib1) - A library
- [Library 2](https://github.com/user/lib2) - Another library
- [Library 3](https://github.com/user/lib3) - Third library
- [Library 4](https://github.com/user/lib4) - Fourth library
- [Library 5](https://github.com/user/lib5) - Fifth library

## Contributing

- [Contribution Guide](https://github.com/user/repo/CONTRIBUTING.md) - Should be skipped

## License

- [MIT](https://opensource.org/licenses/MIT) - Should be skipped
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(5);
    expect(result.resources.find(r => r.title === 'Library 1')).toBeDefined();
    expect(result.resources.find(r => r.title.includes('Contribution'))).toBeUndefined();
  });
});

describe('Parser - Tag Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should tag GitHub repositories', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [GitHub Tool](https://github.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const githubTool = result.resources.find(r => r.title === 'GitHub Tool');
    expect(githubTool?.tags).toContain('GitHub');
  });

  it('should tag GitLab repositories', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [GitLab Tool](https://gitlab.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const gitlabTool = result.resources.find(r => r.title === 'GitLab Tool');
    expect(gitlabTool?.tags).toContain('GitLab');
  });

  it('should tag Bitbucket repositories', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Bitbucket Tool](https://bitbucket.org/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const bitbucketTool = result.resources.find(r => r.title === 'Bitbucket Tool');
    expect(bitbucketTool?.tags).toContain('Bitbucket');
  });

  it('should include subcategory as tag', async () => {
    const markdown = `# Awesome Test

A curated list of awesome frameworks for testing purposes.

## Contents

- [Frameworks](#frameworks)

## Frameworks

### Web

- [Tool](https://github.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.tags).toContain('Web');
    expect(tool?.tags).toContain('GitHub');
  });
});

describe('Parser - Metadata Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract license information', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - Description \`MIT\`
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.license).toBe('MIT');
  });

  it('should extract language information', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - Description \`MIT\` \`Go\`
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.language).toBe('Go');
  });

  it('should handle source code metadata in description', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://example.com) - Description Source Code GitHub
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Source Code');
  });

  it('should handle demo information in description', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - Description with Demo available
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Demo');
  });

  it('should extract license and language together', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - Description \`MIT\` \`Python\`
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.license).toBe('MIT');
    expect(tool?.language).toBe('Python');
  });
});

describe('Parser - Text Cleaning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clean markdown formatting from descriptions', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - **Bold** and *italic* and \`code\` and [link](https://example.com) text
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.description).toBe('Bold and italic and code and link text');
  });

  it('should clean markdown formatting from titles', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [**Bold Tool**](https://github.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Bold Tool');
    expect(tool?.title).toBe('Bold Tool');
  });

  it('should normalize whitespace', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo) - Description   with    extra     spaces
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.description).toBe('Description with extra spaces');
  });
});

describe('Parser - Title and Description Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract title from h1 heading with "Awesome"', async () => {
    const markdown = `# Awesome Python

A curated list of Python resources for testing purposes.

## Contents

- [Libraries](#libraries)

## Libraries

- [Library](https://github.com/user/lib) - Description
- [Library 2](https://github.com/user/lib2) - Description 2
- [Library 3](https://github.com/user/lib3) - Description 3
- [Library 4](https://github.com/user/lib4) - Description 4
- [Library 5](https://github.com/user/lib5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.title).toBe('Awesome Python');
  });

  it('should extract custom description', async () => {
    const markdown = `# Awesome Go

This is a custom description for the awesome Go list.

## Contents

- [Libraries](#libraries)

## Libraries

- [Library](https://github.com/user/lib) - Description
- [Library 2](https://github.com/user/lib2) - Description 2
- [Library 3](https://github.com/user/lib3) - Description 3
- [Library 4](https://github.com/user/lib4) - Description 4
- [Library 5](https://github.com/user/lib5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.description).toBe('This is a custom description for the awesome Go list.');
  });

  it('should skip badges in description extraction', async () => {
    const markdown = `# Awesome Test

[![Build Status](https://travis-ci.org/user/repo.svg)](https://travis-ci.org/user/repo)

This is the real description.

## Contents

- [Libraries](#libraries)

## Libraries

- [Library](https://github.com/user/lib) - Description
- [Library 2](https://github.com/user/lib2) - Description 2
- [Library 3](https://github.com/user/lib3) - Description 3
- [Library 4](https://github.com/user/lib4) - Description 4
- [Library 5](https://github.com/user/lib5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.description).toBe('This is the real description.');
  });

  it('should extract or generate a description for the list', async () => {
    const markdown = `# Awesome Go

[![Build Badge](https://example.com/badge.svg)]

## Contents

- [Libraries](#libraries)

## Libraries

- [Library](https://github.com/user/lib) - A library for testing
- [Library 2](https://github.com/user/lib2) - Description 2
- [Library 3](https://github.com/user/lib3) - Description 3
- [Library 4](https://github.com/user/lib4) - Description 4
- [Library 5](https://github.com/user/lib5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    // Should have some description (either extracted or default)
    expect(result.description).toBeDefined();
    expect(result.description.length).toBeGreaterThan(0);
  });

  it('should generate default description for generic titles', async () => {
    const markdown = `# Awesome Machine Learning

[![Build Status](https://example.com/status)]

## Contents

- [Libraries](#libraries)

## Libraries

- [Library](https://github.com/user/lib) - A machine learning library
- [Library 2](https://github.com/user/lib2) - Description 2
- [Library 3](https://github.com/user/lib3) - Description 3
- [Library 4](https://github.com/user/lib4) - Description 4
- [Library 5](https://github.com/user/lib5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    // Description should contain machine learning content (case-insensitive)
    expect(result.description.toLowerCase()).toContain('machine learning');
    expect(result.description).toBeDefined();
  });
});

describe('Parser - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle resources without descriptions', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Tool](https://github.com/user/repo)
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(5);
    const tool = result.resources.find(r => r.title === 'Tool');
    expect(tool?.description).toBe('');
  });

  it('should handle multiple links in one list item', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- [Main Tool](https://github.com/user/repo) - Description [Website](https://example.com) [Docs](https://docs.example.com)
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const mainTool = result.resources.find(r => r.title === 'Main Tool');
    expect(mainTool?.url).toBe('https://github.com/user/repo');
    expect(mainTool?.title).toBe('Main Tool');
  });

  it('should handle empty categories', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Empty Category](#empty-category)
- [Non-Empty Category](#non-empty-category)

## Empty Category

## Non-Empty Category

- [Tool](https://github.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(5);
  });

  it('should filter out resources without URLs', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Tools](#tools)

## Tools

- Tool without link - Description
- [Tool with link](https://github.com/user/repo) - Description
- [Tool 2](https://github.com/user/repo2) - Description 2
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    expect(result.resources.length).toBeGreaterThanOrEqual(5);
    const toolWithLink = result.resources.find(r => r.title === 'Tool with link');
    expect(toolWithLink).toBeDefined();
  });

  it('should handle complex markdown with nested lists', async () => {
    const markdown = `# Awesome Test

A curated list of awesome tools for testing purposes.

## Contents

- [Category](#category)

## Category

- [Parent](https://github.com/user/parent) - Parent description
  - Nested item 1
  - Nested item 2
- [Another](https://github.com/user/another) - Another description
- [Tool 3](https://github.com/user/repo3) - Description 3
- [Tool 4](https://github.com/user/repo4) - Description 4
- [Tool 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    // Should extract main items, behavior with nested items depends on parser
    expect(result.resources.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Parser - Real-World Examples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse a realistic awesome list', async () => {
    const markdown = `# Awesome Go

[![Build Status](https://travis-ci.org/avelino/awesome-go.svg?branch=main)](https://travis-ci.org/avelino/awesome-go)

A curated list of awesome Go frameworks, libraries and software.

## Contents

- [Audio and Music](#audio-and-music)
- [Database Drivers](#database-drivers)

## Audio and Music

*Libraries for manipulating audio.*

- [Oto](https://github.com/hajimehoshi/oto) - A low-level library to play sound on multiple platforms. \`Go\`
- [PortAudio](https://github.com/gordonklaus/portaudio) - Go bindings for the PortAudio audio I/O library. \`MIT\` \`Go\`

## Database Drivers

*Libraries for connecting and operating databases.*

### Relational Database Drivers

- [go-sql-driver/mysql](https://github.com/go-sql-driver/mysql) - MySQL driver for Go. \`MPL-2.0\`
- [pq](https://github.com/lib/pq) - Pure Go Postgres driver for database/sql. \`MIT\`

### NoSQL Database Drivers

- [mongo-go-driver](https://github.com/mongodb/mongo-go-driver) - Official MongoDB driver for Go. [Source Code](https://github.com/mongodb/mongo-go-driver) [Demo](https://demo.mongodb.com)

## Contributing

Please see [CONTRIBUTING](https://github.com/avelino/awesome-go/blob/main/CONTRIBUTING.md).

## License

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    const result = await fetchAwesomeList('https://raw.githubusercontent.com/user/awesome-go/main/README.md');

    expect(result.title).toBe('Awesome Go');
    expect(result.description).toContain('Go frameworks');
    expect(result.resources.length).toBeGreaterThan(0);

    // Check categorization
    const audioResources = result.resources.filter(r => r.category === 'Audio and Music');
    expect(audioResources.length).toBeGreaterThan(0);

    const dbResources = result.resources.filter(r => r.category === 'Database Drivers');
    expect(dbResources.length).toBeGreaterThan(0);

    // Check subcategorization
    const relationalDrivers = result.resources.filter(r => r.subcategory === 'Relational Database Drivers');
    expect(relationalDrivers.length).toBeGreaterThan(0);

    // Check that mongo driver is found
    const mongoDriver = result.resources.find(r => r.title === 'mongo-go-driver');
    expect(mongoDriver).toBeDefined();
    expect(mongoDriver?.category).toBe('Database Drivers');

    // Check license extraction
    const pqDriver = result.resources.find(r => r.title === 'pq');
    expect(pqDriver?.license).toBe('MIT');
  });

  it('should reject parsing when no resources are extracted', async () => {
    const markdown = `# Not An Awesome List

Just some random content without proper structure.

Some paragraphs here and there.

No actual resources or proper markdown list format.
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    await expect(
      fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md')
    ).rejects.toThrow('No properly formatted resource links found');
  });
});

describe('Parser - Performance and Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log parsing statistics', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const markdown = `# Awesome Test

A description for the awesome list with sufficient content for validation.

## Contents

- [Category 1](#category-1)
- [Category 2](#category-2)

## Category 1

- [GitHub Resource](https://github.com/user/repo1) - Description 1
- [GitLab Resource](https://gitlab.com/user/repo2) - Description 2
- [Resource 3](https://github.com/user/repo3) - Description 3

## Category 2

- [Another Resource](https://github.com/user/repo4) - Description 4
- [Website](https://example.com) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const logs = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');

    expect(logs).toContain('Fetching awesome list from');
    expect(logs).toContain('Content fetched successfully');
    expect(logs).toContain('Parsed');
    expect(logs).toContain('resources');
    expect(logs).toContain('Successfully parsed awesome list');
    expect(logs).toContain('categories');

    consoleLogSpy.mockRestore();
  });

  it('should measure and log parse time', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const markdown = `# Awesome Test

A description for the awesome list with sufficient content for validation.

## Contents

- [Category](#category)

## Category

- [Resource](https://github.com/user/repo) - Description
- [Resource 2](https://github.com/user/repo2) - Description 2
- [Resource 3](https://github.com/user/repo3) - Description 3
- [Resource 4](https://github.com/user/repo4) - Description 4
- [Resource 5](https://github.com/user/repo5) - Description 5
`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => markdown,
    } as any);

    await fetchAwesomeList('https://raw.githubusercontent.com/user/repo/main/README.md');

    const logs = consoleLogSpy.mock.calls.map(call => call[0]).join(' ');
    expect(logs).toMatch(/Parsing completed in \d+\.\d+s/);

    consoleLogSpy.mockRestore();
  });
});
