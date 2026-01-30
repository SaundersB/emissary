/**
 * Workflow Engine Implementation
 * Orchestrates workflow execution
 */

import { Workflow, WorkflowStatus, StepType, StepResult } from '@domain/entities/workflow.js';
import { WorkflowRepository } from '@application/ports/output/workflow-repository.port.js';
import { ExecuteAgentUseCase } from '@application/ports/input/execute-agent.port.js';
import { ExecutionId, WorkflowId } from '@domain/value-objects/index.js';
import { WorkflowExecutionInfo } from '@application/ports/input/run-workflow.port.js';
import { JsonValue } from '@shared/types/index.js';
import { Logger } from '@shared/utils/logger.js';
import { WorkflowStateManager } from '../state/state-manager.js';
import {
  StepExecutor,
  FixedStepExecutor,
  AgentStepExecutor,
  ConditionalStepExecutor,
  ParallelStepExecutor,
  StepExecutionContext,
} from './step-executor.js';

/**
 * Workflow Engine implementation
 */
export class WorkflowEngineImpl {
  private stateManager: WorkflowStateManager;
  private stepExecutors: Map<StepType, StepExecutor>;

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    executeAgentUseCase: ExecuteAgentUseCase,
    private readonly logger: Logger
  ) {
    this.stateManager = new WorkflowStateManager();

    // Initialize step executors
    this.stepExecutors = new Map();

    const fixedExecutor = new FixedStepExecutor(logger.child('fixed-step'));
    const agentExecutor = new AgentStepExecutor(
      executeAgentUseCase,
      logger.child('agent-step')
    );

    this.stepExecutors.set(StepType.Fixed, fixedExecutor);
    this.stepExecutors.set(StepType.Agent, agentExecutor);
    this.stepExecutors.set(
      StepType.Conditional,
      new ConditionalStepExecutor(this.stepExecutors, logger.child('conditional-step'))
    );
    this.stepExecutors.set(
      StepType.Parallel,
      new ParallelStepExecutor(this.stepExecutors, logger.child('parallel-step'))
    );
  }

  /**
   * Start a workflow execution
   */
  async start(
    workflowId: string,
    input: unknown,
    context?: unknown
  ): Promise<ExecutionId> {
    this.logger.info(`Starting workflow: ${workflowId}`);

    // Load workflow
    const workflow = await this.workflowRepository.findById(WorkflowId.from(workflowId));
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create execution ID
    const executionId = ExecutionId.create();

    // Initialize state
    this.stateManager.create(
      executionId,
      workflow.id,
      (input ?? {}) as Record<string, JsonValue>,
      (context ?? {}) as Record<string, JsonValue>
    );

    // Start execution asynchronously
    void this.executeWorkflow(executionId, workflow);

    return executionId;
  }

  /**
   * Execute the workflow
   */
  private async executeWorkflow(executionId: ExecutionId, workflow: Workflow): Promise<void> {
    try {
      this.logger.info(`Executing workflow: ${workflow.name} (${executionId.toString()})`);

      const state = this.stateManager.get(executionId);
      if (!state) {
        throw new Error(`Execution state not found: ${executionId.toString()}`);
      }

      const steps = workflow.getSteps();

      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) continue;

        // Check if execution was cancelled or paused
        const currentState = this.stateManager.get(executionId);
        if (!currentState) break;

        if (
          currentState.status === WorkflowStatus.Cancelled ||
          currentState.status === WorkflowStatus.Paused
        ) {
          this.logger.info(`Workflow execution stopped: ${currentState.status}`);
          break;
        }

        // Execute step
        this.logger.debug(`Executing step ${i + 1}/${steps.length}: ${step.name}`);

        const stepContext: StepExecutionContext = {
          workflowContext: state.context,
          stepInput: i === 0 ? (state.input as JsonValue) : null,
          previousResults: state.stepResults,
        };

        const executor = this.stepExecutors.get(step.type);
        if (!executor) {
          throw new Error(`No executor for step type: ${step.type}`);
        }

        const result = await executor.execute(step, stepContext);

        // Store result
        this.stateManager.addStepResult(executionId, result);

        // Update context with step output if available
        if (result.output !== undefined && result.output !== null) {
          this.stateManager.updateContext(executionId, {
            [step.name]: result.output,
            lastStepOutput: result.output,
          });
        }

        // Advance to next step
        this.stateManager.advanceStep(executionId);

        // Check if step failed
        if (result.status === 'failed') {
          this.logger.error(`Step failed: ${step.name}`);
          this.stateManager.updateStatus(executionId, WorkflowStatus.Failed);
          this.stateManager.setError(
            executionId,
            result.error ?? 'Step execution failed'
          );
          return;
        }
      }

      // Workflow completed successfully
      const finalState = this.stateManager.get(executionId);
      if (finalState && finalState.status === WorkflowStatus.Running) {
        this.stateManager.updateStatus(executionId, WorkflowStatus.Completed);

        // Get final output from last step or context
        const lastResult = Array.from(finalState.stepResults.values()).pop();
        if (lastResult?.output) {
          this.stateManager.setOutput(executionId, {
            result: lastResult.output,
          });
        }

        this.logger.info(`Workflow completed: ${workflow.name}`);
      }
    } catch (error) {
      this.logger.error('Workflow execution failed:', error);
      this.stateManager.updateStatus(executionId, WorkflowStatus.Failed);
      this.stateManager.setError(
        executionId,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get workflow execution status
   */
  async getStatus(executionId: ExecutionId): Promise<WorkflowExecutionInfo> {
    const state = this.stateManager.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    // Get workflow to calculate progress
    const workflow = await this.workflowRepository.findById(state.workflowId);
    const totalSteps = workflow?.getSteps().length ?? 1;
    const progress = state.currentStepIndex / totalSteps;

    // Get current step name
    const currentStep = workflow?.getSteps()[state.currentStepIndex];

    return {
      executionId: state.executionId,
      workflowId: state.workflowId,
      status: state.status,
      currentStep: currentStep?.name ?? null,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      progress,
    };
  }

  /**
   * Pause workflow execution
   */
  async pause(executionId: ExecutionId): Promise<void> {
    this.logger.info(`Pausing workflow: ${executionId.toString()}`);
    this.stateManager.updateStatus(executionId, WorkflowStatus.Paused);
  }

  /**
   * Resume workflow execution
   */
  async resume(executionId: ExecutionId): Promise<void> {
    this.logger.info(`Resuming workflow: ${executionId.toString()}`);

    const state = this.stateManager.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    if (state.status !== WorkflowStatus.Paused) {
      throw new Error(`Workflow is not paused: ${state.status}`);
    }

    // Update status and continue execution
    this.stateManager.updateStatus(executionId, WorkflowStatus.Running);

    const workflow = await this.workflowRepository.findById(state.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${state.workflowId.toString()}`);
    }

    void this.executeWorkflow(executionId, workflow);
  }

  /**
   * Cancel workflow execution
   */
  async cancel(executionId: ExecutionId): Promise<void> {
    this.logger.info(`Cancelling workflow: ${executionId.toString()}`);
    this.stateManager.updateStatus(executionId, WorkflowStatus.Cancelled);
  }

  /**
   * Get workflow execution results
   */
  async getResults(executionId: ExecutionId): Promise<StepResult[]> {
    const state = this.stateManager.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    return Array.from(state.stepResults.values());
  }

  /**
   * Get workflow output
   */
  async getOutput(executionId: ExecutionId): Promise<unknown> {
    const state = this.stateManager.get(executionId);
    if (!state) {
      throw new Error(`Execution not found: ${executionId.toString()}`);
    }

    return state.output ?? null;
  }
}
