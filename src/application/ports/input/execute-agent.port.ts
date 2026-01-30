/**
 * Execute Agent use case port
 */

import { AgentId, ExecutionId } from '@domain/value-objects/index.js';
import { TaskContext } from '@domain/entities/task.js';
import { Result } from '@shared/types/index.js';

/**
 * Execution options
 */
export interface ExecutionOptions {
  maxIterations?: number;
  timeout?: number;
  llmProvider?: string;
  tools?: string[];
  temperature?: number;
  modelName?: string;
}

/**
 * Iteration record
 */
export interface Iteration {
  number: number;
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
  observation: string;
  timestamp: Date;
}

/**
 * Execution metadata
 */
export interface ExecutionMetadata {
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  iterations: number;
  tokensUsed?: number;
  [key: string]: unknown;
}

/**
 * Execute agent request
 */
export interface ExecuteAgentRequest {
  agentId: AgentId;
  taskDescription: string;
  context?: TaskContext;
  options?: ExecutionOptions;
}

/**
 * Execute agent response
 */
export interface ExecuteAgentResponse {
  executionId: ExecutionId;
  success: boolean;
  output?: unknown;
  error?: string;
  iterations: Iteration[];
  metadata: ExecutionMetadata;
}

/**
 * Execute Agent use case interface
 */
export interface ExecuteAgentUseCase {
  execute(request: ExecuteAgentRequest): Promise<Result<ExecuteAgentResponse, Error>>;
}
