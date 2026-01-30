/**
 * Plugin Repository port - interface for plugin persistence and management
 */

import { PluginId } from '@domain/value-objects/index.js';

/**
 * Plugin type
 */
export type PluginType =
  | 'tool'
  | 'agent'
  | 'workflow'
  | 'llm-provider'
  | 'storage'
  | 'integration';

/**
 * Plugin trust level
 */
export type TrustLevel = 'trusted' | 'sandboxed' | 'isolated';

/**
 * Plugin manifest
 */
export interface PluginManifest {
  id: PluginId;
  name: string;
  version: string;
  main: string;
  type: PluginType;
  trustLevel: TrustLevel;
  capabilities: string[];
  dependencies: Record<string, string>;
  metadata: Record<string, unknown>;
}

/**
 * Plugin status
 */
export enum PluginStatus {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Failed = 'failed',
}

/**
 * Loaded plugin info
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  loadedAt?: Date;
  error?: string;
}

/**
 * Plugin search criteria
 */
export interface PluginCriteria {
  type?: PluginType;
  trustLevel?: TrustLevel;
  name?: string;
  capabilities?: string[];
}

/**
 * Plugin Repository interface
 */
export interface PluginRepository {
  /**
   * Find plugins matching criteria
   */
  find(criteria: PluginCriteria): Promise<PluginManifest[]>;

  /**
   * Find a plugin by ID
   */
  findById(id: PluginId): Promise<PluginManifest | null>;

  /**
   * Find plugins by type
   */
  findByType(type: PluginType): Promise<PluginManifest[]>;

  /**
   * Register a plugin
   */
  register(manifest: PluginManifest): Promise<void>;

  /**
   * Unregister a plugin
   */
  unregister(id: PluginId): Promise<void>;

  /**
   * List all plugin manifests
   */
  list(): Promise<PluginManifest[]>;

  /**
   * Check if a plugin is registered
   */
  has(id: PluginId): Promise<boolean>;
}
