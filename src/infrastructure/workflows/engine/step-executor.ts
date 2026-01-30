/**
 * Workflow Step Executor
 * Executes individual workflow steps
 */

import {
  WorkflowStepConfig,
  StepType,
  StepResult,
  StepStatus,
} from '@domain/entities/workflow.js';
import { ExecuteAgentUseCase } from '@application/ports/input/execute-agent.port.js';
import { AgentId } from '@domain/value-objects/index.js';
import { JsonValue } from '@shared/types/index.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * Step context for execution
 */
export interface StepExecutionContext {
  workflowContext: Record<string, JsonValue>;
  stepInput: JsonValue;
  previousResults: Map<string, StepResult>;
}

/**
 * Step executor interface
 */
export interface StepExecutor {
  execute(step: WorkflowStepConfig, context: StepExecutionContext): Promise<StepResult>;
}

/**
 * Fixed step executor - executes predefined logic
 */
export class FixedStepExecutor implements StepExecutor {
  constructor(private readonly logger: Logger) {}

  async execute(
    step: WorkflowStepConfig,
    context: StepExecutionContext
  ): Promise<StepResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Executing fixed step: ${step.name}`);

      // Get the function from step config
      const functionName = step.config?.function as string;
      if (!functionName) {
        throw new Error('Fixed step requires a function name in config');
      }

      // Execute based on function name
      let output: JsonValue;
      switch (functionName) {
        case 'echo':
          output = context.stepInput;
          break;

        case 'transform':
          // Apply transformation from config
          const transformation = step.config?.transformation as string;
          output = this.applyTransformation(context.stepInput, transformation);
          break;

        case 'merge':
          // Merge data from previous steps
          output = this.mergeResults(context.previousResults);
          break;

        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      const completedAt = new Date();

      return {
        stepId: step.id,
        status: StepStatus.Completed,
        output,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    } catch (error) {
      const completedAt = new Date();

      this.logger.error(`Fixed step failed: ${step.name}`, error);

      return {
        stepId: step.id,
        status: StepStatus.Failed,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    }
  }

  private applyTransformation(input: JsonValue, transformation: string): JsonValue {
    // Simple transformations
    switch (transformation) {
      case 'uppercase':
        return typeof input === 'string' ? input.toUpperCase() : input;
      case 'lowercase':
        return typeof input === 'string' ? input.toLowerCase() : input;
      case 'reverse':
        return typeof input === 'string' ? input.split('').reverse().join('') : input;
      default:
        return input;
    }
  }

  private mergeResults(results: Map<string, StepResult>): JsonValue {
    const merged: Record<string, JsonValue> = {};
    for (const [stepId, result] of results.entries()) {
      merged[stepId] = result.output ?? null;
    }
    return merged;
  }
}

/**
 * Agent step executor - executes autonomous agent steps
 */
export class AgentStepExecutor implements StepExecutor {
  constructor(
    private readonly executeAgentUseCase: ExecuteAgentUseCase,
    private readonly logger: Logger
  ) {}

  async execute(
    step: WorkflowStepConfig,
    context: StepExecutionContext
  ): Promise<StepResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Executing agent step: ${step.name}`);

      // Get agent ID from step config
      const agentIdStr = step.config?.agentId as string;
      if (!agentIdStr) {
        throw new Error('Agent step requires agentId in config');
      }

      const agentId = AgentId.from(agentIdStr);

      // Get task description
      const taskDescription = step.config?.taskDescription as string;
      if (!taskDescription) {
        throw new Error('Agent step requires taskDescription in config');
      }

      // Execute agent
      const result = await this.executeAgentUseCase.execute({
        agentId,
        taskDescription,
        context: {
          stepInput: context.stepInput,
          workflowContext: context.workflowContext,
        },
        options: {
          maxIterations: (step.config?.maxIterations as number) ?? 5,
          timeout: (step.config?.timeout as number) ?? 300000,
          tools: step.config?.tools as string[] | undefined,
        },
      });

      const completedAt = new Date();

      if (result.isOk()) {
        const response = result.unwrap();

        return {
          stepId: step.id,
          status: response.success ? StepStatus.Completed : StepStatus.Failed,
          output: (response.output ?? null) as JsonValue,
          error: response.error,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        };
      } else {
        const error = result.unwrap() as Error;

        return {
          stepId: step.id,
          status: StepStatus.Failed,
          error: error.message,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        };
      }
    } catch (error) {
      const completedAt = new Date();

      this.logger.error(`Agent step failed: ${step.name}`, error);

      return {
        stepId: step.id,
        status: StepStatus.Failed,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    }
  }
}

/**
 * Conditional step executor - executes based on conditions
 */
export class ConditionalStepExecutor implements StepExecutor {
  constructor(
    _stepExecutors: Map<StepType, StepExecutor>,
    private readonly logger: Logger
  ) {}

  async execute(
    step: WorkflowStepConfig,
    context: StepExecutionContext
  ): Promise<StepResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Evaluating conditional step: ${step.name}`);

      // Get condition from config
      const condition = step.config?.condition as string;
      if (!condition) {
        throw new Error('Conditional step requires a condition in config');
      }

      // Evaluate condition
      const conditionMet = this.evaluateCondition(condition, context);

      // Note: Conditional steps with nested workflow configs are not yet fully supported
      // This is a simplified implementation that will be enhanced in future versions

      if (conditionMet) {
        this.logger.info(`Condition met: ${condition}`);
      } else {
        this.logger.info(`Condition not met: ${condition}`);
      }

      if (conditionMet) {
        // For now, just return success if condition is met
        const output = step.config?.thenOutput ?? 'condition met';
        const completedAt = new Date();
        return {
          stepId: step.id,
          status: StepStatus.Completed,
          output: output as JsonValue,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        };
      } else {
        // Execute else branch or skip
        const output = step.config?.elseOutput;
        if (output !== undefined) {
          const completedAt = new Date();
          return {
            stepId: step.id,
            status: StepStatus.Completed,
            output: output as JsonValue,
            startedAt,
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
          };
        }

        // No else branch - skip
        const completedAt = new Date();

        return {
          stepId: step.id,
          status: StepStatus.Skipped,
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        };
      }
    } catch (error) {
      const completedAt = new Date();

      this.logger.error(`Conditional step failed: ${step.name}`, error);

      return {
        stepId: step.id,
        status: StepStatus.Failed,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    }
  }

  private evaluateCondition(condition: string, context: StepExecutionContext): boolean {
    // Simple condition evaluation
    // In production, use a safe expression evaluator

    // Support basic comparisons
    if (condition.includes('==')) {
      const parts = condition.split('==').map((s) => s.trim());
      const left = parts[0] ?? '';
      const right = parts[1] ?? '';
      return this.getValue(left, context) == this.getValue(right, context);
    }

    if (condition.includes('!=')) {
      const parts = condition.split('!=').map((s) => s.trim());
      const left = parts[0] ?? '';
      const right = parts[1] ?? '';
      return this.getValue(left, context) != this.getValue(right, context);
    }

    // Default: check if value is truthy
    return Boolean(this.getValue(condition, context));
  }

  private getValue(path: string, context: StepExecutionContext): unknown {
    // Support simple path lookup like "stepInput" or "context.key"
    if (path.startsWith('stepInput')) {
      return context.stepInput;
    }

    if (path.startsWith('context.')) {
      const key = path.substring(8);
      return context.workflowContext[key];
    }

    // Literal value
    return path;
  }
}

/**
 * Parallel step executor - executes multiple steps concurrently
 */
export class ParallelStepExecutor implements StepExecutor {
  constructor(
    _stepExecutors: Map<StepType, StepExecutor>,
    private readonly logger: Logger
  ) {}

  async execute(
    step: WorkflowStepConfig,
    _context: StepExecutionContext
  ): Promise<StepResult> {
    const startedAt = new Date();

    try {
      this.logger.debug(`Executing parallel step: ${step.name}`);

      // Note: Parallel step execution with nested workflow configs is not yet fully supported
      // This is a simplified implementation

      this.logger.warn('Parallel step execution is simplified - returning placeholder');

      const completedAt = new Date();

      return {
        stepId: step.id,
        status: StepStatus.Completed,
        output: {
          message: 'Parallel execution placeholder',
          stepName: step.name,
        },
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    } catch (error) {
      const completedAt = new Date();

      this.logger.error(`Parallel step failed: ${step.name}`, error);

      return {
        stepId: step.id,
        status: StepStatus.Failed,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      };
    }
  }
}
