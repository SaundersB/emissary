/**
 * Built-in tools for agents
 */

import { Tool, ToolParams, ToolResult } from '@domain/entities/tool.js';
import { ToolId } from '@domain/value-objects/index.js';
import { JsonValue } from '@shared/types/index.js';

/**
 * Calculator tool
 */
export function createCalculatorTool(): Tool {
  return new Tool(
    ToolId.create('tool-calculator'),
    'calculator',
    'Perform basic mathematical calculations. Supports +, -, *, /, and parentheses.',
    {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2", "10 * (5 - 3)")',
        },
      },
      required: ['expression'],
    },
    async (params: ToolParams): Promise<ToolResult> => {
      try {
        const expression = params.expression as string;

        // Safety check - only allow numbers, operators, and parentheses
        if (!/^[\d+\-*/().\s]+$/.test(expression)) {
          return {
            success: false,
            error: 'Invalid expression. Only numbers and basic operators are allowed.',
          };
        }

        // Evaluate the expression
        // Note: Using Function is generally unsafe, but we've validated the input
        const result = Function(`'use strict'; return (${expression})`)() as number;

        return {
          success: true,
          output: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      examples: [
        { params: { expression: '2 + 2' }, description: 'Simple addition' },
        { params: { expression: '10 * (5 - 3)' }, description: 'Expression with parentheses' },
      ],
    }
  );
}

/**
 * Echo tool - returns the input (useful for testing)
 */
export function createEchoTool(): Tool {
  return new Tool(
    ToolId.create('tool-echo'),
    'echo',
    'Echo back the input message. Useful for testing.',
    {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo back',
        },
      },
      required: ['message'],
    },
    async (params: ToolParams): Promise<ToolResult> => {
      return {
        success: true,
        output: params.message,
      };
    }
  );
}

/**
 * Current time tool
 */
export function createCurrentTimeTool(): Tool {
  return new Tool(
    ToolId.create('tool-current-time'),
    'current_time',
    'Get the current date and time in ISO 8601 format.',
    {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Optional timezone (defaults to UTC)',
        },
      },
    },
    async (_params: ToolParams): Promise<ToolResult> => {
      return {
        success: true,
        output: {
          iso: new Date().toISOString(),
          timestamp: Date.now(),
          readable: new Date().toLocaleString(),
        },
      };
    }
  );
}

/**
 * JSON parser tool
 */
export function createJSONParserTool(): Tool {
  return new Tool(
    ToolId.create('tool-json-parser'),
    'parse_json',
    'Parse a JSON string into an object.',
    {
      type: 'object',
      properties: {
        json_string: {
          type: 'string',
          description: 'The JSON string to parse',
        },
      },
      required: ['json_string'],
    },
    async (params: ToolParams): Promise<ToolResult> => {
      try {
        const parsed = JSON.parse(params.json_string as string) as JsonValue;
        return {
          success: true,
          output: parsed,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );
}

/**
 * String manipulation tool
 */
export function createStringManipulationTool(): Tool {
  return new Tool(
    ToolId.create('tool-string-manipulation'),
    'string_manipulation',
    'Perform various string manipulations (uppercase, lowercase, reverse, length).',
    {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to manipulate',
        },
        operation: {
          type: 'string',
          enum: ['uppercase', 'lowercase', 'reverse', 'length', 'trim'],
          description: 'The operation to perform',
        },
      },
      required: ['text', 'operation'],
    },
    async (params: ToolParams): Promise<ToolResult> => {
      const text = params.text as string;
      const operation = params.operation as string;

      let result: string | number;

      switch (operation) {
        case 'uppercase':
          result = text.toUpperCase();
          break;
        case 'lowercase':
          result = text.toLowerCase();
          break;
        case 'reverse':
          result = text.split('').reverse().join('');
          break;
        case 'length':
          result = text.length;
          break;
        case 'trim':
          result = text.trim();
          break;
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }

      return {
        success: true,
        output: result,
      };
    }
  );
}

/**
 * Get all built-in tools
 */
export function getBuiltInTools(): Tool[] {
  return [
    createCalculatorTool(),
    createEchoTool(),
    createCurrentTimeTool(),
    createJSONParserTool(),
    createStringManipulationTool(),
  ];
}
