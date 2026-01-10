# File Injection System - Design Document

> **Status**: Draft  
> **Author**: AI Assistant  
> **Date**: 2026-01-10  
> **Target**: Bakery v2.0

## Executive Summary

The File Injection System enables addons to insert code into specific locations within existing files, rather than only creating new files or overwriting entire files. This unlocks composable addons that extend base archetypes cleanly.

---

## Problem Statement

### Current Limitation

Bakery addons can only:
1. **Create new files** - Works, but fragments related code across files
2. **Overwrite files** - Destructive, loses base archetype content

### Real-World Pain Points

| Scenario | Current Workaround | Problem |
|----------|-------------------|---------|
| Add route to router | Create separate routes file | Fragmented, manual wiring needed |
| Add middleware to app | Overwrite app.ts | Loses base middleware |
| Add export to index.ts | Create separate barrel | Import complexity |
| Add env var to config | Document in README | Easy to miss, not automated |
| Add script to package.json | Merge logic in generator | Complex, error-prone |

### User Impact

- Addons feel disconnected from base archetype
- Manual integration steps required after generation
- Can't stack multiple addons that touch the same file

---

## Goals & Non-Goals

### Goals

1. Enable addons to inject code at marked locations in base files
2. Support multiple addons injecting to the same marker
3. Preserve injection capability through sync operations
4. Provide clear error messages when injection fails
5. Make injected code traceable to its source addon

### Non-Goals

1. AST-aware injection (we use text/regex, not parsing)
2. Automatic conflict resolution (user decides)
3. Injection into user-modified sections (too risky)
4. Runtime code injection (generation-time only)

---

## Detailed Design

### Marker Syntax

Markers are special comments that define injection points:

```typescript
// BAKERY:INJECT:<marker-name>
// BAKERY:END:<marker-name>
```

**Design decisions:**
- `BAKERY:` prefix prevents collision with other tools
- `INJECT`/`END` pair defines a region (not a single point)
- Marker names are lowercase alphanumeric with hyphens: `[a-z0-9-]+`
- Markers must be on their own line (simplifies parsing)

**Language-agnostic comment styles:**

```typescript
// JavaScript/TypeScript
// BAKERY:INJECT:routes
// BAKERY:END:routes

# Python/YAML/Shell
# BAKERY:INJECT:dependencies
# BAKERY:END:dependencies

<!-- HTML/XML/Markdown -->
<!-- BAKERY:INJECT:head-scripts -->
<!-- BAKERY:END:head-scripts -->

/* CSS */
/* BAKERY:INJECT:variables */
/* BAKERY:END:variables */
```

### Injection Definition Schema

Addons define injections in `template.json`:

```json
{
  "name": "auth",
  "description": "Authentication addon",
  "files": ["..."],
  "inject": [
    {
      "file": "src/routes/index.ts",
      "marker": "routes",
      "content": "{ path: '/auth', handler: authHandler },",
      "position": "start",
      "newline": true
    },
    {
      "file": "src/app.ts",
      "marker": "middleware",
      "template": "files/_inject/middleware.ts.ejs",
      "position": "end"
    },
    {
      "file": "package.json",
      "marker": "scripts",
      "json": {
        "auth:keys": "bun run scripts/generate-keys.ts"
      }
    }
  ]
}
```

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | Yes | Target file path (relative to project root) |
| `marker` | string | Yes | Marker name to inject into |
| `content` | string | No* | Literal content to inject |
| `template` | string | No* | EJS template file for content |
| `json` | object | No* | JSON to merge (for package.json, tsconfig, etc.) |
| `position` | `"start"` \| `"end"` | No | Where in marker region (default: `"end"`) |
| `newline` | boolean | No | Add trailing newline (default: `true`) |
| `indent` | boolean | No | Match marker indentation (default: `true`) |

*One of `content`, `template`, or `json` is required.

### Injection Processing Order

When multiple addons inject to the same marker:

1. **Base archetype** content (already in file)
2. **Addons in selection order** (order user selected them in wizard)
3. Within an addon, injections processed in array order

**Example:**

User selects addons: `[docker, auth, logging]`

All three inject to `middleware` marker:
```
BAKERY:INJECT:middleware
  <docker middleware>      // First selected
  <auth middleware>        // Second selected  
  <logging middleware>     // Third selected
  <base middleware>        // Original content
BAKERY:END:middleware
```

### JSON Injection (Special Case)

For JSON files (package.json, tsconfig.json), injection uses deep merge:

```json
// Addon defines:
{
  "file": "package.json",
  "marker": "scripts",
  "json": {
    "docker:build": "docker build -t myapp .",
    "docker:run": "docker run -p 3000:3000 myapp"
  }
}
```

**Merge behavior:**
- Objects: Deep merge (addon values override conflicts)
- Arrays: Concatenate (addon items appended)
- Primitives: Addon value wins

**Note:** JSON injection doesn't use markers - it targets JSON paths directly:

```json
{
  "file": "package.json",
  "jsonPath": "$.scripts",
  "json": { "new:script": "echo hello" }
}
```

### Manifest Integration

The sync system manifest tracks injections:

```json
{
  "files": {
    "src/routes/index.ts": {
      "hash": "sha256:abc123",
      "managed": true,
      "injections": [
        {
          "marker": "routes",
          "addon": "auth",
          "hash": "sha256:def456"
        },
        {
          "marker": "routes", 
          "addon": "docker",
          "hash": "sha256:789ghi"
        }
      ]
    }
  }
}
```

This enables:
- Detecting if injected content was manually modified
- Updating specific injections during sync
- Removing injections when addon is removed

---

## Error Handling

### Marker Not Found

```
Error: Injection failed for addon 'auth'
  File: src/routes/index.ts
  Marker: 'routes' not found
  
  Possible causes:
  - Marker was deleted or renamed
  - File was regenerated without markers
  - Wrong file path in addon config
  
  Fix: Add marker to file:
    // BAKERY:INJECT:routes
    // BAKERY:END:routes
```

### Malformed Marker

```
Error: Malformed injection marker in src/routes/index.ts
  Found: // BAKERY:INJECT:routes
  Missing: // BAKERY:END:routes
  
  Injection markers must have matching START and END tags.
```

### Duplicate Markers

```
Error: Duplicate marker 'routes' in src/routes/index.ts
  Line 15: // BAKERY:INJECT:routes
  Line 42: // BAKERY:INJECT:routes
  
  Each marker name must be unique within a file.
```

### Circular Injection

```
Error: Circular injection detected
  addon-a injects to marker 'foo' which contains marker 'bar'
  addon-b injects to marker 'bar' which contains marker 'foo'
  
  Injections cannot create circular dependencies.
```

---

## API Design

### Programmatic API

```typescript
// src/inject/types.ts
export interface InjectionDefinition {
  file: string;
  marker: string;
  content?: string;
  template?: string;
  json?: Record<string, unknown>;
  jsonPath?: string;
  position?: 'start' | 'end';
  newline?: boolean;
  indent?: boolean;
}

export interface InjectionResult {
  file: string;
  marker: string;
  addon: string;
  success: boolean;
  error?: string;
  linesAdded: number;
}

// src/inject/engine.ts
export function parseMarkers(content: string): Map<string, MarkerRegion>;
export function injectContent(
  content: string,
  marker: string,
  injection: string,
  options: InjectionOptions
): Result<string, InjectionError>;

export function processInjections(
  projectDir: string,
  injections: InjectionDefinition[],
  context: TemplateContext
): Promise<Result<InjectionResult[], InjectionError>>;
```

### CLI Integration

```bash
# Show injection points in a generated project
bakery inspect --injections
# Output:
# src/routes/index.ts
#   - routes (2 injections: auth, docker)
#   - middleware (1 injection: auth)
# src/app.ts
#   - plugins (0 injections)

# Validate addon injection definitions
bakery lint --check-injections

# Dry-run showing what would be injected
bakery --dry-run
# Output includes:
# INJECT src/routes/index.ts @ routes:
#   + { path: '/auth', handler: authHandler },
```

---

## Implementation Plan

### Phase 1: Core Engine (Week 1)

1. **Marker parser** (`src/inject/parser.ts`)
   - Regex-based marker detection
   - Support for all comment styles
   - Validation of marker pairs

2. **Injection engine** (`src/inject/engine.ts`)
   - Text injection with indentation matching
   - Position handling (start/end)
   - Template rendering for injected content

3. **Unit tests**
   - Marker parsing edge cases
   - Injection ordering
   - Indentation preservation

### Phase 2: Integration (Week 2)

4. **Generator integration**
   - Process injections after file generation
   - Update manifest with injection metadata

5. **Addon schema update**
   - Add `inject` field to template.json schema
   - Zod validation for injection definitions

6. **JSON injection**
   - Deep merge implementation
   - JSONPath support for targeting

### Phase 3: Sync Support (Week 3)

7. **Sync integration**
   - Detect modified injections
   - Update injections during sync
   - Handle removed addons

8. **CLI commands**
   - `bakery inspect --injections`
   - Injection info in `--dry-run` output

### Phase 4: Polish (Week 4)

9. **Error messages**
   - Helpful diagnostics for all failure modes
   - Suggestions for fixes

10. **Documentation**
    - Addon author guide
    - Marker placement best practices
    - Troubleshooting guide

---

## Security Considerations

### Code Injection Risks

Addons can inject arbitrary code. Mitigations:

1. **Remote template warnings** (already implemented)
   - Users warned before using untrusted templates
   - `--trust` flag for known-good sources

2. **Injection visibility**
   - `--dry-run` shows exactly what will be injected
   - `bakery inspect` shows current injections

3. **Manifest tracking**
   - All injections recorded with source addon
   - Easy to audit what code came from where

### Marker Spoofing

Malicious addon could inject fake markers to hijack future injections:

```typescript
// Malicious injection:
"content": "// BAKERY:INJECT:admin\nimport { backdoor } from './evil';\n// BAKERY:END:admin"
```

**Mitigation:** Post-injection validation that no new markers were created:

```typescript
function validateNoNewMarkers(before: string, after: string): Result<void, Error> {
  const markersBefore = parseMarkers(before);
  const markersAfter = parseMarkers(after);
  
  for (const marker of markersAfter.keys()) {
    if (!markersBefore.has(marker)) {
      return err(new Error(`Injection created new marker: ${marker}`));
    }
  }
  return ok(undefined);
}
```

---

## Alternatives Considered

### 1. AST-Based Injection

**Approach:** Parse code into AST, inject at semantic locations (e.g., "add to exports array").

**Pros:**
- Language-aware, less fragile
- No markers needed

**Cons:**
- Requires parsers for every language
- Complex implementation
- Harder for addon authors to target

**Decision:** Rejected. Text-based with markers is simpler and works across all languages.

### 2. Template Inheritance (Jinja-style)

**Approach:** Templates define blocks that child templates can override/extend.

```jinja
{% block routes %}
  {{ super() }}
  { path: '/auth', handler: authHandler },
{% endblock %}
```

**Pros:**
- Well-understood pattern
- Clean composition

**Cons:**
- Requires EJS replacement or major extension
- Doesn't work for non-template files
- Sync becomes very complex

**Decision:** Rejected. Markers are simpler and work on any file.

### 3. Patch Files

**Approach:** Addons provide unified diff patches.

```diff
--- a/src/routes/index.ts
+++ b/src/routes/index.ts
@@ -5,6 +5,7 @@ export const routes = [
   { path: '/', handler: homeHandler },
+  { path: '/auth', handler: authHandler },
 ];
```

**Pros:**
- Standard format
- Git-compatible

**Cons:**
- Fragile to line number changes
- Hard for addon authors to write
- Conflicts are opaque

**Decision:** Rejected. Markers provide stable injection points.

---

## Open Questions

1. **Should markers be preserved in generated output?**
   - Pro: Enables future re-injection during sync
   - Con: Clutters generated code
   - **Tentative:** Yes, preserve. Users can strip with post-generation hook if desired.

2. **How to handle marker inside injected content?**
   - Disallow? Escape? Allow nested?
   - **Tentative:** Disallow and error. Too complex otherwise.

3. **Should we support conditional injection?**
   - e.g., "only inject if another addon is also selected"
   - **Tentative:** Defer to v2.1. Can work around with optional markers.

4. **What about non-text files (images, binaries)?**
   - **Answer:** Not supported. Injection is text-only.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Addon adoption | 50% of addons use injection within 6 months |
| Error rate | <1% of injections fail in production |
| User satisfaction | Positive feedback on composability |
| Sync reliability | Injection state survives sync without corruption |

---

## Appendix: Example Addon Using Injection

### Auth Addon (`addons/auth/template.json`)

```json
{
  "name": "auth",
  "description": "JWT authentication with login/logout routes",
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "@types/jsonwebtoken": "^9.0.0"
  },
  "files": [
    "src/auth/index.ts",
    "src/auth/middleware.ts",
    "src/auth/handlers.ts"
  ],
  "inject": [
    {
      "file": "src/routes/index.ts",
      "marker": "routes",
      "template": "files/_inject/routes.ts.ejs",
      "position": "start"
    },
    {
      "file": "src/app.ts",
      "marker": "middleware",
      "content": "app.use(authMiddleware);",
      "position": "end"
    },
    {
      "file": "src/index.ts",
      "marker": "imports",
      "content": "import { authMiddleware } from './auth/middleware';",
      "position": "end"
    },
    {
      "file": ".env.example",
      "marker": "env-vars",
      "content": "JWT_SECRET=your-secret-key-here\nJWT_EXPIRY=24h"
    },
    {
      "file": "package.json",
      "jsonPath": "$.scripts",
      "json": {
        "auth:generate-secret": "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      }
    }
  ]
}
```

### Base Archetype with Markers (`templates/api/files/src/routes/index.ts.ejs`)

```typescript
import { homeHandler } from './handlers/home';
import { healthHandler } from './handlers/health';

// BAKERY:INJECT:imports
// BAKERY:END:imports

export const routes = [
  // BAKERY:INJECT:routes
  { path: '/', handler: homeHandler },
  { path: '/health', handler: healthHandler },
  // BAKERY:END:routes
];
```

### Generated Output (with auth addon)

```typescript
import { homeHandler } from './handlers/home';
import { healthHandler } from './handlers/health';

// BAKERY:INJECT:imports
import { loginHandler, logoutHandler } from '../auth/handlers';
// BAKERY:END:imports

export const routes = [
  // BAKERY:INJECT:routes
  { path: '/auth/login', handler: loginHandler },
  { path: '/auth/logout', handler: logoutHandler },
  { path: '/', handler: homeHandler },
  { path: '/health', handler: healthHandler },
  // BAKERY:END:routes
];
```

---

## References

- [Hygen - Code Generator](https://www.hygen.io/) - Inspiration for injection patterns
- [Plop.js](https://plopjs.com/) - Alternative approach with prompts
- [Projen](https://projen.io/) - Managed file patterns
- [Rails Generators](https://guides.rubyonrails.org/generators.html) - Ruby's approach to injection
