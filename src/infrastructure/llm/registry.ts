/**
 * LLM Provider Registry implementation
 */

import { LLMProvider, LLMProviderRegistry } from '@application/ports/output/llm-provider.port.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * LLM Provider Registry implementation
 */
export class LLMProviderRegistryImpl implements LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProviderName: string | null = null;

  constructor(private readonly logger: Logger) {}

  register(name: string, provider: LLMProvider): void {
    this.logger.info(`Registering LLM provider: ${name}`);
    this.providers.set(name, provider);

    // Set as default if it's the first provider
    if (this.defaultProviderName === null) {
      this.defaultProviderName = name;
      this.logger.info(`Set default LLM provider: ${name}`);
    }
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): LLMProvider {
    if (this.defaultProviderName === null) {
      throw new Error('No default LLM provider set');
    }

    const provider = this.providers.get(this.defaultProviderName);
    if (!provider) {
      throw new Error(`Default LLM provider not found: ${this.defaultProviderName}`);
    }

    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  unregister(name: string): boolean {
    const deleted = this.providers.delete(name);

    if (deleted && this.defaultProviderName === name) {
      // Set a new default if available
      const remaining = Array.from(this.providers.keys());
      this.defaultProviderName = remaining[0] ?? null;
      if (this.defaultProviderName) {
        this.logger.info(`Set new default LLM provider: ${this.defaultProviderName}`);
      }
    }

    return deleted;
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not found: ${name}`);
    }

    this.defaultProviderName = name;
    this.logger.info(`Set default LLM provider: ${name}`);
  }
}
