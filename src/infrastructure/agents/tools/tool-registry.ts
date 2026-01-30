/**
 * Tool Registry implementation
 */

import { ToolRegistry, ToolDefinition } from '@application/ports/output/tool.port.js';
import { Tool, ToolParams, ToolResult } from '@domain/entities/tool.js';
import { ToolId } from '@domain/value-objects/index.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * In-memory Tool Registry implementation
 */
export class ToolRegistryImpl implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolsByName: Map<string, Tool> = new Map();

  constructor(private readonly logger: Logger) {}

  register(tool: Tool): void {
    this.logger.info(`Registering tool: ${tool.name}`);
    this.tools.set(tool.id.toString(), tool);
    this.toolsByName.set(tool.name, tool);
  }

  get(id: ToolId): Tool | undefined {
    return this.tools.get(id.toString());
  }

  getByName(name: string): Tool | undefined {
    return this.toolsByName.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getToolDefinition());
  }

  has(id: ToolId): boolean {
    return this.tools.has(id.toString());
  }

  unregister(id: ToolId): boolean {
    const tool = this.tools.get(id.toString());
    if (!tool) {
      return false;
    }

    this.toolsByName.delete(tool.name);
    return this.tools.delete(id.toString());
  }

  async execute(name: string, params: ToolParams): Promise<ToolResult> {
    const tool = this.toolsByName.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    try {
      this.logger.debug(`Executing tool: ${name}`);
      const result = await tool.execute(params);
      return result;
    } catch (error) {
      this.logger.error(`Tool execution failed: ${name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
