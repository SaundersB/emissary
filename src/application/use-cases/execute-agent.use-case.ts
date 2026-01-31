/**
 * Execute Agent use case implementation
 */

import {
  ExecuteAgentUseCase,
  ExecuteAgentRequest,
  ExecuteAgentResponse,
  Iteration,
} from '../ports/input/execute-agent.port.js';
import { AgentRepository } from '../ports/output/agent-repository.port.js';
import { LLMProvider } from '../ports/output/llm-provider.port.js';
import { ToolRegistry } from '../ports/output/tool.port.js';
import { MemoryStore } from '../ports/output/memory.port.js';
import { Task, TaskStatus, Constraints } from '@domain/entities/task.js';
import { MemoryType, MemoryImportance } from '@domain/entities/memory.js';
import { TaskId, ExecutionId } from '@domain/value-objects/index.js';
import { Result, ok, err, JsonValue } from '@shared/types/index.js';
import { Logger } from '@shared/utils/logger.js';
import { AGENT } from '@shared/constants.js';

/**
 * Execute Agent use case implementation
 */
export class ExecuteAgentUseCaseImpl implements ExecuteAgentUseCase {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly llmProvider: LLMProvider,
    private readonly toolRegistry: ToolRegistry,
    private readonly logger: Logger,
    private readonly memoryStore?: MemoryStore
  ) {}

  async execute(request: ExecuteAgentRequest): Promise<Result<ExecuteAgentResponse, Error>> {
    const executionId = ExecutionId.create();
    const startedAt = new Date();
    const iterations: Iteration[] = [];

    try {
      this.logger.info(`Starting agent execution: ${executionId.toString()}`);

      // Find the agent
      const agent = await this.agentRepository.findById(request.agentId);
      if (!agent) {
        return err(new Error(`Agent not found: ${request.agentId.toString()}`));
      }

      // Create task
      const task = new Task(
        TaskId.create(),
        request.taskDescription,
        request.context ?? {},
        [
          Constraints.maxIterations(
            request.options?.maxIterations ?? AGENT.DEFAULT_MAX_ITERATIONS
          ),
          Constraints.timeout(request.options?.timeout ?? AGENT.DEFAULT_TIMEOUT_MS),
        ]
      );

      // Update task status to running
      task.updateStatus(TaskStatus.Running);

      // Get available tools
      const availableTools = request.options?.tools
        ? request.options.tools
            .map((name) => this.toolRegistry.getByName(name))
            .filter((t) => t !== undefined)
        : this.toolRegistry.list();

      const toolDefinitions = availableTools.map((tool) => tool.getToolDefinition());

      // Agent execution loop
      const maxIterations = request.options?.maxIterations ?? AGENT.DEFAULT_MAX_ITERATIONS;
      let iterationCount = 0;
      let completed = false;
      let finalOutput: unknown = null;

      while (iterationCount < maxIterations && !completed) {
        iterationCount++;
        this.logger.debug(`Agent iteration ${iterationCount}/${maxIterations}`);

        try {
          // Build messages for LLM
          const messages = await this.buildMessages(agent, task, iterations);

          // Call LLM
          const response = await this.llmProvider.generateCompletion({
            messages,
            model: request.options?.modelName ?? agent.getConfig().modelName,
            temperature: request.options?.temperature ?? agent.getConfig().temperature ?? 0.7,
            tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
            toolChoice: toolDefinitions.length > 0 ? 'auto' : undefined,
          });

          // Parse response
          const thought = response.content;

          // Check if agent wants to use a tool
          if (response.toolCalls && response.toolCalls.length > 0) {
            const toolCall = response.toolCalls[0];
            if (!toolCall) {
              throw new Error('Tool call is undefined');
            }

            this.logger.debug(`Agent calling tool: ${toolCall.name}`);

            // Execute tool
            const toolResult = await this.toolRegistry.execute(
              toolCall.name,
              toolCall.arguments as Record<string, JsonValue>
            );

            const observation = toolResult.success
              ? JSON.stringify(toolResult.output)
              : `Error: ${toolResult.error}`;

            // Record iteration
            iterations.push({
              number: iterationCount,
              thought,
              action: toolCall.name,
              actionInput: toolCall.arguments as Record<string, unknown>,
              observation,
              timestamp: new Date(),
            });

            // Store in memory if available
            if (this.memoryStore) {
              await this.memoryStore.store(
                MemoryType.Episodic,
                {
                  type: 'tool_execution',
                  tool: toolCall.name,
                  input: toolCall.arguments,
                  output: toolResult.output,
                  success: toolResult.success,
                  timestamp: new Date().toISOString(),
                } as JsonValue,
                toolResult.success ? MemoryImportance.Medium : MemoryImportance.Low,
                ['tool', toolCall.name, executionId.toString()]
              );
            }

            // Check if tool execution failed
            if (!toolResult.success) {
              this.logger.warn(`Tool execution failed: ${toolResult.error}`);
            }
          } else {
            // No tool call - agent is providing final answer
            this.logger.info('Agent provided final answer');

            iterations.push({
              number: iterationCount,
              thought,
              action: 'final_answer',
              actionInput: {},
              observation: thought,
              timestamp: new Date(),
            });

            finalOutput = thought;
            completed = true;
          }
        } catch (error) {
          this.logger.error(`Error in iteration ${iterationCount}:`, error);
          throw error;
        }
      }

      // Check if max iterations reached
      if (!completed) {
        this.logger.warn('Max iterations reached without completion');
        task.updateStatus(TaskStatus.Failed);
        task.setResult({
          success: false,
          error: 'Maximum iterations reached without completion',
        });
      } else {
        task.updateStatus(TaskStatus.Completed);
        task.setResult({
          success: true,
          output: finalOutput as JsonValue,
        });
      }

      const completedAt = new Date();

      this.logger.info(`Agent execution completed: ${executionId.toString()}`);

      return ok({
        executionId,
        success: completed,
        output: (finalOutput ?? null) as JsonValue,
        error: completed ? undefined : 'Maximum iterations reached',
        iterations,
        metadata: {
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          iterations: iterationCount,
        },
      });
    } catch (error) {
      this.logger.error('Agent execution failed:', error);

      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async buildMessages(
    agent: ReturnType<typeof this.agentRepository.findById> extends Promise<infer T>
      ? NonNullable<T>
      : never,
    task: Task,
    iterations: Iteration[]
  ) {
    const messages = [];

    // System message
    const systemPrompt =
      agent.getConfig().systemPrompt ||
      `You are ${agent.name}. ${agent.description}

When solving tasks:
1. Think step by step about what you need to do
2. Use available tools when needed
3. When you have the final answer, respond directly without using tools

Your capabilities: ${agent.getCapabilities().join(', ')}`;

    messages.push({
      role: 'system' as const,
      content: systemPrompt,
    });

    // User task
    messages.push({
      role: 'user' as const,
      content: task.description,
    });

    // Add relevant memories if available
    if (this.memoryStore) {
      const memoryResult = await this.memoryStore.query({
        type: MemoryType.Episodic,
        minImportance: MemoryImportance.Medium,
        limit: 5,
      });

      if (memoryResult.isOk()) {
        const memories = memoryResult.unwrap();
        if (memories.length > 0) {
          const memoryContext = memories
            .map((mem) => {
              const content = mem.content as Record<string, unknown>;
              return `Past observation: Used ${content.tool} - ${content.success ? 'succeeded' : 'failed'}`;
            })
            .join('\n');

          messages.push({
            role: 'system' as const,
            content: `Relevant past experience:\n${memoryContext}`,
          });
        }
      }
    }

    // Previous iterations
    for (const iteration of iterations) {
      // Assistant's thought/action
      messages.push({
        role: 'assistant' as const,
        content: iteration.thought,
      });

      // Tool result (observation)
      if (iteration.action !== 'final_answer') {
        messages.push({
          role: 'user' as const,
          content: `Tool result: ${iteration.observation}`,
        });
      }
    }

    return messages;
  }
}
