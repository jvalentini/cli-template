import { err, ok, type Result } from 'neverthrow'

export interface RemoteTemplateRef {
  owner: string
  repo: string
  ref: string | undefined
  cloneUrl: string
}

export interface ParseError {
  type: 'invalid_format' | 'missing_repo' | 'unsupported_host'
  message: string
}

export function parseRemoteTemplate(input: string): Result<RemoteTemplateRef, ParseError> {
  const trimmed = input.trim()

  if (trimmed.startsWith('github:')) {
    return parseGitHubShorthand(trimmed.slice(7))
  }

  if (trimmed.startsWith('https://github.com/')) {
    return parseGitHubHttpsUrl(trimmed)
  }

  if (trimmed.startsWith('git@github.com:')) {
    return parseGitHubSshUrl(trimmed)
  }

  if (trimmed.startsWith('http://github.com/')) {
    return parseGitHubHttpsUrl(trimmed.replace('http://', 'https://'))
  }

  return err({
    type: 'unsupported_host',
    message: `Unsupported template format: ${input}. Use github:user/repo or a GitHub URL.`,
  })
}

function parseGitHubShorthand(input: string): Result<RemoteTemplateRef, ParseError> {
  const [repoPath, ref] = input.split('#')

  if (!repoPath) {
    return err({
      type: 'missing_repo',
      message: 'Missing repository path. Use format: github:user/repo',
    })
  }

  const parts = repoPath.split('/')

  if (parts.length !== 2) {
    return err({
      type: 'invalid_format',
      message: `Invalid repository format: ${repoPath}. Use format: user/repo`,
    })
  }

  const [owner, repo] = parts

  if (!(owner && repo)) {
    return err({
      type: 'invalid_format',
      message: `Invalid repository format: ${repoPath}. Both owner and repo are required.`,
    })
  }

  if (!(isValidGitHubName(owner) && isValidGitHubName(repo))) {
    return err({
      type: 'invalid_format',
      message: `Invalid GitHub owner or repository name in: ${repoPath}`,
    })
  }

  return ok({
    owner,
    repo,
    ref,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
  })
}

function parseGitHubHttpsUrl(input: string): Result<RemoteTemplateRef, ParseError> {
  try {
    const url = new URL(input)

    let pathname = url.pathname.slice(1)
    if (pathname.endsWith('.git')) {
      pathname = pathname.slice(0, -4)
    }

    const parts = pathname.split('/')

    if (parts.length < 2) {
      return err({
        type: 'invalid_format',
        message: `Invalid GitHub URL: ${input}. Expected format: https://github.com/user/repo`,
      })
    }

    const owner = parts[0]
    const repo = parts[1]

    if (!(owner && repo)) {
      return err({
        type: 'invalid_format',
        message: `Invalid GitHub URL: ${input}. Both owner and repo are required.`,
      })
    }

    let ref: string | undefined
    if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      ref = parts[3]
    }

    return ok({
      owner,
      repo,
      ref,
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
    })
  } catch {
    return err({
      type: 'invalid_format',
      message: `Invalid URL: ${input}`,
    })
  }
}

function parseGitHubSshUrl(input: string): Result<RemoteTemplateRef, ParseError> {
  let repoPath = input.slice(15)

  if (repoPath.endsWith('.git')) {
    repoPath = repoPath.slice(0, -4)
  }

  const parts = repoPath.split('/')

  if (parts.length !== 2) {
    return err({
      type: 'invalid_format',
      message: `Invalid SSH URL: ${input}. Expected format: git@github.com:user/repo.git`,
    })
  }

  const [owner, repo] = parts

  if (!(owner && repo)) {
    return err({
      type: 'invalid_format',
      message: `Invalid SSH URL: ${input}. Both owner and repo are required.`,
    })
  }

  return ok({
    owner,
    repo,
    ref: undefined,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
  })
}

function isValidGitHubName(name: string): boolean {
  if (name.length === 0 || name.length > 100) {
    return false
  }

  if (name.startsWith('-')) {
    return false
  }

  return /^[a-zA-Z0-9_-]+$/.test(name)
}

export function formatRemoteRef(ref: RemoteTemplateRef): string {
  let display = `github:${ref.owner}/${ref.repo}`
  if (ref.ref) {
    display += `#${ref.ref}`
  }
  return display
}
