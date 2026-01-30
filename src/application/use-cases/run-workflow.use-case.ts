/**
 * Run Workflow use case implementation
 */

import {
  RunWorkflowUseCase,
  RunWorkflowRequest,
  RunWorkflowResponse,
  ControlWorkflowRequest,
  ControlWorkflowResponse,
  WorkflowExecutionInfo,
} from '../ports/input/run-workflow.port.js';
import { WorkflowRepository } from '../ports/output/workflow-repository.port.js';
import { ExecutionId } from '@domain/value-objects/index.js';
import { WorkflowStatus, StepResult } from '@domain/entities/workflow.js';
import { Result, ok, err } from '@shared/types/result.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * Workflow engine interface (to be implemented in infrastructure)
 */
export interface WorkflowEngine {
  start(workflowId: string, input: unknown, context?: unknown): Promise<ExecutionId>;
  getStatus(executionId: ExecutionId): Promise<WorkflowExecutionInfo>;
  pause(executionId: ExecutionId): Promise<void>;
  resume(executionId: ExecutionId): Promise<void>;
  cancel(executionId: ExecutionId): Promise<void>;
  getResults(executionId: ExecutionId): Promise<StepResult[]>;
  getOutput(executionId: ExecutionId): Promise<unknown>;
}

/**
 * Workflow execution tracking
 */
interface WorkflowExecution {
  executionId: ExecutionId;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

/**
 * Run Workflow use case implementation
 */
export class RunWorkflowUseCaseImpl implements RunWorkflowUseCase {
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowEngine: WorkflowEngine,
    private readonly logger: Logger
  ) {}

  async run(request: RunWorkflowRequest): Promise<Result<RunWorkflowResponse, Error>> {
    const startedAt = new Date();

    try {
      this.logger.info(`Starting workflow: ${request.workflowId.toString()}`);

      // Find the workflow
      const workflow = await this.workflowRepository.findById(request.workflowId);
      if (!workflow) {
        return err(new Error(`Workflow not found: ${request.workflowId.toString()}`));
      }

      // Start workflow execution
      const executionId = await this.workflowEngine.start(
        request.workflowId.toString(),
        request.input,
        request.context
      );

      // Track execution
      this.executions.set(executionId.toString(), {
        executionId,
        workflowId: request.workflowId.toString(),
        status: WorkflowStatus.Running,
        startedAt,
      });

      // Wait for completion (simplified - in production, this might be async)
      const info = await this.waitForCompletion(executionId);

      // Get results
      const steps = await this.workflowEngine.getResults(executionId);
      const output = await this.workflowEngine.getOutput(executionId);

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // Update execution tracking
      const execution = this.executions.get(executionId.toString());
      if (execution) {
        execution.status = info.status;
        execution.completedAt = completedAt;
        execution.output = output;
      }

      this.logger.info(`Workflow completed: ${executionId.toString()}`);

      return ok({
        executionId,
        status: info.status,
        output: output as Record<string, unknown> | undefined,
        error:
          info.status === WorkflowStatus.Failed
            ? 'Workflow execution failed'
            : undefined,
        steps,
        metadata: {
          startedAt,
          completedAt,
          duration,
        },
      });
    } catch (error) {
      this.logger.error('Workflow execution failed:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getStatus(executionId: ExecutionId): Promise<Result<WorkflowExecutionInfo, Error>> {
    try {
      const info = await this.workflowEngine.getStatus(executionId);
      return ok(info);
    } catch (error) {
      this.logger.error('Failed to get workflow status:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async control(
    request: ControlWorkflowRequest
  ): Promise<Result<ControlWorkflowResponse, Error>> {
    try {
      this.logger.info(
        `Control workflow ${request.executionId.toString()}: ${request.action}`
      );

      switch (request.action) {
        case 'pause':
          await this.workflowEngine.pause(request.executionId);
          break;
        case 'resume':
          await this.workflowEngine.resume(request.executionId);
          break;
        case 'cancel':
          await this.workflowEngine.cancel(request.executionId);
          break;
      }

      const info = await this.workflowEngine.getStatus(request.executionId);

      return ok({
        executionId: request.executionId,
        status: info.status,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to control workflow:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async waitForCompletion(executionId: ExecutionId): Promise<WorkflowExecutionInfo> {
    // Poll for completion (simplified - in production, use events)
    const maxAttempts = 100;
    const pollInterval = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      const info = await this.workflowEngine.getStatus(executionId);

      if (
        info.status === WorkflowStatus.Completed ||
        info.status === WorkflowStatus.Failed ||
        info.status === WorkflowStatus.Cancelled
      ) {
        return info;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Workflow execution timeout');
  }
}
