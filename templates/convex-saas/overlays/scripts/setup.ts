#!/usr/bin/env bun
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'

interface TemplateValues {
  projectSlug: string
  projectName: string
  projectDescription: string
  domain: string
  brandName: string
  tagline: string
  supportEmail: string
  twitterHandle: string
  companyName: string
  companyAddress: string
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question: string, defaultValue?: string): Promise<string> {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function toPascalCase(text: string): string {
  return text
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

async function getTemplateValues(): Promise<TemplateValues> {
  console.log('\n🚀 Template Setup\n')
  console.log('This will configure the template for your new project.\n')

  const projectName = await ask('Project name (human-readable)', 'My SaaS App')
  const projectSlug = await ask('Project slug (kebab-case)', slugify(projectName))
  const projectDescription = await ask('Short description', 'A modern SaaS application.')
  const domain = await ask('Domain (without https://)', `${projectSlug}.com`)
  const brandName = await ask('Brand name', projectName)
  const tagline = await ask('Tagline', projectDescription)
  const supportEmail = await ask('Support email (optional)')
  const twitterHandle = await ask('Twitter handle (optional, without @)')
  const companyName = await ask('Company name (optional)')
  const companyAddress = await ask('Company address (optional)')

  return {
    projectSlug,
    projectName,
    projectDescription,
    domain,
    brandName,
    tagline,
    supportEmail,
    twitterHandle,
    companyName,
    companyAddress,
  }
}

function updateTemplateConfig(values: TemplateValues): void {
  const configPath = path.join(process.cwd(), 'template.config.ts')
  const siteUrl = `https://${values.domain}`

  const content = `export const templateConfig = {
  projectSlug: '${values.projectSlug}',
  projectName: '${values.projectName}',
  projectDescription: '${values.projectDescription}',

  domain: '${values.domain}',
  siteUrl: '${siteUrl}',

  brandName: '${values.brandName}',
  tagline: '${values.tagline}',

  supportEmail: '${values.supportEmail}',
  twitterHandle: '${values.twitterHandle}',

  companyName: '${values.companyName}',
  companyAddress: '${values.companyAddress}',
} as const

export type TemplateConfig = typeof templateConfig

export const getUrl = (path: string) => \`\${templateConfig.siteUrl}\${path}\`

export const getEmailFrom = (name?: string) => {
  const displayName = name || templateConfig.brandName
  const email = templateConfig.supportEmail || 'onboarding@resend.dev'
  return \`\${displayName} <\${email}>\`
}

export default templateConfig
`

  fs.writeFileSync(configPath, content)
  console.log('  ✓ Updated template.config.ts')
}

function updatePackageJson(values: TemplateValues): void {
  const pkgPath = path.join(process.cwd(), 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  pkg.name = values.projectSlug
  pkg.description = values.projectDescription

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log('  ✓ Updated package.json')
}

function updateManifest(values: TemplateValues): void {
  const manifestPath = path.join(process.cwd(), 'public', 'site.webmanifest')
  if (!fs.existsSync(manifestPath)) {
    console.log('  ⚠ Skipping site.webmanifest (not found)')
    return
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  manifest.name = values.projectName
  manifest.short_name = toPascalCase(values.projectSlug)
  manifest.description = values.projectDescription

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log('  ✓ Updated public/site.webmanifest')
}

function initGit(): void {
  const gitDir = path.join(process.cwd(), '.git')
  if (fs.existsSync(gitDir)) {
    try {
      const { execSync } = require('node:child_process')
      const origin = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' }).trim()
      if (origin.includes('better-parent')) {
        execSync('git remote remove origin')
        console.log('  ✓ Removed template origin')
      }
    } catch {
      // No origin configured
    }
  }
}

async function main(): Promise<void> {
  try {
    const values = await getTemplateValues()

    console.log('\n📝 Updating files...\n')

    updateTemplateConfig(values)
    updatePackageJson(values)
    updateManifest(values)
    initGit()

    console.log('\n✅ Setup complete!\n')
    console.log('Next steps:')
    console.log('  1. Run `bun install` to install dependencies')
    console.log('  2. Run `bunx convex dev` to set up Convex')
    console.log('  3. Run `bun run dev` to start development')
    console.log('')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
