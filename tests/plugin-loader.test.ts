/**
 * Tests for plugin loader
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  createPluginRegistry,
  discoverPluginsInDir,
  getLocalPluginsDir,
  getPluginSearchPaths,
  getUserPluginsDir,
  loadPlugin,
  loadPluginManifest,
  PluginManifestSchema,
} from '../src/plugins/index.js'

describe('Plugin Loader', () => {
  let testDir: string

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-plugin-test-'))
  })

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  describe('PluginManifestSchema', () => {
    it('should validate a valid manifest', () => {
      const manifest = {
        name: 'bakery-plugin-test',
        displayName: 'Test Plugin',
        description: 'A test plugin',
        version: '1.0.0',
      }

      const result = PluginManifestSchema.parse(manifest)
      expect(result.name).toBe('bakery-plugin-test')
      expect(result.displayName).toBe('Test Plugin')
      expect(result.templates).toEqual([])
    })

    it('should validate a manifest with all fields', () => {
      const manifest = {
        name: 'bakery-plugin-full',
        displayName: 'Full Plugin',
        description: 'A fully configured plugin',
        version: '2.0.0',
        author: 'Test Author',
        homepage: 'https://example.com',
        bakeryVersion: '>=1.0.0',
        templates: ['./templates/addon1'],
        archetypes: ['./archetypes/custom'],
        addons: ['./addons/custom-addon'],
        keywords: ['bakery', 'plugin'],
        dependencies: ['other-plugin'],
      }

      const result = PluginManifestSchema.parse(manifest)
      expect(result.templates).toHaveLength(1)
      expect(result.archetypes).toHaveLength(1)
      expect(result.addons).toHaveLength(1)
    })

    it('should reject manifest without required fields', () => {
      expect(() => PluginManifestSchema.parse({})).toThrow()
      expect(() => PluginManifestSchema.parse({ name: 'test' })).toThrow()
    })

    it('should reject invalid version format', () => {
      expect(() =>
        PluginManifestSchema.parse({
          name: 'test',
          displayName: 'Test',
          description: 'Test',
          version: 'invalid',
        }),
      ).toThrow()
    })

    it('should reject invalid homepage URL', () => {
      expect(() =>
        PluginManifestSchema.parse({
          name: 'test',
          displayName: 'Test',
          description: 'Test',
          version: '1.0.0',
          homepage: 'not-a-url',
        }),
      ).toThrow()
    })
  })

  describe('Plugin Paths', () => {
    it('should return user plugins directory', () => {
      const userDir = getUserPluginsDir()
      expect(userDir).toContain('.bakery')
      expect(userDir).toContain('plugins')
    })

    it('should return local plugins directory', () => {
      const localDir = getLocalPluginsDir()
      expect(localDir).toContain('bakery-plugins')
    })

    it('should return search paths in correct order', () => {
      const paths = getPluginSearchPaths()
      expect(paths).toHaveLength(2)
      // Local should come before user
      expect(paths[0]).toContain('bakery-plugins')
      expect(paths[1]).toContain('.bakery')
    })
  })

  describe('Plugin Discovery', () => {
    let pluginsDir: string

    beforeEach(() => {
      pluginsDir = path.join(testDir, 'test-plugins')
      fs.mkdirSync(pluginsDir, { recursive: true })
    })

    afterEach(() => {
      if (fs.existsSync(pluginsDir)) {
        fs.rmSync(pluginsDir, { recursive: true, force: true })
      }
    })

    it('should return empty array for non-existent directory', () => {
      const plugins = discoverPluginsInDir('/non/existent/path')
      expect(plugins).toEqual([])
    })

    it('should discover plugins with plugin.json', () => {
      // Create a test plugin
      const pluginDir = path.join(pluginsDir, 'test-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'A test plugin',
          version: '1.0.0',
        }),
      )

      const plugins = discoverPluginsInDir(pluginsDir)
      expect(plugins).toHaveLength(1)
      expect(plugins[0]).toContain('test-plugin')
    })

    it('should ignore directories without plugin.json', () => {
      // Create a directory without plugin.json
      const notAPlugin = path.join(pluginsDir, 'not-a-plugin')
      fs.mkdirSync(notAPlugin, { recursive: true })
      fs.writeFileSync(path.join(notAPlugin, 'readme.md'), 'Not a plugin')

      const plugins = discoverPluginsInDir(pluginsDir)
      expect(plugins).toEqual([])
    })

    it('should discover multiple plugins', () => {
      // Create multiple plugins
      for (let i = 1; i <= 3; i++) {
        const pluginDir = path.join(pluginsDir, `plugin-${i}`)
        fs.mkdirSync(pluginDir, { recursive: true })
        fs.writeFileSync(
          path.join(pluginDir, 'plugin.json'),
          JSON.stringify({
            name: `plugin-${i}`,
            displayName: `Plugin ${i}`,
            description: `Plugin number ${i}`,
            version: '1.0.0',
          }),
        )
      }

      const plugins = discoverPluginsInDir(pluginsDir)
      expect(plugins).toHaveLength(3)
    })
  })

  describe('Plugin Loading', () => {
    let pluginDir: string

    beforeEach(() => {
      pluginDir = path.join(testDir, 'load-test-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
    })

    afterEach(() => {
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }
    })

    it('should load plugin manifest from plugin.json', () => {
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'A test plugin',
          version: '1.0.0',
          templates: ['./templates/addon1'],
        }),
      )

      const manifest = loadPluginManifest(pluginDir)
      expect(manifest).not.toBeNull()
      expect(manifest?.name).toBe('test-plugin')
      expect(manifest?.templates).toHaveLength(1)
    })

    it('should return null for directory without manifest', () => {
      const manifest = loadPluginManifest(pluginDir)
      expect(manifest).toBeNull()
    })

    it('should return null for invalid manifest', () => {
      fs.writeFileSync(path.join(pluginDir, 'plugin.json'), '{ invalid json }')

      const manifest = loadPluginManifest(pluginDir)
      expect(manifest).toBeNull()
    })

    it('should load a complete plugin', async () => {
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'complete-plugin',
          displayName: 'Complete Plugin',
          description: 'A complete test plugin',
          version: '1.0.0',
        }),
      )

      const plugin = await loadPlugin(pluginDir)
      expect(plugin).not.toBeNull()
      expect(plugin?.manifest.name).toBe('complete-plugin')
      expect(plugin?.pluginDir).toBe(pluginDir)
      expect(plugin?.active).toBe(true)
    })

    it('should return null for invalid plugin directory', async () => {
      const plugin = await loadPlugin('/non/existent/path')
      expect(plugin).toBeNull()
    })
  })

  describe('Plugin Registry', () => {
    let registry: ReturnType<typeof createPluginRegistry>
    let pluginsDir: string

    beforeEach(() => {
      registry = createPluginRegistry()
      pluginsDir = path.join(testDir, 'registry-test')
      fs.mkdirSync(pluginsDir, { recursive: true })
    })

    afterEach(() => {
      registry.clear()
      if (fs.existsSync(pluginsDir)) {
        fs.rmSync(pluginsDir, { recursive: true, force: true })
      }
    })

    it('should start with no plugins', () => {
      expect(registry.getPlugins()).toHaveLength(0)
    })

    it('should load a plugin', async () => {
      const pluginDir = path.join(pluginsDir, 'test-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'A test plugin',
          version: '1.0.0',
        }),
      )

      const plugin = await registry.load(pluginDir)
      expect(plugin.manifest.name).toBe('test-plugin')
      expect(registry.getPlugins()).toHaveLength(1)
    })

    it('should get plugin by name', async () => {
      const pluginDir = path.join(pluginsDir, 'named-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'named-plugin',
          displayName: 'Named Plugin',
          description: 'A named plugin',
          version: '1.0.0',
        }),
      )

      await registry.load(pluginDir)
      const plugin = registry.getPlugin('named-plugin')
      expect(plugin).not.toBeUndefined()
      expect(plugin?.manifest.name).toBe('named-plugin')
    })

    it('should return undefined for unknown plugin', () => {
      const plugin = registry.getPlugin('unknown')
      expect(plugin).toBeUndefined()
    })

    it('should unload a plugin', async () => {
      const pluginDir = path.join(pluginsDir, 'unload-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'unload-plugin',
          displayName: 'Unload Plugin',
          description: 'A plugin to unload',
          version: '1.0.0',
        }),
      )

      await registry.load(pluginDir)
      expect(registry.getPlugins()).toHaveLength(1)

      await registry.unload('unload-plugin')
      expect(registry.getPlugins()).toHaveLength(0)
      expect(registry.getPlugin('unload-plugin')).toBeUndefined()
    })

    it('should clear all plugins', async () => {
      // Load multiple plugins
      for (let i = 1; i <= 3; i++) {
        const pluginDir = path.join(pluginsDir, `plugin-${i}`)
        fs.mkdirSync(pluginDir, { recursive: true })
        fs.writeFileSync(
          path.join(pluginDir, 'plugin.json'),
          JSON.stringify({
            name: `plugin-${i}`,
            displayName: `Plugin ${i}`,
            description: `Plugin number ${i}`,
            version: '1.0.0',
          }),
        )
        await registry.load(pluginDir)
      }

      expect(registry.getPlugins()).toHaveLength(3)

      registry.clear()
      expect(registry.getPlugins()).toHaveLength(0)
    })

    it('should throw when loading invalid plugin', async () => {
      expect(registry.load('/non/existent/path')).rejects.toThrow()
    })
  })

  describe('Plugin Templates', () => {
    let pluginDir: string

    beforeEach(() => {
      pluginDir = path.join(testDir, 'template-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
    })

    afterEach(() => {
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }
    })

    it('should load templates from plugin', async () => {
      // Create plugin with templates
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'template-plugin',
          displayName: 'Template Plugin',
          description: 'A plugin with templates',
          version: '1.0.0',
          templates: ['./templates/my-addon'],
        }),
      )

      // Create template directory with manifest
      const templateDir = path.join(pluginDir, 'templates', 'my-addon')
      fs.mkdirSync(templateDir, { recursive: true })
      fs.writeFileSync(
        path.join(templateDir, 'template.json'),
        JSON.stringify({
          name: 'my-addon',
          displayName: 'My Addon',
          description: 'A custom addon',
        }),
      )

      const plugin = await loadPlugin(pluginDir)
      expect(plugin).not.toBeNull()
      expect(plugin?.templates).toHaveLength(1)
      expect(plugin?.templates[0]?.manifest.name).toBe('my-addon')
      expect(plugin?.templates[0]?.isPlugin).toBe(true)
    })

    it('should handle missing template directories gracefully', async () => {
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'missing-templates',
          displayName: 'Missing Templates Plugin',
          description: 'A plugin with missing templates',
          version: '1.0.0',
          templates: ['./templates/non-existent'],
        }),
      )

      const plugin = await loadPlugin(pluginDir)
      expect(plugin).not.toBeNull()
      expect(plugin?.templates).toHaveLength(0)
    })

    it('should load archetypes from plugin', async () => {
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'archetype-plugin',
          displayName: 'Archetype Plugin',
          description: 'Plugin with custom archetype',
          version: '1.0.0',
          archetypes: ['./archetypes/custom'],
        }),
      )

      const archetypeDir = path.join(pluginDir, 'archetypes', 'custom')
      fs.mkdirSync(archetypeDir, { recursive: true })
      fs.writeFileSync(
        path.join(archetypeDir, 'template.json'),
        JSON.stringify({
          name: 'custom',
          displayName: 'Custom Archetype',
          description: 'A custom archetype',
        }),
      )

      const plugin = await loadPlugin(pluginDir)
      expect(plugin).not.toBeNull()
      expect(plugin?.templates).toHaveLength(1)
      expect(plugin?.templates[0]?.manifest.name).toBe('custom')
    })

    it('should load addons from plugin', async () => {
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'addon-plugin',
          displayName: 'Addon Plugin',
          description: 'Plugin with custom addon',
          version: '1.0.0',
          addons: ['./addons/custom-feature'],
        }),
      )

      const addonDir = path.join(pluginDir, 'addons', 'custom-feature')
      fs.mkdirSync(addonDir, { recursive: true })
      fs.writeFileSync(
        path.join(addonDir, 'template.json'),
        JSON.stringify({
          name: 'custom-feature',
          displayName: 'Custom Feature',
          description: 'A custom addon',
        }),
      )

      const plugin = await loadPlugin(pluginDir)
      expect(plugin).not.toBeNull()
      expect(plugin?.templates).toHaveLength(1)
      expect(plugin?.templates[0]?.manifest.name).toBe('custom-feature')
    })
  })

  describe('Plugin Registry Advanced', () => {
    let registry: ReturnType<typeof createPluginRegistry>
    let pluginsDir: string

    beforeEach(() => {
      registry = createPluginRegistry()
      pluginsDir = path.join(testDir, 'registry-advanced')
      fs.mkdirSync(pluginsDir, { recursive: true })
    })

    afterEach(() => {
      registry.clear()
      if (fs.existsSync(pluginsDir)) {
        fs.rmSync(pluginsDir, { recursive: true, force: true })
      }
    })

    it('should get all templates from plugins', async () => {
      const plugin1Dir = path.join(pluginsDir, 'plugin1')
      fs.mkdirSync(plugin1Dir, { recursive: true })
      fs.writeFileSync(
        path.join(plugin1Dir, 'plugin.json'),
        JSON.stringify({
          name: 'plugin1',
          displayName: 'Plugin 1',
          description: 'First plugin',
          version: '1.0.0',
          templates: ['./templates/addon1'],
        }),
      )

      const template1Dir = path.join(plugin1Dir, 'templates', 'addon1')
      fs.mkdirSync(template1Dir, { recursive: true })
      fs.writeFileSync(
        path.join(template1Dir, 'template.json'),
        JSON.stringify({
          name: 'addon1',
          displayName: 'Addon 1',
          description: 'First addon',
        }),
      )

      await registry.load(plugin1Dir)
      const templates = registry.getAllTemplates()

      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]?.manifest.name).toBe('addon1')
      expect(templates[0]?.isPlugin).toBe(true)
    })

    it('should only return templates from active plugins', async () => {
      const pluginDir = path.join(pluginsDir, 'test-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'test-plugin',
          displayName: 'Test Plugin',
          description: 'A test plugin',
          version: '1.0.0',
          templates: ['./templates/test'],
        }),
      )

      const templateDir = path.join(pluginDir, 'templates', 'test')
      fs.mkdirSync(templateDir, { recursive: true })
      fs.writeFileSync(
        path.join(templateDir, 'template.json'),
        JSON.stringify({
          name: 'test',
          displayName: 'Test',
          description: 'Test template',
        }),
      )

      await registry.load(pluginDir)
      expect(registry.getAllTemplates()).toHaveLength(1)

      await registry.unload('test-plugin')
      expect(registry.getAllTemplates()).toHaveLength(0)
    })

    it('should return empty array when no plugins loaded', () => {
      expect(registry.getAllTemplates()).toEqual([])
    })

    it('should get hooks from plugins', async () => {
      const pluginDir = path.join(pluginsDir, 'hooks-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'hooks-plugin',
          displayName: 'Hooks Plugin',
          description: 'Plugin with hooks',
          version: '1.0.0',
        }),
      )

      await registry.load(pluginDir)
      const hooks = registry.getHooks()

      expect(Array.isArray(hooks)).toBe(true)
    })

    it('should get prompts from plugins', async () => {
      const pluginDir = path.join(pluginsDir, 'prompts-plugin')
      fs.mkdirSync(pluginDir, { recursive: true })
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'prompts-plugin',
          displayName: 'Prompts Plugin',
          description: 'Plugin with prompts',
          version: '1.0.0',
        }),
      )

      await registry.load(pluginDir)
      const prompts = registry.getAllPrompts()

      expect(Array.isArray(prompts)).toBe(true)
    })
  })
})
