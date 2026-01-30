/**
 * Task entity - represents a unit of work to be performed
 */

import { TaskId } from '../value-objects/index.js';
import { InvalidEntityError } from '../errors/index.js';
import { JsonValue } from '@shared/types/index.js';

/**
 * Task status
 */
export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Task priority
 */
export enum TaskPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

/**
 * Task context - additional information for task execution
 */
export interface TaskContext {
  [key: string]: JsonValue;
}

/**
 * Task constraint
 */
export interface Constraint {
  type: 'max-iterations' | 'timeout' | 'custom';
  value: number | string;
  description?: string;
}

/**
 * Task result
 */
export interface TaskResult {
  success: boolean;
  output?: JsonValue;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task metadata
 */
export interface TaskMetadata {
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Task entity
 */
export class Task {
  private status: TaskStatus;
  private priority: TaskPriority;
  private constraints: Constraint[];
  private result: TaskResult | null;
  private readonly metadata: TaskMetadata;

  constructor(
    public readonly id: TaskId,
    public readonly description: string,
    private context: TaskContext = {},
    constraints: Constraint[] = [],
    priority: TaskPriority = TaskPriority.Normal,
    metadata?: Partial<TaskMetadata>
  ) {
    if (!description || description.trim().length === 0) {
      throw new InvalidEntityError('Task description cannot be empty');
    }

    this.status = TaskStatus.Pending;
    this.priority = priority;
    this.constraints = constraints;
    this.result = null;
    this.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      ...metadata,
    };
  }

  /**
   * Get current status
   */
  getStatus(): TaskStatus {
    return this.status;
  }

  /**
   * Update task status
   */
  updateStatus(status: TaskStatus): void {
    this.status = status;
    this.metadata.updatedAt = new Date();

    if (status === TaskStatus.Running && !this.metadata.startedAt) {
      this.metadata.startedAt = new Date();
    }

    if (
      (status === TaskStatus.Completed ||
        status === TaskStatus.Failed ||
        status === TaskStatus.Cancelled) &&
      !this.metadata.completedAt
    ) {
      this.metadata.completedAt = new Date();
      if (this.metadata.startedAt) {
        this.metadata.duration =
          this.metadata.completedAt.getTime() - this.metadata.startedAt.getTime();
      }
    }
  }

  /**
   * Check if task is complete
   */
  isComplete(): boolean {
    return (
      this.status === TaskStatus.Completed ||
      this.status === TaskStatus.Failed ||
      this.status === TaskStatus.Cancelled
    );
  }

  /**
   * Check if task is running
   */
  isRunning(): boolean {
    return this.status === TaskStatus.Running;
  }

  /**
   * Get task priority
   */
  getPriority(): TaskPriority {
    return this.priority;
  }

  /**
   * Update task priority
   */
  updatePriority(priority: TaskPriority): void {
    this.priority = priority;
    this.metadata.updatedAt = new Date();
  }

  /**
   * Get task context
   */
  getContext(): Readonly<TaskContext> {
    return { ...this.context };
  }

  /**
   * Update task context
   */
  updateContext(context: Partial<TaskContext>): void {
    this.context = { ...this.context, ...context } as TaskContext;
    this.metadata.updatedAt = new Date();
  }

  /**
   * Get constraints
   */
  getConstraints(): Readonly<Constraint[]> {
    return [...this.constraints];
  }

  /**
   * Add a constraint
   */
  addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
    this.metadata.updatedAt = new Date();
  }

  /**
   * Get constraint by type
   */
  getConstraint(type: Constraint['type']): Constraint | undefined {
    return this.constraints.find((c) => c.type === type);
  }

  /**
   * Set task result
   */
  setResult(result: TaskResult): void {
    this.result = result;
    this.updateStatus(result.success ? TaskStatus.Completed : TaskStatus.Failed);
  }

  /**
   * Get task result
   */
  getResult(): Readonly<TaskResult> | null {
    return this.result ? { ...this.result } : null;
  }

  /**
   * Get task metadata
   */
  getMetadata(): Readonly<TaskMetadata> {
    return { ...this.metadata };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.toString(),
      description: this.description,
      status: this.status,
      priority: this.priority,
      context: this.context,
      constraints: this.constraints,
      result: this.result,
      metadata: this.metadata,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: {
    id: string;
    description: string;
    context?: TaskContext;
    constraints?: Constraint[];
    priority?: TaskPriority;
    metadata?: Partial<TaskMetadata>;
  }): Task {
    return new Task(
      TaskId.from(data.id),
      data.description,
      data.context,
      data.constraints,
      data.priority,
      data.metadata
    );
  }
}

/**
 * Constraint factory functions
 */
export const Constraints = {
  maxIterations: (value: number, description?: string): Constraint => ({
    type: 'max-iterations',
    value,
    description: description ?? `Maximum ${value} iterations`,
  }),

  timeout: (value: number, description?: string): Constraint => ({
    type: 'timeout',
    value,
    description: description ?? `Timeout after ${value}ms`,
  }),

  custom: (value: string, description?: string): Constraint => ({
    type: 'custom',
    value,
    description,
  }),
};
