/**
 * File-based Plugin Loader
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { PluginManifest, TrustLevel } from '@application/ports/output/plugin-repository.port.js';
import { PluginId } from '@domain/value-objects/index.js';
import { Logger } from '@shared/utils/logger.js';
import { PluginManifestSchema, LoadedPluginInfo, PluginRuntime } from '../types.js';
import { PLUGIN } from '@shared/constants.js';

/**
 * File-based Plugin Loader
 */
export class FilePluginLoader {
  constructor(
    private readonly runtime: PluginRuntime,
    private readonly logger: Logger
  ) {}

  /**
   * Discover plugin manifest from a directory
   */
  async discover(pluginPath: string): Promise<PluginManifest> {
    try {
      const manifestPath = join(pluginPath, PLUGIN.MANIFEST_FILENAME);
      this.logger.debug(`Reading plugin manifest: ${manifestPath}`);

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifestData = JSON.parse(manifestContent) as PluginManifestSchema;

      // Validate manifest
      this.validateManifest(manifestData);

      // Create plugin manifest
      const manifest: PluginManifest = {
        id: PluginId.create(`plugin-${manifestData.name}`),
        name: manifestData.name,
        version: manifestData.version,
        main: join(pluginPath, manifestData.main),
        type: manifestData.type,
        trustLevel: (manifestData.trustLevel ?? PLUGIN.DEFAULT_TRUST_LEVEL) as TrustLevel,
        capabilities: manifestData.capabilities ?? [],
        dependencies: manifestData.dependencies ?? {},
        metadata: {
          ...manifestData.metadata,
          pluginPath,
        },
      };

      return manifest;
    } catch (error) {
      this.logger.error('Failed to discover plugin:', error);
      throw new Error(
        `Failed to discover plugin at ${pluginPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load a plugin
   */
  async load(manifest: PluginManifest): Promise<LoadedPluginInfo> {
    try {
      this.logger.info(`Loading plugin: ${manifest.name}`);

      // Check if already loaded
      if (this.runtime.isLoaded(manifest.id)) {
        throw new Error(`Plugin already loaded: ${manifest.name}`);
      }

      // Get plugin path from manifest
      const pluginPath = manifest.metadata.pluginPath as string;
      if (!pluginPath) {
        throw new Error('Plugin path not found in manifest metadata');
      }

      // Load the plugin using the runtime
      const loadedPlugin = await this.runtime.load(manifest, pluginPath);

      this.logger.info(`Plugin loaded successfully: ${manifest.name}`);

      return loadedPlugin;
    } catch (error) {
      this.logger.error('Failed to load plugin:', error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: PluginId): Promise<void> {
    try {
      this.logger.info(`Unloading plugin: ${pluginId.toString()}`);

      if (!this.runtime.isLoaded(pluginId)) {
        throw new Error(`Plugin not loaded: ${pluginId.toString()}`);
      }

      await this.runtime.unload(pluginId);

      this.logger.info(`Plugin unloaded successfully: ${pluginId.toString()}`);
    } catch (error) {
      this.logger.error('Failed to unload plugin:', error);
      throw error;
    }
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: PluginId): boolean {
    return this.runtime.isLoaded(pluginId);
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifestSchema): void {
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Invalid plugin manifest: name is required');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Invalid plugin manifest: version is required');
    }

    if (!manifest.main || typeof manifest.main !== 'string') {
      throw new Error('Invalid plugin manifest: main is required');
    }

    if (!manifest.type || !PLUGIN.SUPPORTED_TYPES.includes(manifest.type)) {
      throw new Error(
        `Invalid plugin manifest: type must be one of ${PLUGIN.SUPPORTED_TYPES.join(', ')}`
      );
    }

    if (
      manifest.trustLevel &&
      !PLUGIN.SUPPORTED_TRUST_LEVELS.includes(manifest.trustLevel)
    ) {
      throw new Error(
        `Invalid plugin manifest: trustLevel must be one of ${PLUGIN.SUPPORTED_TRUST_LEVELS.join(', ')}`
      );
    }
  }
}
