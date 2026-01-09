# Contributing to Bakery

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [mise](https://mise.jdx.dev/) - Tool version manager

### Setup

Clone the repository and set up the development environment:

```bash
git clone https://github.com/jvalentini/bakery.git
cd bakery
make setup
```

## Development Setup

Install dependencies and verify the setup:

```bash
make install
```

This installs all project dependencies via Bun.

## Development Workflow

### Code Quality Checks

Run all checks before committing:

```bash
make check
```

This runs TypeScript type checking, Biome linting, and Oxlint.

### Testing

Run the test suite:

```bash
make test
```

For continuous testing during development:

```bash
make test-watch
```

### Fixing Issues

Auto-fix linting issues where possible:

```bash
make lint
```

## Code Style

Bakery uses Biome for formatting and linting, with Oxlint for additional TypeScript checks. Lefthook manages git hooks that run checks automatically.

- 2-space indentation
- Single quotes
- Semicolons always
- 100 character line width

Biome automatically formats code on commit via Lefthook.

## Commit Messages

Use conventional commits validated by commitlint:

```
type(scope): description
```

Common types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `test`: Test changes
- `chore`: Maintenance

Examples:
```bash
git commit -m "feat(cli): add new archetype option"
git commit -m "fix(generator): handle special characters in names"
git commit -m "test: add coverage for template rendering"
```

## Pull Request Process

1. Create a feature branch from main
2. Make changes following the development workflow
3. Ensure all checks pass: `make check && make test`
4. Push to your fork and create a pull request
5. PR should include:
   - Clear description of changes
   - Related issues (if any)
   - Test coverage for new features

## Testing Requirements

- All new features must include unit tests
- Integration tests required for template generation workflows
- Maintain 80% code coverage minimum
- Run `make test-coverage` to check coverage

Use Bun's test framework:

```typescript
import { describe, expect, it } from 'bun:test';

describe('myFeature', () => {
  it('should work correctly', () => {
    expect(result).toBe(expected);
  });
});
```</content>
<parameter name="filePath">/home/justin/code/bakery/CONTRIBUTING.md