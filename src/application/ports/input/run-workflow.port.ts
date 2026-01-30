/**
 * Run Workflow use case port
 */

import { WorkflowId, ExecutionId } from '@domain/value-objects/index.js';
import { WorkflowStatus, WorkflowContext, StepResult } from '@domain/entities/workflow.js';
import { Result } from '@shared/types/index.js';

/**
 * Workflow input
 */
export interface WorkflowInput {
  [key: string]: unknown;
}

/**
 * Workflow output
 */
export interface WorkflowOutput {
  [key: string]: unknown;
}

/**
 * Workflow execution info
 */
export interface WorkflowExecutionInfo {
  executionId: ExecutionId;
  workflowId: WorkflowId;
  status: WorkflowStatus;
  currentStep: string | null;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
}

/**
 * Run workflow request
 */
export interface RunWorkflowRequest {
  workflowId: WorkflowId;
  input: WorkflowInput;
  context?: WorkflowContext;
}

/**
 * Run workflow response
 */
export interface RunWorkflowResponse {
  executionId: ExecutionId;
  status: WorkflowStatus;
  output?: WorkflowOutput;
  error?: string;
  steps: StepResult[];
  metadata: {
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
  };
}

/**
 * Control workflow request
 */
export interface ControlWorkflowRequest {
  executionId: ExecutionId;
  action: 'pause' | 'resume' | 'cancel';
}

/**
 * Control workflow response
 */
export interface ControlWorkflowResponse {
  executionId: ExecutionId;
  status: WorkflowStatus;
  timestamp: Date;
}

/**
 * Run Workflow use case interface
 */
export interface RunWorkflowUseCase {
  run(request: RunWorkflowRequest): Promise<Result<RunWorkflowResponse, Error>>;
  getStatus(executionId: ExecutionId): Promise<Result<WorkflowExecutionInfo, Error>>;
  control(request: ControlWorkflowRequest): Promise<Result<ControlWorkflowResponse, Error>>;
}
