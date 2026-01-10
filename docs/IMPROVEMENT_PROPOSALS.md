# Bakery Improvement Proposals

Based on research of existing templating tools (Cookiecutter, Yeoman, degit, Plop.js, Hygen, Projen) and analysis of Bakery's current capabilities, here are five high-impact improvement proposals.

## Executive Summary

| # | Proposal | Effort | Impact | Recommendation |
|---|----------|--------|--------|----------------|
| 1 | Dry-Run Mode | Low | High | **Implement First** |
| 2 | Template Sync/Update | High | Very High | **Implement** |
| 3 | Remote Template Support | Medium | High | **Implement** |
| 4 | File Injection System | Medium | Medium | Consider |
| 5 | Template Validation & Testing | Medium | High | **Implement** |

---

## Proposal 1: Dry-Run Mode

Add a `--dry-run` flag that shows what would be generated without writing files.

### Current State
- No way to preview what files will be created
- Users must generate to a temp directory to see output
- No visibility into template resolution or addon application order

### Proposed Implementation
```bash
bakery --dry-run
bakery --dry-run --config bakery.json
```

Output would show:
- Files that would be created (with paths)
- Files that would be overwritten
- Template resolution order
- Addons being applied
- Dependencies that would be added to package.json

### Pros
- **Low effort**: Mostly logging changes, reuses existing engine
- **High value**: Reduces fear of running generator on existing projects
- **Better DX**: Users understand what's happening before committing
- **Debugging**: Helps troubleshoot template issues

### Cons
- Slight code complexity increase
- Need to refactor `writeTemplates` to support dry-run path
- Output formatting needs design work

### Recommendation: **Implement First**
This is the lowest-hanging fruit with highest immediate value. Most scaffolding tools have this feature.

---

## Proposal 2: Template Sync/Update System

Allow re-running Bakery on existing projects to update configuration files while preserving user modifications.

### Current State
- Templates are fire-and-forget
- No way to update an existing project with new template versions
- Users must manually migrate when templates improve

### Proposed Implementation
```bash
bakery sync                    # Update project from original template
bakery sync --check            # Show what would change
bakery sync --force            # Overwrite without prompts
```

Store metadata in `.bakery/manifest.json`:
```json
{
  "templateVersion": "1.2.0",
  "archetype": "cli",
  "addons": ["docker", "ci"],
  "generatedAt": "2026-01-10T00:00:00Z",
  "files": {
    "biome.json": { "hash": "abc123", "managed": true },
    "src/cli.ts": { "hash": "def456", "managed": false }
  }
}
```

Sync behavior:
- **Managed files** (config, CI): Update automatically
- **User files** (src/): Show diff, prompt for action
- **New files**: Add with notice
- **Removed files**: Warn but don't delete

### Pros
- **Projen's killer feature**: This is why teams love Projen
- **Long-term value**: Projects stay updated with best practices
- **Reduced maintenance**: Template improvements flow to all projects
- **Competitive advantage**: Few JS scaffolders have this

### Cons
- **High complexity**: Merge conflicts, hash tracking, user prompts
- **Storage overhead**: Manifest file in every project
- **Edge cases**: Renamed files, moved code, partial updates
- **User education**: Need clear docs on what "managed" means

### Recommendation: **Implement (Phase 2)**
This is a significant differentiator but requires careful design. Implement after dry-run mode proves the value proposition.

---

## Proposal 3: Remote Template Support

Allow using templates from Git repositories without publishing as plugins.

### Current State
- Templates must be local or published as npm plugins
- No way to quickly try a template from GitHub
- Plugin system is heavyweight for simple sharing

### Proposed Implementation
```bash
# Clone and use remote template
bakery --template github:user/my-template
bakery --template https://github.com/user/repo
bakery --template git@github.com:user/repo.git

# With specific branch/tag
bakery --template github:user/repo#v2.0.0
bakery --template github:user/repo#feature-branch

# Cache management
bakery cache list
bakery cache clear
```

### Pros
- **degit's simplicity**: Just point to a repo and go
- **Easy sharing**: Share templates without npm publishing
- **Version pinning**: Use specific commits/tags
- **Community growth**: Lower barrier for template authors

### Cons
- **Network dependency**: Requires internet for first use
- **Security concerns**: Running arbitrary templates from internet
- **Cache management**: Need to handle stale caches
- **Authentication**: Private repos need credential handling

### Recommendation: **Implement**
This dramatically lowers the barrier to template sharing and is expected by modern developers.

---

## Proposal 4: File Injection System

Add ability to inject code into existing files at marked locations.

### Current State
- Templates can only create or overwrite files
- No way to add routes to an existing router
- No way to add exports to an index file
- Addons can't modify archetype-generated files

### Proposed Implementation

Template markers in generated files:
```typescript
// src/routes/index.ts
export const routes = [
  // BAKERY:INJECT:routes
  { path: '/', component: Home },
  // BAKERY:END:routes
];
```

Addon injection definition:
```json
{
  "inject": [
    {
      "file": "src/routes/index.ts",
      "marker": "routes",
      "content": "{ path: '/auth', component: Auth },"
    }
  ]
}
```

### Pros
- **Hygen's superpower**: This is what makes Hygen great for in-project generation
- **Composable addons**: Addons can extend, not just add files
- **Cleaner output**: No duplicate boilerplate across addons

### Cons
- **Complexity**: Marker management, injection ordering
- **Fragility**: Markers can be accidentally deleted
- **Debugging**: Hard to trace where injected code came from
- **Conflicts**: Multiple addons injecting to same marker

### Recommendation: **Consider for Future**
Valuable but complex. Better to have solid foundation first. Could be a v2.0 feature.

---

## Proposal 5: Template Validation & Testing

Add comprehensive validation for templates and a testing framework for template authors.

### Current State
- `validate-archetypes.ts` exists but limited
- No schema validation for template.json
- No way to test templates in isolation
- Template errors only discovered at generation time

### Proposed Implementation

**1. Template Linting**
```bash
bakery lint                    # Lint all templates
bakery lint templates/cli      # Lint specific template
```

Checks:
- Valid JSON in template.json and package.json.ejs output
- EJS syntax errors
- Required files present
- Dependency versions are valid semver
- No broken template references

**2. Template Testing Framework**
```typescript
// templates/cli/__tests__/cli.test.ts
import { testTemplate } from '@bakery/test-utils';

describe('CLI template', () => {
  it('generates valid package.json', async () => {
    const result = await testTemplate('cli', {
      projectName: 'test-cli',
      addons: ['docker', 'ci']
    });
    
    expect(result.files['package.json']).toBeValidJson();
    expect(result.files['package.json']).toHaveProperty('bin');
  });

  it('generates valid TypeScript', async () => {
    const result = await testTemplate('cli', { projectName: 'test' });
    expect(result).toPassTypeCheck();
  });
});
```

**3. CI Integration**
```yaml
- name: Validate templates
  run: bakery lint --strict

- name: Test templates
  run: bakery test-templates
```

### Pros
- **Confidence**: Template authors know their templates work
- **Faster feedback**: Catch errors before users do
- **Documentation**: Tests serve as examples
- **Regression prevention**: Changes don't break templates

### Cons
- **Overhead**: More code to maintain
- **Test maintenance**: Tests need updating with templates
- **Complexity**: Testing framework is its own project
- **Slow CI**: Template tests can be slow (npm installs, etc.)

### Recommendation: **Implement**
Essential for a mature scaffolding tool. Start with linting, add testing framework incrementally.

---

## Implementation Roadmap

### Phase 1: Foundation (1-2 weeks)
1. **Dry-run mode** - Low effort, high value
2. **Fix CI** - Immediate need
3. **Template linting** - Part of validation

### Phase 2: Core Features (2-4 weeks)
4. **Remote template support** - Community growth
5. **Template testing framework** - Quality assurance

### Phase 3: Advanced (4-8 weeks)
6. **Template sync/update** - Differentiator
7. **File injection** - Power user feature

---

## Competitive Positioning

| Feature | Bakery | Cookiecutter | Yeoman | degit | Projen |
|---------|--------|--------------|--------|-------|--------|
| Interactive wizard | Yes | Yes | Yes | No | No |
| Config file mode | Yes | Yes | No | No | Yes |
| TypeScript-first | **Yes** | No | No | No | Yes |
| Dry-run | **Proposed** | Yes | No | No | Yes |
| Remote templates | **Proposed** | Yes | Yes | **Yes** | No |
| Template sync | **Proposed** | No | No | No | **Yes** |
| Plugin system | Yes | No | Yes | No | Yes |
| Bun-optimized | **Yes** | No | No | No | No |

Bakery's unique position: **TypeScript + Bun + Interactive + Syncable**

---

## Next Steps

1. Review and prioritize these proposals
2. Create Beads tasks for approved items
3. Begin implementation with Phase 1 items
