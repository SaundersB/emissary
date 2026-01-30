/**
 * LLM Provider port - interface for LLM integrations
 */

import { ToolDefinition } from './tool.port.js';

/**
 * Message role
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Message content
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * Tool call made by the LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool choice
 */
export type ToolChoice = 'auto' | 'required' | 'none' | { name: string };

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * LLM capabilities
 */
export interface LLMCapabilities {
  supportsToolUse: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  maxTokens: number;
  supportedModels: string[];
}

/**
 * Completion request
 */
export interface CompletionRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  metadata?: Record<string, unknown>;
}

/**
 * Streaming completion chunk
 */
export interface CompletionChunk {
  content?: string;
  toolCalls?: Partial<ToolCall>[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: Partial<TokenUsage>;
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Provider capabilities
   */
  readonly capabilities: LLMCapabilities;

  /**
   * Generate a completion
   */
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Stream a completion
   */
  streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>;

  /**
   * Embed text into a vector
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Check if the provider is healthy
   */
  healthCheck(): Promise<boolean>;
}

/**
 * LLM Provider Registry interface
 */
export interface LLMProviderRegistry {
  /**
   * Register a provider
   */
  register(name: string, provider: LLMProvider): void;

  /**
   * Get a provider by name
   */
  get(name: string): LLMProvider | undefined;

  /**
   * Get the default provider
   */
  getDefault(): LLMProvider;

  /**
   * List all registered providers
   */
  list(): string[];

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean;

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean;
}
