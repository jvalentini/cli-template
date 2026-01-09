import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createTemplateContext,
  processTemplateDirectory,
  type TemplateContext,
  writeTemplates,
} from '../templates/engine.js';
import { getTemplatesDir, resolveTemplates } from '../templates/loader.js';
import type { ProjectConfig } from './prompts.js';

/**
 * Generate a project from templates based on configuration
 */
export function generateProject(config: ProjectConfig, outputDir: string): void {
  // Create the template context
  const context = createTemplateContext({
    projectName: config.projectName,
    description: config.description,
    author: config.author,
    license: config.license,
    githubUsername: config.githubUsername,
    archetype: config.archetype,
    apiFramework: config.apiFramework,
    webFramework: config.webFramework,
    addons: config.addons,
  });

  // Resolve all templates needed for this configuration
  const templates = resolveTemplates(config.archetype, config.addons);

  // Process each template and collect all files
  const allFiles = new Map<string, string>();

  for (const template of templates) {
    const files = processTemplateDirectory(template.path, context);

    // Skip template.json files (manifest files)
    for (const [filePath, content] of files) {
      if (filePath !== 'template.json') {
        allFiles.set(filePath, content);
      }
    }
  }

  // Write all files to output directory
  writeTemplates(allFiles, outputDir);

  // Initialize git repository if not already initialized
  initGitRepo(outputDir);
}

/**
 * Initialize a git repository in the output directory
 */
function initGitRepo(outputDir: string): void {
  const gitDir = path.join(outputDir, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      execSync('git init', { cwd: outputDir, stdio: 'ignore' });
    } catch {
      // Git not available or failed - that's OK
    }
  }
}

/**
 * Legacy function for backward compatibility
 * Creates a CLI project with inline templates (deprecated)
 */
export function generateProjectLegacy(config: ProjectConfig, outputDir: string): void {
  const context = createTemplateContext({
    projectName: config.projectName,
    description: config.description,
    author: config.author,
    license: config.license,
    githubUsername: config.githubUsername,
    archetype: config.archetype,
    apiFramework: config.apiFramework,
    webFramework: config.webFramework,
    addons: config.addons,
  });

  // Check if template directory exists for the archetype
  const templatesDir = getTemplatesDir();
  const archetypePath = path.join(templatesDir, config.archetype);

  if (fs.existsSync(archetypePath)) {
    // Use the new template system
    generateProject(config, outputDir);
  } else {
    // Fall back to inline generation for archetypes without templates yet
    generateInlineProject(context, config, outputDir);
  }
}

/**
 * Helper to write a file, creating directories as needed
 */
function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Helper to check if an addon is enabled
 */
function hasAddon(config: ProjectConfig, addon: string): boolean {
  return config.addons.includes(addon as ProjectConfig['addons'][number]);
}

/**
 * Generate project using inline templates (legacy fallback)
 */
function generateInlineProject(
  context: TemplateContext,
  config: ProjectConfig,
  outputDir: string
): void {
  // Generate package.json
  const pkg = {
    name: context.projectName,
    version: '0.1.0',
    description: context.description,
    type: 'module',
    main: './dist/cli.js',
    bin: {
      [context.projectName]: './dist/cli.js',
    },
    files: ['dist/'],
    repository: context.githubUrl
      ? {
          type: 'git',
          url: `${context.githubUrl}.git`,
        }
      : undefined,
    homepage: context.githubUrl ? `${context.githubUrl}#readme` : undefined,
    bugs: context.githubUrl ? { url: `${context.githubUrl}/issues` } : undefined,
    scripts: {
      dev: 'bun run src/cli.ts',
      build: 'tsc',
      'build:binary': `bun build src/cli.ts --compile --outfile ${context.projectName}`,
      test: 'bun test',
      lint: 'biome check .',
      'lint:fix': 'biome check --write .',
      typecheck: 'tsc --noEmit',
      check: 'bun run typecheck && bun run lint',
    },
    keywords: ['cli', 'typescript', 'bun'],
    author: context.author,
    license: context.license,
    dependencies: {
      ...(hasAddon(config, 'zod') && { zod: '^3.24.0' }),
      ...(hasAddon(config, 'neverthrow') && { neverthrow: '^8.2.0' }),
    },
    devDependencies: {
      '@biomejs/biome': '^2.3.11',
      '@types/node': '^20.0.0',
      'bun-types': 'latest',
      lefthook: '^2.0.13',
      typescript: '^5.0.0',
      '@tsconfig/strictest': '^2.0.0',
    },
  };

  writeFile(path.join(outputDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

  // Generate basic CLI
  const cliTs = `#!/usr/bin/env bun

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(\`
${context.projectName} v\${VERSION}
${context.description}

USAGE:
  ${context.projectName} [options] <command>

COMMANDS:
  hello              Print a greeting message

OPTIONS:
  -h, --help         Show this help message
  --version          Show version number
\`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--version')) {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  if (command === 'hello') {
    console.log('Hello from ${context.projectName}!');
  } else {
    console.error(\`Unknown command: \${command}\`);
    process.exit(1);
  }
}

main();
`;

  writeFile(path.join(outputDir, 'src', 'cli.ts'), cliTs);

  // Generate tsconfig.json
  const tsconfig = {
    extends: '@tsconfig/strictest/tsconfig.json',
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      outDir: './dist',
      rootDir: './src',
      types: ['bun-types'],
    },
    include: ['src/**/*.ts'],
    exclude: ['node_modules', 'dist'],
  };

  writeFile(path.join(outputDir, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`);

  // Generate README
  const readme = `# ${context.projectName}

${context.description}

## Installation

\`\`\`bash
bun install
\`\`\`

## Usage

\`\`\`bash
bun run src/cli.ts --help
\`\`\`

## License

${context.license}${context.author ? ` - ${context.author}` : ''}
`;

  writeFile(path.join(outputDir, 'README.md'), readme);

  // Generate .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;

  writeFile(path.join(outputDir, '.gitignore'), gitignore);

  initGitRepo(outputDir);
}
