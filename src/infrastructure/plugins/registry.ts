/**
 * Plugin Registry implementation
 */

import {
  PluginRepository,
  PluginManifest,
  PluginCriteria,
  PluginType,
} from '@application/ports/output/plugin-repository.port.js';
import { PluginId } from '@domain/value-objects/index.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * In-memory Plugin Registry implementation
 */
export class PluginRegistryImpl implements PluginRepository {
  private plugins: Map<string, PluginManifest> = new Map();

  constructor(private readonly logger: Logger) {}

  async find(criteria: PluginCriteria): Promise<PluginManifest[]> {
    const all = Array.from(this.plugins.values());

    return all.filter((plugin) => {
      if (criteria.type && plugin.type !== criteria.type) {
        return false;
      }

      if (criteria.trustLevel && plugin.trustLevel !== criteria.trustLevel) {
        return false;
      }

      if (criteria.name && !plugin.name.includes(criteria.name)) {
        return false;
      }

      if (criteria.capabilities) {
        const hasAllCapabilities = criteria.capabilities.every((cap) =>
          plugin.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    });
  }

  async findById(id: PluginId): Promise<PluginManifest | null> {
    return this.plugins.get(id.toString()) ?? null;
  }

  async findByType(type: PluginType): Promise<PluginManifest[]> {
    return this.find({ type });
  }

  async register(manifest: PluginManifest): Promise<void> {
    this.logger.info(`Registering plugin: ${manifest.name} (${manifest.id.toString()})`);
    this.plugins.set(manifest.id.toString(), manifest);
  }

  async unregister(id: PluginId): Promise<void> {
    this.logger.info(`Unregistering plugin: ${id.toString()}`);
    this.plugins.delete(id.toString());
  }

  async list(): Promise<PluginManifest[]> {
    return Array.from(this.plugins.values());
  }

  async has(id: PluginId): Promise<boolean> {
    return this.plugins.has(id.toString());
  }
}
