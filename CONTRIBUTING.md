# Contributing to Awesome Video Resource Viewer

Thank you for your interest in contributing to the Awesome Video Resource Viewer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Code Quality Standards](#code-quality-standards)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: For version control

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/awesome-list-site.git
   cd awesome-list-site
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Verify the setup**: Open http://localhost:5000 in your browser

## Development Workflow

### Creating a New Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/` - for new features
- `fix/` - for bug fixes
- `docs/` - for documentation updates
- `refactor/` - for code refactoring
- `test/` - for adding or updating tests

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests for your changes
3. Ensure all tests pass
4. Commit your changes with clear, descriptive messages

### Committing Your Changes

Follow conventional commit message format:

```bash
git commit -m "type: brief description

Detailed explanation of what changed and why."
```

**Commit types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Code style changes (formatting, etc.)
- `chore`: Maintenance tasks

## Testing Guidelines

Testing is a critical part of our development process. All contributions must include appropriate tests and pass all existing tests.

### Test Structure

Our test suite uses:
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation

Tests are located alongside the code they test:
```
├── client/src/
│   ├── components/
│   │   ├── MyComponent.tsx
│   │   └── MyComponent.test.tsx
│   ├── hooks/
│   │   ├── useMyHook.ts
│   │   └── useMyHook.test.ts
```

### Running Tests

**Watch mode** (recommended during development):
```bash
npm test
```

This runs tests in watch mode, automatically re-running when files change.

**Single run** (for CI/CD and final verification):
```bash
npm run test:run
```

**Run tests with coverage**:
```bash
npm run test:run -- --coverage
```

### Writing Tests

#### Component Tests

When testing React components, follow these guidelines:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button', { name: /click me/i }));
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

**Best practices for component tests**:
- Use `screen` queries instead of destructuring from `render()`
- Prefer `getByRole` and `getByLabelText` over `getByTestId`
- Test user behavior, not implementation details
- Use `describe` blocks to group related tests
- Write descriptive test names that explain what is being tested

#### Hook Tests

For custom hooks:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('updates state correctly', async () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue(newValue);
    });

    await waitFor(() => {
      expect(result.current.value).toBe(newValue);
    });
  });
});
```

#### Utility Function Tests

For pure functions and utilities:

```typescript
import { describe, it, expect } from 'vitest';
import { myUtilityFunction } from './myUtility';

describe('myUtilityFunction', () => {
  it('returns expected output for valid input', () => {
    expect(myUtilityFunction(input)).toBe(expectedOutput);
  });

  it('handles edge cases', () => {
    expect(myUtilityFunction(null)).toBe(defaultValue);
    expect(myUtilityFunction(undefined)).toBe(defaultValue);
  });

  it('throws error for invalid input', () => {
    expect(() => myUtilityFunction(invalidInput)).toThrow();
  });
});
```

### Test Coverage Guidelines

We strive for high test coverage, but focus on meaningful tests:

- **Aim for 80%+ coverage** for critical code paths
- **Test edge cases** and error conditions
- **Test user interactions** and component integration
- **Test business logic** thoroughly

Coverage is not a goal in itself - focus on testing behavior and user experience.

### What to Test

✅ **Do test**:
- User interactions and workflows
- Component rendering and state changes
- API integration and data fetching
- Error handling and edge cases
- Business logic and calculations
- Custom hooks functionality
- Utility functions

❌ **Don't test**:
- Third-party library internals
- Implementation details (e.g., state variable names)
- CSS styles (use visual regression testing instead)
- Trivial code (e.g., simple getters/setters)

### Debugging Tests

If tests fail:

1. **Run tests in watch mode** to see detailed output:
   ```bash
   npm test
   ```

2. **Add debug statements**:
   ```typescript
   import { screen } from '@testing-library/react';
   screen.debug(); // Prints current DOM
   ```

3. **Check console output** for warnings and errors

4. **Use Vitest UI** for visual debugging:
   ```bash
   npm run test:ui
   ```

## Code Quality Standards

### Type Checking

Run TypeScript type checking before submitting:

```bash
npm run check
```

Fix all type errors. Do not use `@ts-ignore` without a good reason and explanation.

### Linting

Run ESLint to check code style:

```bash
npm run lint
```

Fix all linting errors and warnings.

### Running All Checks

Before submitting a PR, run all quality checks:

```bash
npm run check && npm run lint && npm run test:run
```

All checks must pass for your PR to be merged.

### Code Formatting

- Use **2 spaces** for indentation
- Use **single quotes** for strings (except in JSX)
- Add **semicolons** at the end of statements
- Use **trailing commas** in multi-line objects and arrays
- Keep lines under **100 characters** when possible

### No Debug Code

Before committing:
- Remove all `console.log()` statements
- Remove all `debugger` statements
- Remove commented-out code
- Remove unused imports and variables

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm run test:run`)
2. ✅ Type checking passes (`npm run check`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Code is properly formatted
5. ✅ No debug code remains
6. ✅ Documentation is updated if needed

### Submitting Your PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Clear description of changes
   - Why the changes are needed
   - How to test the changes
   - Screenshots (for UI changes)
   - Related issues

4. **Wait for CI checks** to pass

5. **Respond to review feedback** promptly

### PR Title Format

Use conventional commit format:

```
type: brief description of changes
```

Examples:
- `feat: add search filtering by category`
- `fix: resolve mobile navigation issue`
- `test: add tests for analytics dashboard`

### Review Process

- PRs require at least one approval
- All CI checks must pass
- Address all review comments
- Maintain a respectful and constructive tone

## Code Style Guidelines

### React Components

- Use **functional components** with hooks
- Use **TypeScript** for all components
- Export components as named exports
- Use **props destructuring** in function parameters
- Group related props using interfaces

```typescript
interface MyComponentProps {
  title: string;
  onClick: () => void;
  isActive?: boolean;
}

export function MyComponent({ title, onClick, isActive = false }: MyComponentProps) {
  // Component implementation
}
```

### File Organization

- One component per file
- Related components can be grouped in folders
- Index files for clean imports
- Test files alongside source files

### Naming Conventions

- **Components**: PascalCase (e.g., `ResourceCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useResources.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RESULTS`)
- **Types/Interfaces**: PascalCase (e.g., `ResourceType`)

### Import Order

1. React and external libraries
2. Internal components and hooks
3. Utilities and helpers
4. Types and interfaces
5. Styles and assets

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { ResourceCard } from './ResourceCard';
import { useResources } from '@/hooks/useResources';

import { formatDate } from '@/lib/utils';

import type { Resource } from '@/types';
```

## Questions or Need Help?

- Open an issue for bugs or feature requests
- Check existing issues and PRs first
- Be respectful and constructive in all interactions

Thank you for contributing! 🎉
