# Contributing Guide

Thank you for your interest in contributing to the Awesome Video Resource Viewer!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Set up the development environment (see [docs/SETUP.md](docs/SETUP.md))
4. Create a feature branch

## Development Workflow

### Before You Start

1. Check existing issues for related work
2. For major changes, open an issue first to discuss
3. Keep changes focused and atomic

### Code Standards

- **TypeScript**: All code must be TypeScript
- **Formatting**: Use default Prettier/ESLint settings
- **Components**: Follow existing shadcn/ui patterns
- **API Routes**: Follow RESTful conventions
- **Database**: Use Drizzle ORM, validate with Zod

### Naming Conventions

- Files: `kebab-case.ts` or `PascalCase.tsx` for components
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `camelCase` (Drizzle) → `snake_case` (PostgreSQL)

### Code Style

```typescript
// Use explicit types
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Prefer async/await over .then()
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// Destructure props
function Component({ title, onClick }: Props) {
  return <button onClick={onClick}>{title}</button>;
}
```

## Making Changes

### Frontend Changes

1. Components go in `client/src/components/`
2. Pages go in `client/src/pages/`
3. Use TanStack Query for data fetching
4. Style with Tailwind CSS
5. Use shadcn/ui components where applicable

### Backend Changes

1. Add routes in `server/routes.ts`
2. Add storage methods in `server/storage.ts`
3. Validate inputs with Zod schemas
4. Log errors to console
5. Return consistent error responses

### Database Changes

1. Update schema in `shared/schema.ts`
2. Run `npm run db:push` to apply
3. Update relevant storage methods
4. Test migrations thoroughly

### Adding Dependencies

1. Only add essential dependencies
2. Prefer smaller, focused packages
3. Check for security vulnerabilities
4. Document why dependency is needed

## Testing

### Manual Testing

1. Test all affected routes
2. Verify frontend displays correctly
3. Check mobile responsiveness
4. Test edge cases

### API Testing

```bash
# Test endpoints with curl
curl -X GET http://localhost:5000/api/resources
curl -X POST http://localhost:5000/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","url":"https://example.com"}'
```

### Validation Testing

```bash
# Test awesome-lint compliance
npx tsx scripts/test-awesome-lint.ts
```

## Pull Request Process

### Before Submitting

1. Run the development server and test changes
2. Ensure no TypeScript errors: `npx tsc --noEmit`
3. Test on mobile viewport sizes
4. Update documentation if needed

### PR Guidelines

1. Use descriptive title: `feat: add resource filtering by tag`
2. Reference related issues: `Fixes #123`
3. Describe what changed and why
4. Include screenshots for UI changes
5. Keep PRs focused (one feature/fix per PR)

### PR Title Format

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `style:` Formatting, missing semicolons, etc.
- `test:` Adding tests
- `chore:` Maintenance tasks

### Review Process

1. Maintainer reviews code
2. Address feedback in new commits
3. Squash commits if requested
4. Merge after approval

## Project Structure

See [docs/CODE-MAP.md](docs/CODE-MAP.md) for detailed codebase navigation.

## Documentation

- Update `replit.md` for major architectural changes
- Update `docs/API.md` for API changes
- Add JSDoc comments for complex functions
- Keep README.md accurate

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/environment info
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of feature
- Use case/problem it solves
- Proposed implementation (optional)
- Mockups if UI change (optional)

## Getting Help

- Check documentation in `/docs`
- Review existing issues
- Ask in discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing!
