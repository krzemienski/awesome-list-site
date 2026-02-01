# Development Guide

This guide covers code quality tooling, development workflows, and best practices for contributing to the Awesome Video Resource Viewer project.

## Table of Contents

- [Code Quality Tools](#code-quality-tools)
- [ESLint Configuration](#eslint-configuration)
- [Prettier Configuration](#prettier-configuration)
- [Available Commands](#available-commands)
- [Editor Integration](#editor-integration)
- [Pre-commit Workflow](#pre-commit-workflow)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Code Quality Tools

The project uses industry-standard tools to maintain code quality and consistency:

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | Static code analysis, bug detection, best practices | `eslint.config.js` |
| **Prettier** | Code formatting, style consistency | `.prettierrc` |
| **TypeScript** | Type checking, compile-time safety | `tsconfig.json` |

### Why These Tools?

- **ESLint** catches common bugs (unused variables, type misuse), enforces React best practices, and prevents anti-patterns
- **Prettier** eliminates formatting debates and ensures consistent code style across 90+ TypeScript files
- **TypeScript** provides type safety and better developer experience with autocomplete and refactoring support

## ESLint Configuration

### Overview

ESLint is configured with TypeScript-first, React-aware rules that catch errors before runtime.

**Configuration file:** `eslint.config.js`

### Rule Sets

The project uses the following rule sets:

1. **Base JavaScript** (`@eslint/js`)
   - Core JavaScript best practices
   - Common error prevention

2. **TypeScript** (`typescript-eslint`)
   - `recommendedTypeChecked`: Type-aware linting rules
   - `stylisticTypeChecked`: Stylistic TypeScript conventions

3. **React** (client-side only)
   - `eslint-plugin-react`: React best practices
   - `eslint-plugin-react-hooks`: Hook rules enforcement
   - `eslint-plugin-react-refresh`: Fast Refresh compatibility

4. **Prettier Integration**
   - `eslint-config-prettier`: Disables conflicting formatting rules

### File-Specific Rules

ESLint applies different rules based on file location:

```javascript
// Client-side React code (client/**/*.{ts,tsx})
- React component rules
- React Hooks rules (exhaustive deps, rules of hooks)
- React Refresh (only-export-components)

// Server-side code (server/**/*.ts)
- Node.js best practices
- No browser-specific APIs

// Shared code (shared/**/*.ts)
- Framework-agnostic rules
- Reusable type definitions

// Configuration files (*.config.{js,ts})
- Allow CommonJS require()
- Build tool compatibility
```

### Ignored Patterns

The following directories and files are excluded from linting:

```
node_modules/      # Dependencies
dist/              # Build output
build/             # Production builds
.auto-claude/      # Auto-Claude worktrees
**/*.test.ts       # Test files (future implementation)
**/*.test.tsx      # React test files (future implementation)
```

## Prettier Configuration

### Overview

Prettier enforces consistent code formatting with zero configuration needed after setup.

**Configuration file:** `.prettierrc`

### Formatting Rules

```json
{
  "semi": true,                    // Use semicolons
  "singleQuote": false,            // Use double quotes
  "trailingComma": "all",          // Trailing commas everywhere
  "tabWidth": 2,                   // 2-space indentation
  "printWidth": 100,               // Max line length: 100 characters
  "arrowParens": "always",         // Always use arrow function parens
  "endOfLine": "lf"                // Unix-style line endings
}
```

### Why These Settings?

- **Semicolons**: Explicit statement termination prevents ASI edge cases
- **Double quotes**: Consistent with JSON and HTML attributes
- **Trailing commas**: Cleaner git diffs when adding array/object items
- **100 char line width**: Balance readability and screen space
- **LF line endings**: Cross-platform compatibility (Git auto-converts on Windows)

### Ignored Files

See `.prettierignore` for the full list. Key exclusions:

- `node_modules/`, `dist/`, `build/` - Dependencies and build artifacts
- `package-lock.json`, `yarn.lock` - Lock files (don't format these)
- `.auto-claude/` - Auto-Claude worktrees and metadata
- `server/public/` - Static assets
- OS and IDE files (`.DS_Store`, `.vscode/`)

## Available Commands

### Linting

```bash
# Run ESLint on all files
npm run lint

# Auto-fix ESLint errors (when possible)
npm run lint -- --fix
```

**What it checks:**
- TypeScript type errors in context
- React component best practices
- Hook dependency arrays
- Unused variables and imports
- Dangerous patterns (e.g., `any` types)

**Exit codes:**
- `0` - No errors or warnings
- `1` - Linting errors found

### Formatting

```bash
# Format all files with Prettier
npm run format

# Check formatting without making changes
npm run format:check
```

**What it formats:**
- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`)
- JSON files (`package.json`, `tsconfig.json`)
- Markdown files (`.md`)
- Configuration files

**Exit codes:**
- `0` - All files properly formatted
- `1` - Formatting issues found (use `npm run format` to fix)

### Type Checking

```bash
# Run TypeScript type checker
npm run type-check
```

**What it checks:**
- Type errors across the entire codebase
- Missing or incorrect type annotations
- Interface/type compatibility
- Import/export correctness

**Exit codes:**
- `0` - No type errors
- `2` - Type errors found

### Combined Quality Check

Run all quality checks before committing:

```bash
npm run lint && npm run format:check && npm run type-check
```

## Editor Integration

### Visual Studio Code

**Recommended extensions:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",           // ESLint integration
    "esbenp.prettier-vscode",           // Prettier integration
    "bradlc.vscode-tailwindcss"         // Tailwind CSS IntelliSense
  ]
}
```

**Workspace settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

**What this does:**
- Automatically formats files on save with Prettier
- Auto-fixes ESLint errors on save (when possible)
- Shows inline ESLint warnings and errors
- Provides quick-fix suggestions

### Other Editors

**WebStorm / IntelliJ IDEA:**
- ESLint: `Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint`
- Prettier: `Settings → Languages & Frameworks → JavaScript → Prettier`
- Enable "Run eslint --fix on save"
- Enable "On save" for Prettier

**Vim / Neovim:**
- Use [ALE](https://github.com/dense-analysis/ale) or [coc-eslint](https://github.com/neoclide/coc-eslint)
- Configure Prettier with [vim-prettier](https://github.com/prettier/vim-prettier)

**Sublime Text:**
- Install [ESLint](https://packagecontrol.io/packages/ESLint) package
- Install [JsPrettier](https://packagecontrol.io/packages/JsPrettier) package

## Pre-commit Workflow

### Manual Pre-commit Checklist

Before committing code, run:

```bash
# 1. Format all files
npm run format

# 2. Lint and auto-fix
npm run lint -- --fix

# 3. Type check
npm run type-check

# 4. Build check (ensure no build errors)
npm run build
```

### Automated Pre-commit Hooks (Optional)

You can set up Git hooks using [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged):

```bash
# Install dependencies
npm install --save-dev husky lint-staged

# Initialize husky
npx husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

**Configure lint-staged** in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Benefits:**
- Prevents committing code with linting errors
- Automatically formats staged files
- Runs only on changed files (fast)

## CI/CD Integration

### GitHub Actions

**Example workflow** (`.github/workflows/quality-check.yml`):

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build
```

**Benefits:**
- Catches errors before merging PRs
- Enforces code quality standards
- Prevents broken builds from reaching production

## Troubleshooting

### Common Issues

#### ESLint Error: "Parsing error: Cannot read file 'tsconfig.json'"

**Solution:**
Ensure `tsconfig.json` exists in the project root and is valid JSON.

```bash
# Validate tsconfig.json
npx tsc --showConfig
```

#### ESLint Warning: "Missing dependency in React Hook useEffect"

**Solution:**
Add all dependencies to the dependency array:

```typescript
// ❌ Wrong
useEffect(() => {
  fetchData(userId);
}, []);

// ✅ Correct
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

#### Prettier vs ESLint Conflicts

**Solution:**
This shouldn't happen with `eslint-config-prettier`, but if it does:

```bash
# Check for conflicting rules
npx eslint-config-prettier 'client/**/*.tsx'
```

#### Files Not Being Formatted

**Solution:**
Check if files are in `.prettierignore`:

```bash
# Test if file is ignored
npx prettier --check path/to/file.ts
```

#### Type Checking Takes Too Long

**Solution:**
TypeScript uses project references for performance. If slow:

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo

# Rebuild
npm run type-check
```

### Performance Tips

**Speed up linting:**

```bash
# Lint only changed files (Git)
git diff --name-only --cached | grep '\\.tsx\\?$' | xargs npm run lint --

# Lint specific directory
npm run lint -- client/src/components
```

**Speed up formatting:**

```bash
# Format only changed files (Git)
git diff --name-only --cached | xargs npm run format --

# Format specific directory
npm run format -- client/src/pages
```

### Getting Help

If you encounter issues not covered here:

1. **Check ESLint output:** ESLint provides helpful error messages with rule names
2. **Search rule documentation:** Visit [ESLint rules](https://eslint.org/docs/rules/) or [typescript-eslint](https://typescript-eslint.io/rules/)
3. **Open an issue:** Create a GitHub issue with the error message and reproduction steps

## Related Documentation

- [SETUP.md](docs/SETUP.md) - Development environment setup
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and design
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CODE-MAP.md](docs/CODE-MAP.md) - Codebase navigation guide

---

**Last Updated:** 2024-01-31
**ESLint Version:** 9.17.0
**Prettier Version:** 3.8.1
**TypeScript Version:** 5.6.3
