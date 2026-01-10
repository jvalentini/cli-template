import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { err, ok, type Result } from 'neverthrow'
import { getTemplateCachePath, isCached } from './cache.js'
import { type ParseError, parseRemoteTemplate, type RemoteTemplateRef } from './parser.js'

export interface FetchError {
  type: 'parse_error' | 'git_not_found' | 'clone_failed' | 'invalid_template'
  message: string
}

export interface FetchResult {
  ref: RemoteTemplateRef
  path: string
  fromCache: boolean
}

export function fetchRemoteTemplate(
  templateSpec: string,
  options: { force?: boolean } = {},
): Result<FetchResult, FetchError | ParseError> {
  const parseResult = parseRemoteTemplate(templateSpec)

  if (parseResult.isErr()) {
    return err(parseResult.error)
  }

  const ref = parseResult.value

  if (!options.force && isCached(ref)) {
    return ok({
      ref,
      path: getTemplateCachePath(ref),
      fromCache: true,
    })
  }

  const gitCheck = spawnSync('git', ['--version'], { stdio: 'pipe' })
  if (gitCheck.status !== 0) {
    return err({
      type: 'git_not_found',
      message: 'Git is not installed or not in PATH. Git is required for remote templates.',
    })
  }

  const cachePath = getTemplateCachePath(ref)
  const cacheParent = path.dirname(cachePath)

  if (!fs.existsSync(cacheParent)) {
    fs.mkdirSync(cacheParent, { recursive: true })
  }

  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true })
  }

  const cloneArgs = ['clone', '--depth', '1']

  if (ref.ref) {
    cloneArgs.push('--branch', ref.ref)
  }

  cloneArgs.push(ref.cloneUrl, cachePath)

  const cloneResult = spawnSync('git', cloneArgs, {
    stdio: 'pipe',
    encoding: 'utf-8',
  })

  if (cloneResult.status !== 0) {
    const errorMessage = cloneResult.stderr || cloneResult.stdout || 'Unknown error'
    return err({
      type: 'clone_failed',
      message: `Failed to clone repository: ${errorMessage.trim()}`,
    })
  }

  const gitDir = path.join(cachePath, '.git')
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true })
  }

  const templateJson = path.join(cachePath, 'template.json')
  if (!fs.existsSync(templateJson)) {
    fs.rmSync(cachePath, { recursive: true, force: true })
    return err({
      type: 'invalid_template',
      message: 'Repository is not a valid Bakery template (missing template.json)',
    })
  }

  return ok({
    ref,
    path: cachePath,
    fromCache: false,
  })
}

export function isValidBakeryTemplate(templatePath: string): boolean {
  const templateJson = path.join(templatePath, 'template.json')
  return fs.existsSync(templateJson)
}
