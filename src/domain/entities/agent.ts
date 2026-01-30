/**
 * Agent entity - represents an autonomous agent with capabilities and memory
 */

import { AgentId } from '../value-objects/index.js';
import { InvalidEntityError, CapabilityMissingError } from '../errors/index.js';

/**
 * Agent capabilities
 */
export enum Capability {
  WebSearch = 'web-search',
  FileSystem = 'file-system',
  CodeExecution = 'code-execution',
  DataAnalysis = 'data-analysis',
  ImageGeneration = 'image-generation',
  Summarization = 'summarization',
  Translation = 'translation',
  Custom = 'custom',
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  maxIterations?: number;
  timeout?: number;
  temperature?: number;
  modelName?: string;
  systemPrompt?: string;
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  createdAt: Date;
  updatedAt: Date;
  version?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Agent entity
 */
export class Agent {
  private readonly capabilities: Set<Capability>;
  private readonly metadata: AgentMetadata;
  private config: AgentConfig;

  constructor(
    public readonly id: AgentId,
    public readonly name: string,
    public readonly description: string,
    capabilities: Capability[] | Set<Capability> = [],
    config: AgentConfig = {},
    metadata?: Partial<AgentMetadata>
  ) {
    if (!name || name.trim().length === 0) {
      throw new InvalidEntityError('Agent name cannot be empty');
    }

    if (!description || description.trim().length === 0) {
      throw new InvalidEntityError('Agent description cannot be empty');
    }

    this.capabilities = new Set(capabilities);
    this.config = config;
    this.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      ...metadata,
    };
  }

  /**
   * Check if the agent has a specific capability
   */
  hasCapability(capability: Capability): boolean {
    return this.capabilities.has(capability);
  }

  /**
   * Check if the agent has all required capabilities
   */
  hasCapabilities(capabilities: Capability[]): boolean {
    return capabilities.every((cap) => this.capabilities.has(cap));
  }

  /**
   * Add a capability to the agent
   */
  addCapability(capability: Capability): void {
    this.capabilities.add(capability);
    this.updateTimestamp();
  }

  /**
   * Remove a capability from the agent
   */
  removeCapability(capability: Capability): void {
    this.capabilities.delete(capability);
    this.updateTimestamp();
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): Capability[] {
    return Array.from(this.capabilities);
  }

  /**
   * Require a capability (throws if missing)
   */
  requireCapability(capability: Capability): void {
    if (!this.hasCapability(capability)) {
      throw new CapabilityMissingError(capability, {
        agentId: this.id.toString(),
        agentName: this.name,
      });
    }
  }

  /**
   * Update agent configuration
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateTimestamp();
  }

  /**
   * Get agent configuration
   */
  getConfig(): Readonly<AgentConfig> {
    return { ...this.config };
  }

  /**
   * Get agent metadata
   */
  getMetadata(): Readonly<AgentMetadata> {
    return { ...this.metadata };
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<AgentMetadata>): void {
    Object.assign(this.metadata, metadata);
    this.updateTimestamp();
  }

  /**
   * Update the updated timestamp
   */
  private updateTimestamp(): void {
    this.metadata.updatedAt = new Date();
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.toString(),
      name: this.name,
      description: this.description,
      capabilities: this.getCapabilities(),
      config: this.config,
      metadata: this.metadata,
    };
  }

  /**
   * Create an agent from a plain object
   */
  static fromJSON(data: {
    id: string;
    name: string;
    description: string;
    capabilities?: Capability[];
    config?: AgentConfig;
    metadata?: Partial<AgentMetadata>;
  }): Agent {
    return new Agent(
      AgentId.from(data.id),
      data.name,
      data.description,
      data.capabilities ?? [],
      data.config ?? {},
      data.metadata
    );
  }
}
