/**
 * Tool port - interface for tool definitions and execution
 */

import { ToolId } from '@domain/value-objects/index.js';
import { Tool, ToolParams, ToolResult, ToolSchema } from '@domain/entities/tool.js';

/**
 * Tool definition for LLM tool use
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolSchema;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /**
   * Register a tool
   */
  register(tool: Tool): void;

  /**
   * Get a tool by ID
   */
  get(id: ToolId): Tool | undefined;

  /**
   * Get a tool by name
   */
  getByName(name: string): Tool | undefined;

  /**
   * List all registered tools
   */
  list(): Tool[];

  /**
   * List all tool definitions (for LLM use)
   */
  listDefinitions(): ToolDefinition[];

  /**
   * Check if a tool is registered
   */
  has(id: ToolId): boolean;

  /**
   * Unregister a tool
   */
  unregister(id: ToolId): boolean;

  /**
   * Execute a tool by name
   */
  execute(name: string, params: ToolParams): Promise<ToolResult>;
}
