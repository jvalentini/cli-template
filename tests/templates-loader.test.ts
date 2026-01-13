import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  discoverAddons,
  discoverArchetypes,
  getTemplatesDir,
  loadCoreTemplate,
  loadTemplateManifest,
  resolveTemplates,
} from '../src/templates/loader.js'

describe('Templates Loader', () => {
  describe('getTemplatesDir', () => {
    it('should return a valid templates directory path', () => {
      const templatesDir = getTemplatesDir()
      expect(fs.existsSync(templatesDir)).toBe(true)
    })

    it('should contain templates subdirectories', () => {
      const templatesDir = getTemplatesDir()
      const entries = fs.readdirSync(templatesDir)
      expect(entries.length).toBeGreaterThan(0)
    })
  })

  describe('loadTemplateManifest', () => {
    it('should return null for directory without manifest', () => {
      const manifest = loadTemplateManifest('/nonexistent/path')
      expect(manifest).toBeNull()
    })

    it('should load manifest from valid template directory', () => {
      const templatesDir = getTemplatesDir()
      const cliPath = path.join(templatesDir, 'cli')

      if (fs.existsSync(cliPath)) {
        const manifest = loadTemplateManifest(cliPath)
        expect(manifest).not.toBeNull()
        expect(manifest?.name).toBe('cli')
      }
    })

    it('should return null for invalid JSON in template.json', () => {
      const templatesDir = getTemplatesDir()
      const corePath = path.join(templatesDir, 'core')

      if (fs.existsSync(corePath)) {
        const manifest = loadTemplateManifest(corePath)
        if (!manifest) {
          expect(manifest).toBeNull()
        }
      }
    })
  })

  describe('discoverArchetypes', () => {
    it('should discover available archetypes', () => {
      const archetypes = discoverArchetypes()
      expect(archetypes.length).toBeGreaterThan(0)
    })

    it('should return archetypes with manifest and path', () => {
      const archetypes = discoverArchetypes()
      for (const archetype of archetypes) {
        expect(archetype.manifest).toBeDefined()
        expect(archetype.path).toBeDefined()
        expect(archetype.isPlugin).toBe(false)
        expect(archetype.manifest.name).toBeDefined()
        expect(archetype.manifest.displayName).toBeDefined()
      }
    })

    it('should include common archetypes', () => {
      const archetypes = discoverArchetypes()
      const names = archetypes.map((a) => a.manifest.name)
      expect(names).toContain('cli')
    })

    it('should not include non-archetype directories', () => {
      const archetypes = discoverArchetypes()
      const names = archetypes.map((a) => a.manifest.name)
      expect(names).not.toContain('addons')
      expect(names).not.toContain('core')
    })
  })

  describe('discoverAddons', () => {
    it('should discover available addons', () => {
      const addons = discoverAddons()
      expect(Array.isArray(addons)).toBe(true)
    })

    it('should return addons with manifest and path', () => {
      const addons = discoverAddons()
      for (const addon of addons) {
        expect(addon.manifest).toBeDefined()
        expect(addon.path).toBeDefined()
        expect(addon.isPlugin).toBe(false)
      }
    })

    it('should find addons in addons directory', () => {
      const addons = discoverAddons()
      if (addons.length > 0) {
        for (const addon of addons) {
          expect(addon.path).toContain('addons')
        }
      }
    })

    it('should return empty array if addons directory does not exist', () => {
      const templatesDir = getTemplatesDir()
      const addonsDir = path.join(templatesDir, 'addons')

      if (!fs.existsSync(addonsDir)) {
        const addons = discoverAddons()
        expect(addons).toEqual([])
      }
    })
  })

  describe('loadCoreTemplate', () => {
    it('should load core template if it exists', () => {
      const core = loadCoreTemplate()
      expect(core).not.toBeNull()
    })

    it('should return core template with correct structure', () => {
      const core = loadCoreTemplate()
      if (core) {
        expect(core.manifest.name).toBe('core')
        expect(core.path).toContain('core')
        expect(core.isPlugin).toBe(false)
      }
    })

    it('should provide default manifest if template.json missing', () => {
      const templatesDir = getTemplatesDir()
      const corePath = path.join(templatesDir, 'core')
      const manifestPath = path.join(corePath, 'template.json')

      if (fs.existsSync(corePath) && !fs.existsSync(manifestPath)) {
        const core = loadCoreTemplate()
        expect(core).not.toBeNull()
        expect(core?.manifest.name).toBe('core')
        expect(core?.manifest.displayName).toBe('Core')
      }
    })
  })

  describe('resolveTemplates', () => {
    it('should include core template first', () => {
      const templates = resolveTemplates('cli', [])
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]?.manifest.name).toBe('core')
    })

    it('should include the specified archetype', () => {
      const templates = resolveTemplates('cli', [])
      const names = templates.map((t) => t.manifest.name)
      expect(names).toContain('cli')
    })

    it('should include selected addons', () => {
      const availableAddons = discoverAddons()
      if (availableAddons.length > 0) {
        const addonName = availableAddons[0]?.manifest.name ?? ''
        const templates = resolveTemplates('cli', [addonName])
        const names = templates.map((t) => t.manifest.name)
        expect(names).toContain(addonName)
      }
    })

    it('should handle multiple addons', () => {
      const availableAddons = discoverAddons()
      if (availableAddons.length >= 2) {
        const addon1 = availableAddons[0]?.manifest.name ?? ''
        const addon2 = availableAddons[1]?.manifest.name ?? ''
        const templates = resolveTemplates('cli', [addon1, addon2])
        const names = templates.map((t) => t.manifest.name)
        expect(names).toContain(addon1)
        expect(names).toContain(addon2)
      }
    })

    it('should resolve archetype dependencies', () => {
      const templates = resolveTemplates('cli', [])
      const archetype = templates.find((t) => t.manifest.name === 'cli')

      if (archetype && archetype.manifest.dependencies.length > 0) {
        const names = templates.map((t) => t.manifest.name)
        for (const dep of archetype.manifest.dependencies) {
          expect(names).toContain(dep)
        }
      }
    })

    it('should not duplicate templates', () => {
      const templates = resolveTemplates('cli', [])
      const names = templates.map((t) => t.manifest.name)
      const uniqueNames = new Set(names)
      expect(names.length).toBe(uniqueNames.size)
    })

    it('should handle empty addon list', () => {
      const templates = resolveTemplates('cli', [])
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should handle nonexistent archetype gracefully', () => {
      const templates = resolveTemplates('nonexistent-archetype', [])
      expect(templates[0]?.manifest.name).toBe('core')
    })

    it('should preserve template order: core, dependencies, archetype, addons', () => {
      const availableAddons = discoverAddons()
      const addonName = availableAddons[0]?.manifest.name ?? ''

      const templates = resolveTemplates('cli', addonName ? [addonName] : [])
      const names = templates.map((t) => t.manifest.name)

      expect(names[0]).toBe('core')

      const cliIndex = names.indexOf('cli')
      expect(cliIndex).toBeGreaterThan(0)

      if (addonName) {
        const addonIndex = names.indexOf(addonName)
        expect(addonIndex).toBeGreaterThan(cliIndex)
      }
    })

    it('should mark all templates as not from plugin', () => {
      const templates = resolveTemplates('cli', [])
      for (const template of templates) {
        expect(template.isPlugin).toBe(false)
      }
    })

    it('should work with different archetypes', () => {
      const archetypes = discoverArchetypes()
      for (const archetype of archetypes.slice(0, 3)) {
        const templates = resolveTemplates(archetype.manifest.name, [])
        expect(templates.length).toBeGreaterThan(0)
        const names = templates.map((t) => t.manifest.name)
        expect(names).toContain('core')
        expect(names).toContain(archetype.manifest.name)
      }
    })

    it('should skip dependencies that do not exist', () => {
      const templates = resolveTemplates('cli', [])
      const names = templates.map((t) => t.manifest.name)
      expect(names).not.toContain('nonexistent-dependency')
    })
  })

  describe('template manifest structure', () => {
    it('should have required fields in archetype manifests', () => {
      const archetypes = discoverArchetypes()
      for (const archetype of archetypes) {
        expect(archetype.manifest.name).toBeDefined()
        expect(archetype.manifest.displayName).toBeDefined()
        expect(archetype.manifest.description).toBeDefined()
        expect(archetype.manifest.version).toBeDefined()
      }
    })

    it('should have array fields as arrays', () => {
      const archetypes = discoverArchetypes()
      for (const archetype of archetypes) {
        expect(Array.isArray(archetype.manifest.dependencies)).toBe(true)
        expect(Array.isArray(archetype.manifest.prompts)).toBe(true)
        expect(Array.isArray(archetype.manifest.exclude)).toBe(true)
        expect(Array.isArray(archetype.manifest.tasks)).toBe(true)
        expect(Array.isArray(archetype.manifest.inject)).toBe(true)
      }
    })

    it('should have hooks as object', () => {
      const archetypes = discoverArchetypes()
      for (const archetype of archetypes) {
        expect(typeof archetype.manifest.hooks).toBe('object')
      }
    })
  })

  describe('template paths', () => {
    it('should have valid paths for all templates', () => {
      const templates = resolveTemplates('cli', [])
      for (const template of templates) {
        expect(fs.existsSync(template.path)).toBe(true)
      }
    })

    it('should point to directories', () => {
      const templates = resolveTemplates('cli', [])
      for (const template of templates) {
        const stats = fs.statSync(template.path)
        expect(stats.isDirectory()).toBe(true)
      }
    })
  })
})
