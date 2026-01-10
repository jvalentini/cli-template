#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

interface SetupTask {
  name: string
  description: string
  command: string
  condition: 'always' | 'if-no-git' | 'if-convex' | 'if-docker'
  continueOnError: boolean
}

interface SetupConfig {
  archetype: string
  generatedAt: string
  tasks: SetupTask[]
}

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function log(message: string): void {
  console.log(message)
}

function success(message: string): void {
  console.log(`${COLORS.green}${COLORS.bold}✓${COLORS.reset} ${message}`)
}

function warning(message: string): void {
  console.log(`${COLORS.yellow}${COLORS.bold}⚠${COLORS.reset} ${message}`)
}

function error(message: string): void {
  console.log(`${COLORS.red}${COLORS.bold}✗${COLORS.reset} ${message}`)
}

function shouldRunTask(task: SetupTask): boolean {
  const projectRoot = process.cwd()

  switch (task.condition) {
    case 'always':
      return true
    case 'if-no-git':
      return !fs.existsSync(path.join(projectRoot, '.git'))
    case 'if-convex':
      return fs.existsSync(path.join(projectRoot, 'convex'))
    case 'if-docker':
      return fs.existsSync(path.join(projectRoot, 'Dockerfile'))
    default:
      return true
  }
}

function runTask(task: SetupTask): boolean {
  log(`\n${COLORS.dim}Running: ${task.command}${COLORS.reset}`)

  const result = spawnSync(task.command, {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd(),
  })

  if (result.status === 0) {
    success(task.description)
    return true
  }

  if (task.continueOnError) {
    warning(`${task.description} (failed but continuing)`)
    return true
  }

  error(`${task.description} (failed)`)
  return false
}

async function main(): Promise<void> {
  const setupJsonPath = path.join(process.cwd(), '.bakery', 'setup.json')

  if (!fs.existsSync(setupJsonPath)) {
    error('No .bakery/setup.json found. This project may not have been generated with Bakery.')
    process.exit(1)
  }

  const config: SetupConfig = JSON.parse(fs.readFileSync(setupJsonPath, 'utf-8'))

  log(`\n${COLORS.bold}Setting up ${config.archetype} project${COLORS.reset}`)
  log(`${COLORS.dim}Generated: ${config.generatedAt}${COLORS.reset}\n`)

  const tasks = config.tasks.filter(shouldRunTask)

  if (tasks.length === 0) {
    log('No setup tasks to run.')
    return
  }

  log(`Running ${tasks.length} setup task(s)...\n`)

  for (const task of tasks) {
    const shouldRun = shouldRunTask(task)
    if (!shouldRun) {
      log(`${COLORS.dim}Skipping: ${task.description} (condition not met)${COLORS.reset}`)
      continue
    }

    const ok = runTask(task)
    if (!ok) {
      process.exit(1)
    }
  }

  log(`\n${COLORS.green}${COLORS.bold}Setup complete!${COLORS.reset}\n`)
}

main().catch((err) => {
  error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
