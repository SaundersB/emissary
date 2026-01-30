/**
 * Workflow entity - represents an orchestrated sequence of steps
 */

import { WorkflowId, StepId } from '../value-objects/index.js';
import { InvalidEntityError } from '../errors/index.js';
import { JsonValue } from '@shared/types/index.js';

/**
 * Workflow status
 */
export enum WorkflowStatus {
  Pending = 'pending',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Step status
 */
export enum StepStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped',
}

/**
 * Step type
 */
export enum StepType {
  Fixed = 'fixed',
  Agent = 'agent',
  Conditional = 'conditional',
  Parallel = 'parallel',
  Loop = 'loop',
}

/**
 * Workflow step configuration
 */
export interface WorkflowStepConfig {
  id: StepId;
  name: string;
  type: StepType;
  config?: Record<string, JsonValue>;
  dependsOn?: StepId[];
}

/**
 * Workflow step result
 */
export interface StepResult {
  stepId: StepId;
  status: StepStatus;
  output?: JsonValue;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

/**
 * Workflow context - shared data between steps
 */
export interface WorkflowContext {
  [key: string]: JsonValue;
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  version?: string;
  [key: string]: unknown;
}

/**
 * Workflow entity
 */
export class Workflow {
  private status: WorkflowStatus;
  private steps: WorkflowStepConfig[];
  private results: Map<string, StepResult>;
  private currentStepIndex: number;
  private context: WorkflowContext;
  private readonly metadata: WorkflowMetadata;

  constructor(
    public readonly id: WorkflowId,
    public readonly name: string,
    public readonly description: string,
    steps: WorkflowStepConfig[] = [],
    context: WorkflowContext = {},
    metadata?: Partial<WorkflowMetadata>
  ) {
    if (!name || name.trim().length === 0) {
      throw new InvalidEntityError('Workflow name cannot be empty');
    }

    if (!description || description.trim().length === 0) {
      throw new InvalidEntityError('Workflow description cannot be empty');
    }

    this.status = WorkflowStatus.Pending;
    this.steps = steps;
    this.results = new Map();
    this.currentStepIndex = 0;
    this.context = context;
    this.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      ...metadata,
    };
  }

  /**
   * Get current status
   */
  getStatus(): WorkflowStatus {
    return this.status;
  }

  /**
   * Update workflow status
   */
  updateStatus(status: WorkflowStatus): void {
    this.status = status;
    this.metadata.updatedAt = new Date();

    if (status === WorkflowStatus.Running && !this.metadata.startedAt) {
      this.metadata.startedAt = new Date();
    }

    if (
      (status === WorkflowStatus.Completed ||
        status === WorkflowStatus.Failed ||
        status === WorkflowStatus.Cancelled) &&
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
   * Check if workflow is complete
   */
  isComplete(): boolean {
    return (
      this.status === WorkflowStatus.Completed ||
      this.status === WorkflowStatus.Failed ||
      this.status === WorkflowStatus.Cancelled
    );
  }

  /**
   * Add a step to the workflow
   */
  addStep(step: WorkflowStepConfig): void {
    this.steps.push(step);
    this.metadata.updatedAt = new Date();
  }

  /**
   * Remove a step from the workflow
   */
  removeStep(stepId: StepId): void {
    const index = this.steps.findIndex((s) => s.id.equals(stepId));
    if (index !== -1) {
      this.steps.splice(index, 1);
      this.metadata.updatedAt = new Date();
    }
  }

  /**
   * Get all steps
   */
  getSteps(): Readonly<WorkflowStepConfig[]> {
    return [...this.steps];
  }

  /**
   * Get step by ID
   */
  getStep(stepId: StepId): WorkflowStepConfig | undefined {
    return this.steps.find((s) => s.id.equals(stepId));
  }

  /**
   * Get current step
   */
  getCurrentStep(): WorkflowStepConfig | null {
    if (this.currentStepIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStepIndex] ?? null;
  }

  /**
   * Get next step
   */
  getNextStep(): WorkflowStepConfig | null {
    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.steps.length) {
      return null;
    }
    return this.steps[nextIndex] ?? null;
  }

  /**
   * Advance to next step
   */
  advanceStep(): void {
    this.currentStepIndex++;
    this.metadata.updatedAt = new Date();
  }

  /**
   * Set step result
   */
  setStepResult(result: StepResult): void {
    this.results.set(result.stepId.toString(), result);
    this.metadata.updatedAt = new Date();
  }

  /**
   * Get step result
   */
  getStepResult(stepId: StepId): StepResult | undefined {
    return this.results.get(stepId.toString());
  }

  /**
   * Get all step results
   */
  getStepResults(): StepResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Get workflow context
   */
  getContext(): Readonly<WorkflowContext> {
    return { ...this.context };
  }

  /**
   * Update workflow context
   */
  updateContext(context: Partial<WorkflowContext>): void {
    this.context = { ...this.context, ...context } as WorkflowContext;
    this.metadata.updatedAt = new Date();
  }

  /**
   * Get workflow metadata
   */
  getMetadata(): Readonly<WorkflowMetadata> {
    return { ...this.metadata };
  }

  /**
   * Get workflow progress (0-1)
   */
  getProgress(): number {
    if (this.steps.length === 0) return 0;
    return this.currentStepIndex / this.steps.length;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.toString(),
      name: this.name,
      description: this.description,
      status: this.status,
      steps: this.steps.map((s) => ({
        ...s,
        id: s.id.toString(),
        dependsOn: s.dependsOn?.map((d) => d.toString()),
      })),
      currentStepIndex: this.currentStepIndex,
      context: this.context,
      results: Array.from(this.results.entries()).map(([id, result]) => ({
        ...result,
        stepId: id,
      })),
      metadata: this.metadata,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: {
    id: string;
    name: string;
    description: string;
    steps?: Array<{
      id: string;
      name: string;
      type: StepType;
      config?: Record<string, JsonValue>;
      dependsOn?: string[];
    }>;
    context?: WorkflowContext;
    metadata?: Partial<WorkflowMetadata>;
  }): Workflow {
    const steps =
      data.steps?.map((s) => ({
        id: StepId.from(s.id),
        name: s.name,
        type: s.type,
        config: s.config,
        dependsOn: s.dependsOn?.map((d) => StepId.from(d)),
      })) ?? [];

    return new Workflow(
      WorkflowId.from(data.id),
      data.name,
      data.description,
      steps,
      data.context,
      data.metadata
    );
  }
}
