# Bakery

Bake fresh projects from recipes - a modular project scaffolder with best-in-class tooling pre-configured.

## Why?

Starting a new project means hours of setup: configuring TypeScript, choosing a linter, setting up formatters, writing CI pipelines, configuring Docker, creating Makefiles. This tool eliminates that friction.

Run one command, answer a few questions, and get a production-ready project with modern tooling.

## Archetypes

Bakery offers multiple project archetypes (recipes):

| Archetype | Description |
|-----------|-------------|
| **CLI Tool** | Command-line applications |
| **REST API** | Backend with Hono/Express/Elysia |
| **Full-Stack** | Monorepo with API + Web |
| **Effect CLI/API** | Effect-ts patterns for backend/CLI |
| **Effect Full-Stack** | Effect + Convex + TanStack Start |

## Quick Start

```bash
# Run the interactive wizard
bakery

# Or specify output directory
bakery -o ./my-project
```

### Interactive Wizard

```
🥐 Bakery

📦 Project Type

  → 1. CLI Tool - Command-line applications
    2. REST API - Backend with Hono/Express/Elysia
    3. Full-Stack - Monorepo with API + Web
    4. Effect CLI/API - Effect-ts patterns
    5. Effect Full-Stack - Effect + Convex + TanStack

📦 Project Details

Project name (e.g., my-awesome-app): my-tool
Description: A tool that does useful things
Author name: Your Name

🛠️  Features

Include Docker support? [Y/n]: y
Include GitHub Actions CI? [Y/n]: y

✓ Project created successfully!
```

## What You Get

Every project includes:

- **TypeScript + Bun** for fast development and execution
- **Biome + Oxlint** for comprehensive linting and formatting
- **Lefthook** for git hooks that catch issues before commit
- **Makefile** for consistent commands across humans and AI agents

Optional addons:
- **Docker** for containerized development
- **GitHub Actions** for CI/CD and binary releases
- **Convex** for real-time database
- **TanStack Query/Router/Form** for web apps
- **TypeDoc** for API documentation
- **Trivy** for security scanning

## Framework Choices

### Web Frameworks
- React (Vite)
- Next.js
- Vue
- TanStack Start

### API Frameworks
- Hono (lightweight, fast, great with Bun)
- Express (battle-tested, huge ecosystem)
- Elysia (Bun-native, TypeScript-first)

## Commands

Every generated project uses the same Makefile interface:

```bash
make install      # Install dependencies
make dev          # Run in development mode
make check        # Run typecheck + lint + oxlint
make test         # Run tests
make build        # Build to dist/
make build-binary # Build native binary (CLI projects)
```

## Tooling

### Bun

**What**: JavaScript/TypeScript runtime and package manager.

**Why**: 4x faster than Node.js, built-in TypeScript support, fast package installs, native binary compilation.

### Biome

**What**: Linter and formatter in one tool.

**Why**: Replaces ESLint + Prettier with a single, faster tool. Written in Rust, 25x faster than ESLint.

### Oxlint (with Type-Aware Rules)

**What**: Supplementary linter with TypeScript type-aware rules.

**Why**: Catches issues Biome misses, including critical async/promise bugs. Written in Rust, extremely fast.

### Lefthook

**What**: Git hooks manager.

**Why**: Runs checks automatically on commit/push. Faster than Husky, written in Go.

## Development

```bash
# Clone this repo
git clone https://github.com/username/bakery.git
cd bakery

# Install dependencies
make install

# Run checks
make check

# Run tests
make test

# Test the wizard
bun run src/cli.ts --help
```

## License

MIT
