/**
 * Load Plugin use case implementation
 */

import {
  LoadPluginUseCase,
  LoadPluginRequest,
  LoadPluginResponse,
  UnloadPluginRequest,
  UnloadPluginResponse,
} from '../ports/input/load-plugin.port.js';
import { PluginRepository, PluginManifest, PluginStatus } from '../ports/output/plugin-repository.port.js';
import { PluginId } from '@domain/value-objects/index.js';
import { Result, ok, err } from '@shared/types/result.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * Plugin loader interface (to be implemented in infrastructure)
 */
export interface PluginLoader {
  discover(path: string): Promise<PluginManifest>;
  load(manifest: PluginManifest): Promise<{ manifest: PluginManifest }>;
  unload(pluginId: PluginId): Promise<void>;
  isLoaded(pluginId: PluginId): boolean;
}

/**
 * Load Plugin use case implementation
 */
export class LoadPluginUseCaseImpl implements LoadPluginUseCase {
  constructor(
    private readonly pluginRepository: PluginRepository,
    private readonly pluginLoader: PluginLoader,
    private readonly logger: Logger
  ) {}

  async load(request: LoadPluginRequest): Promise<Result<LoadPluginResponse, Error>> {
    try {
      this.logger.info(`Loading plugin from: ${request.pluginPath}`);

      // Discover plugin manifest
      const manifest = await this.pluginLoader.discover(request.pluginPath);

      // Check if already loaded
      const exists = await this.pluginRepository.has(manifest.id);
      if (exists && !request.force) {
        return err(new Error(`Plugin already loaded: ${manifest.name}`));
      }

      // Unload if forcing reload
      if (exists && request.force) {
        this.logger.info(`Force reloading plugin: ${manifest.name}`);
        await this.pluginLoader.unload(manifest.id);
      }

      // Load the plugin
      await this.pluginLoader.load(manifest);

      // Register in repository
      await this.pluginRepository.register(manifest);

      const loadedAt = new Date();

      this.logger.info(`Plugin loaded successfully: ${manifest.name}`);

      return ok({
        pluginId: manifest.id,
        manifest,
        status: PluginStatus.Loaded,
        loadedAt,
      });
    } catch (error) {
      this.logger.error('Failed to load plugin:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async unload(request: UnloadPluginRequest): Promise<Result<UnloadPluginResponse, Error>> {
    try {
      this.logger.info(`Unloading plugin: ${request.pluginId.toString()}`);

      // Check if plugin exists
      const exists = await this.pluginRepository.has(request.pluginId);
      if (!exists) {
        return err(new Error(`Plugin not found: ${request.pluginId.toString()}`));
      }

      // Unload the plugin
      await this.pluginLoader.unload(request.pluginId);

      // Unregister from repository
      await this.pluginRepository.unregister(request.pluginId);

      const unloadedAt = new Date();

      this.logger.info(`Plugin unloaded successfully: ${request.pluginId.toString()}`);

      return ok({
        success: true,
        unloadedAt,
      });
    } catch (error) {
      this.logger.error('Failed to unload plugin:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async list(): Promise<Result<PluginManifest[], Error>> {
    try {
      const manifests = await this.pluginRepository.list();
      return ok(manifests);
    } catch (error) {
      this.logger.error('Failed to list plugins:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
