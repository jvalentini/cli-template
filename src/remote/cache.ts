import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { RemoteTemplateRef } from './parser.js'

export function getCacheDir(): string {
  return path.join(os.homedir(), '.bakery', 'cache', 'templates')
}

export function getTemplateCachePath(ref: RemoteTemplateRef): string {
  const refDir = ref.ref ?? 'default'
  return path.join(getCacheDir(), ref.owner, ref.repo, refDir)
}

export function isCached(ref: RemoteTemplateRef): boolean {
  const cachePath = getTemplateCachePath(ref)
  return fs.existsSync(cachePath)
}

export interface CachedTemplate {
  owner: string
  repo: string
  ref: string
  path: string
  size: number
  cachedAt: Date
}

export function listCachedTemplates(): CachedTemplate[] {
  const cacheDir = getCacheDir()

  if (!fs.existsSync(cacheDir)) {
    return []
  }

  const templates: CachedTemplate[] = []

  try {
    const owners = fs.readdirSync(cacheDir, { withFileTypes: true })

    for (const ownerEntry of owners) {
      if (!ownerEntry.isDirectory()) continue

      const ownerPath = path.join(cacheDir, ownerEntry.name)
      const repos = fs.readdirSync(ownerPath, { withFileTypes: true })

      for (const repoEntry of repos) {
        if (!repoEntry.isDirectory()) continue

        const repoPath = path.join(ownerPath, repoEntry.name)
        const refs = fs.readdirSync(repoPath, { withFileTypes: true })

        for (const refEntry of refs) {
          if (!refEntry.isDirectory()) continue

          const refPath = path.join(repoPath, refEntry.name)
          const stats = fs.statSync(refPath)

          templates.push({
            owner: ownerEntry.name,
            repo: repoEntry.name,
            ref: refEntry.name,
            path: refPath,
            size: getDirectorySize(refPath),
            cachedAt: stats.mtime,
          })
        }
      }
    }
  } catch {
    return []
  }

  return templates.sort((a, b) => b.cachedAt.getTime() - a.cachedAt.getTime())
}

function getDirectorySize(dirPath: string): number {
  let size = 0

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        size += getDirectorySize(fullPath)
      } else {
        const stats = fs.statSync(fullPath)
        size += stats.size
      }
    }
  } catch {
    return 0
  }

  return size
}

export function clearCache(ref?: RemoteTemplateRef): { removed: number; freed: number } {
  const cacheDir = getCacheDir()

  if (!fs.existsSync(cacheDir)) {
    return { removed: 0, freed: 0 }
  }

  if (ref) {
    const cachePath = getTemplateCachePath(ref)

    if (!fs.existsSync(cachePath)) {
      return { removed: 0, freed: 0 }
    }

    const size = getDirectorySize(cachePath)
    fs.rmSync(cachePath, { recursive: true, force: true })

    cleanupEmptyDirs(path.dirname(cachePath))
    cleanupEmptyDirs(path.dirname(path.dirname(cachePath)))

    return { removed: 1, freed: size }
  }

  const templates = listCachedTemplates()
  let totalFreed = 0

  for (const template of templates) {
    totalFreed += template.size
  }

  fs.rmSync(cacheDir, { recursive: true, force: true })

  return { removed: templates.length, freed: totalFreed }
}

function cleanupEmptyDirs(dirPath: string): void {
  try {
    const entries = fs.readdirSync(dirPath)
    if (entries.length === 0) {
      fs.rmdirSync(dirPath)
    }
  } catch {
    return
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
