/**
 * Base ID value object and specific ID types
 */

import { InvalidValueObjectError } from '../errors/index.js';
import { generateId } from '@shared/utils/index.js';

/**
 * Base ID class for all entity identifiers
 */
export abstract class Id<T extends string = string> {
  protected constructor(protected readonly value: T) {
    if (!value || value.trim().length === 0) {
      throw new InvalidValueObjectError('ID cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: Id<T>): boolean {
    if (!(other instanceof Id)) {
      return false;
    }
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * Agent ID
 */
export class AgentId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): AgentId {
    return new AgentId(id ?? `agent-${generateId()}`);
  }

  static from(value: string): AgentId {
    return new AgentId(value);
  }
}

/**
 * Task ID
 */
export class TaskId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): TaskId {
    return new TaskId(id ?? `task-${generateId()}`);
  }

  static from(value: string): TaskId {
    return new TaskId(value);
  }
}

/**
 * Tool ID
 */
export class ToolId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): ToolId {
    return new ToolId(id ?? `tool-${generateId()}`);
  }

  static from(value: string): ToolId {
    return new ToolId(value);
  }
}

/**
 * Workflow ID
 */
export class WorkflowId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): WorkflowId {
    return new WorkflowId(id ?? `workflow-${generateId()}`);
  }

  static from(value: string): WorkflowId {
    return new WorkflowId(value);
  }
}

/**
 * Plugin ID
 */
export class PluginId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): PluginId {
    return new PluginId(id ?? `plugin-${generateId()}`);
  }

  static from(value: string): PluginId {
    return new PluginId(value);
  }
}

/**
 * Execution ID (for agent/workflow executions)
 */
export class ExecutionId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): ExecutionId {
    return new ExecutionId(id ?? `exec-${generateId()}`);
  }

  static from(value: string): ExecutionId {
    return new ExecutionId(value);
  }
}

/**
 * Step ID (for workflow steps)
 */
export class StepId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(id?: string): StepId {
    return new StepId(id ?? `step-${generateId()}`);
  }

  static from(value: string): StepId {
    return new StepId(value);
  }
}
