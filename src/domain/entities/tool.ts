/**
 * Tool entity - represents an executable capability
 */

import { ToolId } from '../value-objects/index.js';
import { InvalidEntityError } from '../errors/index.js';
import { JsonValue } from '@shared/types/index.js';

/**
 * Tool parameters
 */
export type ToolParams = Record<string, JsonValue>;

/**
 * Tool result
 */
export interface ToolResult {
  success: boolean;
  output?: JsonValue;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool schema - defines the expected parameters
 */
export interface ToolSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  description?: string;
}

/**
 * Tool executor function
 */
export type ToolExecutor = (params: ToolParams) => Promise<ToolResult>;

/**
 * Tool metadata
 */
export interface ToolMetadata {
  createdAt: Date;
  version?: string;
  author?: string;
  tags?: string[];
  examples?: Array<{
    params: ToolParams;
    description: string;
  }>;
  [key: string]: unknown;
}

/**
 * Tool entity
 */
export class Tool {
  private readonly metadata: ToolMetadata;
  private executor: ToolExecutor;

  constructor(
    public readonly id: ToolId,
    public readonly name: string,
    public readonly description: string,
    public readonly schema: ToolSchema,
    executor: ToolExecutor,
    metadata?: Partial<ToolMetadata>
  ) {
    if (!name || name.trim().length === 0) {
      throw new InvalidEntityError('Tool name cannot be empty');
    }

    if (!description || description.trim().length === 0) {
      throw new InvalidEntityError('Tool description cannot be empty');
    }

    if (!schema) {
      throw new InvalidEntityError('Tool schema is required');
    }

    this.executor = executor;
    this.metadata = {
      createdAt: new Date(),
      ...metadata,
    };
  }

  /**
   * Execute the tool with given parameters
   */
  async execute(params: ToolParams): Promise<ToolResult> {
    try {
      // Validate parameters against schema
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid parameters: ${validation.errors?.join(', ')}`,
        };
      }

      // Execute the tool
      const result = await this.executor(params);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * Validate parameters against the schema
   */
  validate(params: ToolParams): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check required parameters
    if (this.schema.required) {
      for (const requiredParam of this.schema.required) {
        if (!(requiredParam in params)) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    // Basic type checking against schema properties
    for (const key of Object.keys(params)) {
      if (!(key in this.schema.properties)) {
        errors.push(`Unknown parameter: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get tool metadata
   */
  getMetadata(): Readonly<ToolMetadata> {
    return { ...this.metadata };
  }

  /**
   * Get the JSON schema for the tool
   */
  getSchema(): ToolSchema {
    return { ...this.schema };
  }

  /**
   * Get a formatted description for LLM tool use
   */
  getToolDefinition(): {
    name: string;
    description: string;
    parameters: ToolSchema;
  } {
    return {
      name: this.name,
      description: this.description,
      parameters: this.schema,
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.toString(),
      name: this.name,
      description: this.description,
      schema: this.schema,
      metadata: this.metadata,
    };
  }

  /**
   * Create from plain object
   * Note: executor must be provided separately as it cannot be serialized
   */
  static fromJSON(
    data: {
      id: string;
      name: string;
      description: string;
      schema: ToolSchema;
      metadata?: Partial<ToolMetadata>;
    },
    executor: ToolExecutor
  ): Tool {
    return new Tool(
      ToolId.from(data.id),
      data.name,
      data.description,
      data.schema,
      executor,
      data.metadata
    );
  }
}
