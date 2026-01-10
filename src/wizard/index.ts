import * as fs from 'node:fs'
import * as path from 'node:path'
import { bold, cyan, dim, green, red, yellow } from '../utils/colors.js'
import { type DryRunResult, generateProject, generateProjectDryRun } from './generator.js'
import { closePrompts, type ProjectConfig, printSummary, runPrompts } from './prompts.js'

export interface WizardOptions {
  dryRun?: boolean
  templatePath?: string | undefined
}

function validateOutputDir(outputDir: string): void {
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir)
    if (files.length > 0) {
      console.error(red(`\nError: Directory '${outputDir}' already exists and is not empty.`))
      console.error(yellow('Please choose a different name or remove the existing directory.\n'))
      process.exit(1)
    }
  }
}

function printDryRunResult(result: DryRunResult): void {
  console.error(bold(cyan('\n📋 Dry Run - Files that would be generated:\n')))

  const sortedFiles = [...result.files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const sizeKb = (file.size / 1024).toFixed(1)
    console.error(`  ${green('+')} ${file.path} ${dim(`(${sizeKb}KB)`)}`)
  }

  console.error('')
  console.error(
    dim(`Total: ${result.files.length} files, ${(result.totalSize / 1024).toFixed(1)}KB`),
  )

  if (result.commands.length > 0) {
    console.error(bold(cyan('\n🔧 Commands that would be executed:\n')))
    for (const cmd of result.commands) {
      console.error(`  ${yellow('$')} ${cmd}`)
    }
  }

  if (result.dependencies.length > 0) {
    console.error(bold(cyan('\n📦 Dependencies that would be added:\n')))
    for (const dep of result.dependencies) {
      console.error(`  ${green('+')} ${dep}`)
    }
  }

  if (result.devDependencies.length > 0) {
    console.error(bold(cyan('\n🔨 DevDependencies that would be added:\n')))
    for (const dep of result.devDependencies) {
      console.error(`  ${green('+')} ${dep}`)
    }
  }

  console.error('')
  console.error(dim('Run without --dry-run to actually generate the project.'))
  console.error('')
}

function printNextSteps(projectName: string): void {
  console.error(bold(green('\n✓ Project created successfully!\n')))
  console.error(bold(cyan('Next steps:\n')))
  console.error(`  ${dim('1.')} cd ${projectName}`)
  console.error(`  ${dim('2.')} make install`)
  console.error(`  ${dim('3.')} make dev`)
  console.error('')
  console.error(dim('Run `make help` to see all available commands.\n'))
}

export async function runWizard(outputPath?: string, options: WizardOptions = {}): Promise<void> {
  try {
    const config = await runPrompts()

    const outputDir = outputPath
      ? path.resolve(outputPath)
      : path.resolve(process.cwd(), config.projectName)

    printSummary(config, outputDir)

    if (options.dryRun) {
      console.error(`\n${dim('Running dry-run...')}`)
      const result = generateProjectDryRun(config, outputDir, options.templatePath)
      printDryRunResult(result)
    } else {
      validateOutputDir(outputDir)
      console.error(`\n${dim('Generating project...')}`)
      generateProject(config, outputDir, options.templatePath)
      printNextSteps(config.projectName)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      console.error(`\n${dim('Cancelled.\n')}`)
      process.exit(0)
    }
    throw err
  } finally {
    closePrompts()
  }
}

export async function runFromConfig(
  config: ProjectConfig,
  outputPath?: string,
  options: WizardOptions = {},
): Promise<void> {
  const outputDir = outputPath
    ? path.resolve(outputPath)
    : path.resolve(process.cwd(), config.projectName)

  printSummary(config, outputDir)

  if (options.dryRun) {
    console.error(`\n${dim('Running dry-run...')}`)
    const result = generateProjectDryRun(config, outputDir, options.templatePath)
    printDryRunResult(result)
  } else {
    validateOutputDir(outputDir)
    console.error(`\n${dim('Generating project...')}`)
    generateProject(config, outputDir, options.templatePath)
    printNextSteps(config.projectName)
  }
}
