import { clearCache, formatSize, listCachedTemplates } from '../remote/cache.js'
import { parseRemoteTemplate } from '../remote/parser.js'
import { bold, cyan, dim, green, red, yellow } from '../utils/colors.js'

export async function listCache(): Promise<void> {
  const templates = listCachedTemplates()

  if (templates.length === 0) {
    console.log(dim('No cached templates'))
    console.log('')
    console.log(`Use ${cyan('bakery --template github:user/repo')} to fetch a remote template`)
    return
  }

  console.log(bold('Cached Templates'))
  console.log('')

  let totalSize = 0

  for (const template of templates) {
    const refDisplay = template.ref === 'default' ? dim('(default branch)') : cyan(template.ref)
    console.log(`  ${green('•')} ${bold(`${template.owner}/${template.repo}`)} ${refDisplay}`)
    console.log(`    ${dim(`Size: ${formatSize(template.size)}`)}`)
    console.log(`    ${dim(`Cached: ${template.cachedAt.toLocaleDateString()}`)}`)
    console.log('')
    totalSize += template.size
  }

  console.log(dim(`Total: ${templates.length} template(s), ${formatSize(totalSize)}`))
}

export async function clearCacheCommand(templateSpec?: string): Promise<void> {
  if (templateSpec) {
    const parseResult = parseRemoteTemplate(templateSpec)

    if (parseResult.isErr()) {
      console.error(red(parseResult.error.message))
      process.exit(1)
    }

    const { removed, freed } = clearCache(parseResult.value)

    if (removed === 0) {
      console.log(yellow('Template not found in cache'))
      return
    }

    console.log(green(`Removed ${templateSpec} (${formatSize(freed)} freed)`))
  } else {
    const { removed, freed } = clearCache()

    if (removed === 0) {
      console.log(dim('Cache is already empty'))
      return
    }

    console.log(green(`Cleared ${removed} template(s), ${formatSize(freed)} freed`))
  }
}

export function printCacheHelp(): void {
  console.log(`
${bold('bakery cache')} - Manage cached remote templates

${bold('USAGE:')}
  bakery cache <command> [options]

${bold('COMMANDS:')}
  list                  List cached templates
  clear                 Remove all cached templates
  clear <template>      Remove a specific cached template

${bold('EXAMPLES:')}
  ${dim('# List all cached templates')}
  bakery cache list

  ${dim('# Clear entire cache')}
  bakery cache clear

  ${dim('# Clear a specific template')}
  bakery cache clear github:user/repo
  bakery cache clear github:user/repo#v1.0.0
`)
}

export async function handleCacheCommand(args: string[]): Promise<void> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'list':
    case 'ls':
    case undefined:
      await listCache()
      break

    case 'clear':
    case 'clean':
    case 'rm':
      await clearCacheCommand(args[1])
      break

    case 'help':
    case '-h':
    case '--help':
      printCacheHelp()
      break

    default:
      console.error(red(`Unknown subcommand: ${subcommand}`))
      printCacheHelp()
      process.exit(1)
  }
}
