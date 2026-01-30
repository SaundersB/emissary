/**
 * Plugin system types
 */

import { PluginId } from '@domain/value-objects/index.js';
import { PluginManifest, PluginType, TrustLevel } from '@application/ports/output/plugin-repository.port.js';
import { Logger } from '@shared/utils/logger.js';
import { ToolDefinition } from '@application/ports/output/tool.port.js';

/**
 * Plugin context - API surface provided to plugins
 */
export interface PluginContext {
  readonly pluginId: PluginId;
  readonly logger: Logger;
  readonly config: PluginConfig;

  // Tool registration
  registerTool(definition: ToolDefinition, executor: ToolExecutor): void;

  // Event system
  emit(event: PluginEvent): void;
  on(eventType: string, handler: EventHandler): void;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  [key: string]: unknown;
}

/**
 * Tool executor for plugins
 */
export type ToolExecutor = (params: Record<string, unknown>) => Promise<{
  success: boolean;
  output?: unknown;
  error?: string;
}>;

/**
 * Plugin event
 */
export interface PluginEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

/**
 * Event handler
 */
export type EventHandler = (event: PluginEvent) => void | Promise<void>;

/**
 * Plugin interface that all plugins must implement
 */
export interface Plugin {
  /**
   * Initialize the plugin
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Cleanup when plugin is unloaded
   */
  cleanup(): Promise<void>;
}

/**
 * Loaded plugin info
 */
export interface LoadedPluginInfo {
  manifest: PluginManifest;
  instance: Plugin;
  context: PluginContext;
  loadedAt: Date;
}

/**
 * Plugin runtime interface
 */
export interface PluginRuntime {
  /**
   * Load and initialize a plugin
   */
  load(manifest: PluginManifest, pluginPath: string): Promise<LoadedPluginInfo>;

  /**
   * Unload a plugin
   */
  unload(pluginId: PluginId): Promise<void>;

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: PluginId): boolean;

  /**
   * Get loaded plugin info
   */
  getLoadedPlugin(pluginId: PluginId): LoadedPluginInfo | undefined;
}

/**
 * Plugin manifest schema for validation
 */
export interface PluginManifestSchema {
  name: string;
  version: string;
  main: string;
  type: PluginType;
  trustLevel?: TrustLevel;
  capabilities?: string[];
  dependencies?: Record<string, string>;
  metadata?: Record<string, unknown>;
}
