/**
 * OpenAI LLM Provider implementation
 */

import OpenAI from 'openai';
import {
  LLMProvider,
  LLMCapabilities,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  ToolCall,
} from '@application/ports/output/llm-provider.port.js';
import { Logger } from '@shared/utils/logger.js';
import { LLM } from '@shared/constants.js';

/**
 * OpenAI provider configuration
 */
export interface OpenAIProviderConfig {
  apiKey: string;
  organization?: string;
  defaultModel?: string;
}

/**
 * OpenAI LLM Provider
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly capabilities: LLMCapabilities = {
    supportsToolUse: true,
    supportsStreaming: true,
    supportsVision: true,
    maxTokens: 128000,
    supportedModels: [
      'gpt-4-turbo-preview',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-4o',
      'gpt-4o-mini',
    ],
  };

  private client: OpenAI;
  private defaultModel: string;

  constructor(
    config: OpenAIProviderConfig,
    private readonly logger: Logger
  ) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
    });
    this.defaultModel = config.defaultModel ?? LLM.DEFAULT_MODEL.openai;
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      this.logger.debug('Generating OpenAI completion');

      // Convert messages to OpenAI format
      const messages = request.messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
      }));

      // Convert tools if present
      const tools = request.tools?.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      // Make API call
      const response = await this.client.chat.completions.create({
        model: request.model ?? this.defaultModel,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        tools: tools as OpenAI.ChatCompletionTool[] | undefined,
        tool_choice: request.toolChoice
          ? this.mapToolChoice(request.toolChoice)
          : undefined,
        stop: request.stop,
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No completion choice returned');
      }

      // Extract content and tool calls
      const content = choice.message.content ?? '';
      const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));

      return {
        content,
        toolCalls,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        metadata: {
          model: response.model,
          id: response.id,
        },
      };
    } catch (error) {
      this.logger.error('OpenAI completion failed:', error);
      throw error;
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    try {
      this.logger.debug('Streaming OpenAI completion');

      // Convert messages to OpenAI format
      const messages = request.messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
      }));

      // Convert tools if present
      const tools = request.tools?.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      // Make streaming API call
      const stream = await this.client.chat.completions.create({
        model: request.model ?? this.defaultModel,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        tools: tools as OpenAI.ChatCompletionTool[] | undefined,
        tool_choice: request.toolChoice
          ? this.mapToolChoice(request.toolChoice)
          : undefined,
        stop: request.stop,
        stream: true,
      });

      // Stream chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield {
            content: delta.content,
          };
        }

        if (chunk.choices[0]?.finish_reason) {
          yield {
            finishReason: this.mapFinishReason(chunk.choices[0].finish_reason),
          };
        }
      }
    } catch (error) {
      this.logger.error('OpenAI streaming failed:', error);
      throw error;
    }
  }

  async embedText(text: string): Promise<number[]> {
    try {
      this.logger.debug('Generating OpenAI embedding');

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0]?.embedding ?? [];
    } catch (error) {
      this.logger.error('OpenAI embedding failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - list models
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return false;
    }
  }

  private mapToolChoice(
    toolChoice: 'auto' | 'required' | 'none' | { name: string }
  ): OpenAI.ChatCompletionToolChoiceOption {
    if (typeof toolChoice === 'string') {
      if (toolChoice === 'required') {
        return 'required';
      }
      return toolChoice;
    }
    return {
      type: 'function',
      function: { name: toolChoice.name },
    };
  }

  private mapFinishReason(
    finishReason: string | null | undefined
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (finishReason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
