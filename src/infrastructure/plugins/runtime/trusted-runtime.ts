/**
 * Trusted Plugin Runtime
 * Runs plugins in the same process with full access
 */

import { pathToFileURL } from 'url';
import { PluginManifest } from '@application/ports/output/plugin-repository.port.js';
import { PluginId } from '@domain/value-objects/index.js';
import { Logger } from '@shared/utils/logger.js';
import { JsonValue } from '@shared/types/index.js';
import { ToolRegistry } from '@application/ports/output/tool.port.js';
import { Tool } from '@domain/entities/tool.js';
import { ToolId } from '@domain/value-objects/index.js';
import {
  Plugin,
  PluginContext,
  PluginRuntime,
  LoadedPluginInfo,
  PluginEvent,
  EventHandler,
  ToolExecutor,
} from '../types.js';

/**
 * Trusted Plugin Runtime implementation
 */
export class TrustedPluginRuntime implements PluginRuntime {
  private loadedPlugins: Map<string, LoadedPluginInfo> = new Map();

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly logger: Logger
  ) {}

  async load(manifest: PluginManifest, _pluginPath: string): Promise<LoadedPluginInfo> {
    try {
      this.logger.info(`Loading trusted plugin: ${manifest.name}`);

      // Import the plugin module
      const pluginModulePath = pathToFileURL(manifest.main).href;
      const pluginModule = (await import(pluginModulePath)) as {
        default: new () => Plugin;
      };

      // Create plugin instance
      const PluginClass = pluginModule.default;
      const pluginInstance = new PluginClass();

      // Create plugin context
      const context = this.createContext(manifest.id);

      // Initialize the plugin
      await pluginInstance.initialize(context);

      // Store loaded plugin info
      const loadedPlugin: LoadedPluginInfo = {
        manifest,
        instance: pluginInstance,
        context,
        loadedAt: new Date(),
      };

      this.loadedPlugins.set(manifest.id.toString(), loadedPlugin);

      this.logger.info(`Trusted plugin loaded: ${manifest.name}`);

      return loadedPlugin;
    } catch (error) {
      this.logger.error('Failed to load trusted plugin:', error);
      throw new Error(
        `Failed to load plugin ${manifest.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async unload(pluginId: PluginId): Promise<void> {
    const pluginInfo = this.loadedPlugins.get(pluginId.toString());
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${pluginId.toString()}`);
    }

    try {
      this.logger.info(`Unloading trusted plugin: ${pluginInfo.manifest.name}`);

      // Cleanup the plugin
      await pluginInfo.instance.cleanup();

      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId.toString());

      this.logger.info(`Trusted plugin unloaded: ${pluginInfo.manifest.name}`);
    } catch (error) {
      this.logger.error('Failed to unload trusted plugin:', error);
      throw error;
    }
  }

  isLoaded(pluginId: PluginId): boolean {
    return this.loadedPlugins.has(pluginId.toString());
  }

  getLoadedPlugin(pluginId: PluginId): LoadedPluginInfo | undefined {
    return this.loadedPlugins.get(pluginId.toString());
  }

  /**
   * Create plugin context
   */
  private createContext(pluginId: PluginId): PluginContext {
    const logger = this.logger.child(`plugin:${pluginId.toString()}`);
    const eventHandlers: Map<string, EventHandler[]> = new Map();

    const context: PluginContext = {
      pluginId,
      logger,
      config: {},

      registerTool: (definition, executor: ToolExecutor) => {
        logger.info(`Registering tool: ${definition.name}`);

        const tool = new Tool(
          ToolId.create(),
          definition.name,
          definition.description,
          definition.parameters,
          async (params) => {
            try {
              const result = await executor(params);
              return {
                success: result.success,
                output: result.output as JsonValue,
                error: result.error,
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          }
        );

        this.toolRegistry.register(tool);
      },

      emit: (event: PluginEvent) => {
        const handlers = eventHandlers.get(event.type) ?? [];
        for (const handler of handlers) {
          const result = handler(event);
          if (result instanceof Promise) {
            void result.catch((error: Error) => {
              logger.error(`Event handler error for ${event.type}:`, error);
            });
          }
        }
      },

      on: (eventType: string, handler: EventHandler) => {
        const handlers = eventHandlers.get(eventType) ?? [];
        handlers.push(handler);
        eventHandlers.set(eventType, handlers);
      },
    };

    return context;
  }
}
