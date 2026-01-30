/**
 * Workflow State Manager
 * Manages the state of workflow executions
 */

import { ExecutionId, WorkflowId } from '@domain/value-objects/index.js';
import { WorkflowStatus, StepResult } from '@domain/entities/workflow.js';
import { JsonValue } from '@shared/types/index.js';

/**
 * Workflow execution state
 */
export interface WorkflowExecutionState {
  executionId: ExecutionId;
  workflowId: WorkflowId;
  status: WorkflowStatus;
  currentStepIndex: number;
  stepResults: Map<string, StepResult>;
  context: Record<string, JsonValue>;
  input: Record<string, JsonValue>;
  output?: Record<string, JsonValue>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Workflow State Manager implementation
 */
export class WorkflowStateManager {
  private executions: Map<string, WorkflowExecutionState> = new Map();

  /**
   * Create a new execution state
   */
  create(
    executionId: ExecutionId,
    workflowId: WorkflowId,
    input: Record<string, JsonValue>,
    context: Record<string, JsonValue>
  ): WorkflowExecutionState {
    const state: WorkflowExecutionState = {
      executionId,
      workflowId,
      status: WorkflowStatus.Running,
      currentStepIndex: 0,
      stepResults: new Map(),
      context,
      input,
      startedAt: new Date(),
    };

    this.executions.set(executionId.toString(), state);
    return state;
  }

  /**
   * Get execution state
   */
  get(executionId: ExecutionId): WorkflowExecutionState | undefined {
    return this.executions.get(executionId.toString());
  }

  /**
   * Update execution status
   */
  updateStatus(executionId: ExecutionId, status: WorkflowStatus): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.status = status;

    if (
      status === WorkflowStatus.Completed ||
      status === WorkflowStatus.Failed ||
      status === WorkflowStatus.Cancelled
    ) {
      state.completedAt = new Date();
    }
  }

  /**
   * Advance to next step
   */
  advanceStep(executionId: ExecutionId): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.currentStepIndex++;
  }

  /**
   * Add step result
   */
  addStepResult(executionId: ExecutionId, result: StepResult): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.stepResults.set(result.stepId.toString(), result);
  }

  /**
   * Update context
   */
  updateContext(executionId: ExecutionId, context: Record<string, JsonValue>): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.context = { ...state.context, ...context };
  }

  /**
   * Set output
   */
  setOutput(executionId: ExecutionId, output: Record<string, JsonValue>): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.output = output;
  }

  /**
   * Set error
   */
  setError(executionId: ExecutionId, error: string): void {
    const state = this.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    state.error = error;
  }

  /**
   * Delete execution state
   */
  delete(executionId: ExecutionId): void {
    this.executions.delete(executionId.toString());
  }

  /**
   * Get all executions
   */
  getAll(): WorkflowExecutionState[] {
    return Array.from(this.executions.values());
  }
}
