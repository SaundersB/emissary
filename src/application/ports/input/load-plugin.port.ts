/**
 * Load Plugin use case port
 */

import { PluginId } from '@domain/value-objects/index.js';
import { PluginManifest, PluginStatus } from '../output/plugin-repository.port.js';
import { Result } from '@shared/types/index.js';

/**
 * Load plugin request
 */
export interface LoadPluginRequest {
  pluginPath: string;
  force?: boolean;
}

/**
 * Load plugin response
 */
export interface LoadPluginResponse {
  pluginId: PluginId;
  manifest: PluginManifest;
  status: PluginStatus;
  loadedAt: Date;
}

/**
 * Unload plugin request
 */
export interface UnloadPluginRequest {
  pluginId: PluginId;
}

/**
 * Unload plugin response
 */
export interface UnloadPluginResponse {
  success: boolean;
  unloadedAt: Date;
}

/**
 * Load Plugin use case interface
 */
export interface LoadPluginUseCase {
  load(request: LoadPluginRequest): Promise<Result<LoadPluginResponse, Error>>;
  unload(request: UnloadPluginRequest): Promise<Result<UnloadPluginResponse, Error>>;
  list(): Promise<Result<PluginManifest[], Error>>;
}
