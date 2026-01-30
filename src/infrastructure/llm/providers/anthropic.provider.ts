/**
 * Anthropic LLM Provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMCapabilities,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  Message,
  ToolCall,
} from '@application/ports/output/llm-provider.port.js';
import { Logger } from '@shared/utils/logger.js';
import { LLM } from '@shared/constants.js';

/**
 * Anthropic provider configuration
 */
export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel?: string;
}

/**
 * Anthropic LLM Provider
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly capabilities: LLMCapabilities = {
    supportsToolUse: true,
    supportsStreaming: true,
    supportsVision: true,
    maxTokens: 200000,
    supportedModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  };

  private client: Anthropic;
  private defaultModel: string;

  constructor(
    config: AnthropicProviderConfig,
    private readonly logger: Logger
  ) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.defaultModel ?? LLM.DEFAULT_MODEL.anthropic;
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      this.logger.debug('Generating Anthropic completion');

      // Convert messages to Anthropic format
      const { system, messages } = this.convertMessages(request.messages);

      // Convert tools if present
      const tools = request.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));

      // Make API call
      const response = await this.client.messages.create({
        model: request.model ?? this.defaultModel,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system,
        messages: messages as Anthropic.MessageParam[],
        tools: tools as Anthropic.Tool[] | undefined,
        stop_sequences: request.stop,
      });

      // Extract content and tool calls
      let content = '';
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          });
        }
      }

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        metadata: {
          model: response.model,
          id: response.id,
        },
      };
    } catch (error) {
      this.logger.error('Anthropic completion failed:', error);
      throw error;
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    try {
      this.logger.debug('Streaming Anthropic completion');

      // Convert messages to Anthropic format
      const { system, messages } = this.convertMessages(request.messages);

      // Convert tools if present
      const tools = request.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));

      // Make streaming API call
      const stream = await this.client.messages.stream({
        model: request.model ?? this.defaultModel,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system,
        messages: messages as Anthropic.MessageParam[],
        tools: tools as Anthropic.Tool[] | undefined,
        stop_sequences: request.stop,
      });

      // Stream chunks
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              content: event.delta.text,
            };
          }
        } else if (event.type === 'message_stop') {
          const finalMessage = await stream.finalMessage();
          yield {
            finishReason: this.mapStopReason(finalMessage.stop_reason),
            usage: {
              promptTokens: finalMessage.usage.input_tokens,
              completionTokens: finalMessage.usage.output_tokens,
              totalTokens:
                finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
            },
          };
        }
      }
    } catch (error) {
      this.logger.error('Anthropic streaming failed:', error);
      throw error;
    }
  }

  async embedText(_text: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings API yet
    // This would need to use a different service or return error
    throw new Error('Anthropic does not support embeddings');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to create a minimal message
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic health check failed:', error);
      return false;
    }
  }

  private convertMessages(messages: Message[]): {
    system?: string;
    messages: Array<{ role: string; content: string }>;
  } {
    const system = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    return {
      system,
      messages: conversationMessages,
    };
  }

  private mapStopReason(
    stopReason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
