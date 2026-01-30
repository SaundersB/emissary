# Plugin Development Guide

## Introduction

Plugins extend Emissary's functionality by adding new tools, agents, workflows, or LLM providers. This guide covers how to create and distribute plugins.

## Plugin Structure

### Directory Layout

```
my-plugin/
├── plugin.json          # Plugin manifest
├── index.ts            # Main plugin entry point
├── package.json        # Dependencies (optional)
└── README.md           # Documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "index.js",
  "type": "tool",
  "trustLevel": "trusted",
  "capabilities": ["custom-capability"],
  "dependencies": {},
  "metadata": {
    "author": "Your Name",
    "description": "Plugin description"
  }
}
```

**Fields**:
- `name`: Unique plugin name
- `version`: Semantic version
- `main`: Entry point file (relative path)
- `type`: Plugin type (`tool`, `agent`, `workflow`, `llm-provider`)
- `trustLevel`: Trust level (`trusted`, `sandboxed`, `isolated`)
- `capabilities`: Array of capability strings
- `dependencies`: NPM-style dependencies
- `metadata`: Custom metadata

## Plugin Types

### 1. Tool Plugins

Add new tools that agents can use.

```typescript
import type { Plugin, PluginContext } from 'emissary';

export default class MyToolPlugin implements Plugin {
  async initialize(context: PluginContext): Promise<void> {
    context.registerTool(
      {
        name: 'my_tool',
        description: 'What this tool does',
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter',
            },
          },
          required: ['input'],
        },
      },
      async (params) => {
        // Tool implementation
        const input = params.input as string;
        const result = processInput(input);

        return {
          success: true,
          output: result,
        };
      }
    );
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
```

### 2. Agent Plugins

Create custom agent types (planned).

### 3. Workflow Plugins

Add custom workflow step types (planned).

### 4. LLM Provider Plugins

Integrate new LLM providers (planned).

## Plugin Context API

The `PluginContext` provides access to Emissary functionality:

### Logger

```typescript
context.logger.info('Information message');
context.logger.warn('Warning message');
context.logger.error('Error message');
context.logger.debug('Debug message');
```

### Tool Registration

```typescript
context.registerTool(definition, executor);
```

**Definition**:
```typescript
{
  name: string;              // Tool name (unique)
  description: string;       // What the tool does
  parameters: ToolSchema;    // JSON Schema for parameters
}
```

**Executor**:
```typescript
async (params: Record<string, unknown>) => {
  success: boolean;
  output?: unknown;
  error?: string;
}
```

### Event System

```typescript
// Emit events
context.emit({
  type: 'my-event',
  payload: { data: 'value' },
  timestamp: new Date(),
});

// Listen for events
context.on('my-event', async (event) => {
  console.log('Event received:', event.payload);
});
```

## Trust Levels

### Trusted
- Runs in the same process
- Full access to context API
- Use for first-party plugins
- No sandboxing

### Sandboxed (Planned)
- Runs in VM context
- Limited API surface
- Use for third-party plugins
- Basic isolation

### Isolated (Planned)
- Runs in separate process
- IPC communication only
- Use for untrusted code
- Maximum security

## Parameter Validation

Use JSON Schema for parameter validation:

```typescript
parameters: {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'User name',
      minLength: 1,
      maxLength: 100,
    },
    age: {
      type: 'number',
      description: 'User age',
      minimum: 0,
      maximum: 150,
    },
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    options: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of options',
    },
  },
  required: ['name', 'email'],
}
```

## Error Handling

Always return structured errors:

```typescript
try {
  const result = await doSomething();
  return {
    success: true,
    output: result,
  };
} catch (error) {
  context.logger.error('Operation failed:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
}
```

## Best Practices

### 1. Naming Conventions

- Plugin names: `kebab-case`
- Tool names: `snake_case`
- Event types: `namespace.action` (e.g., `weather.fetched`)

### 2. Logging

- Use appropriate log levels
- Include context in log messages
- Log errors with stack traces

### 3. Resource Management

- Clean up in `cleanup()`
- Close connections
- Clear timers/intervals
- Release memory

### 4. TypeScript

- Use strict type checking
- Define interfaces for parameters
- Export types for users

### 5. Documentation

- Document all tools clearly
- Provide usage examples
- Explain parameter requirements
- Document error cases

## Example: Complete Plugin

```typescript
import type { Plugin, PluginContext } from 'emissary';

interface TranslateParams {
  text: string;
  targetLanguage: string;
}

export default class TranslationPlugin implements Plugin {
  private context!: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Initializing Translation Plugin');

    context.registerTool(
      {
        name: 'translate_text',
        description: 'Translate text to another language',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to translate',
            },
            targetLanguage: {
              type: 'string',
              enum: ['es', 'fr', 'de', 'ja'],
              description: 'Target language code',
            },
          },
          required: ['text', 'targetLanguage'],
        },
      },
      this.translateText.bind(this)
    );

    context.logger.info('Translation Plugin ready');
  }

  private async translateText(params: Record<string, unknown>) {
    try {
      const { text, targetLanguage } = params as TranslateParams;

      this.context.logger.info(
        `Translating to ${targetLanguage}: ${text.substring(0, 50)}...`
      );

      // Call translation API
      const translated = await this.callTranslationAPI(text, targetLanguage);

      this.context.emit({
        type: 'translation.completed',
        payload: { targetLanguage, length: text.length },
        timestamp: new Date(),
      });

      return {
        success: true,
        output: {
          original: text,
          translated,
          targetLanguage,
        },
      };
    } catch (error) {
      this.context.logger.error('Translation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async callTranslationAPI(text: string, language: string): Promise<string> {
    // Mock implementation
    return `[${language}] ${text}`;
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up Translation Plugin');
  }
}
```

## Loading Plugins

### From Code

```typescript
const emissary = new Emissary({ /* config */ });

const result = await emissary.loadPlugin('./plugins/my-plugin');

if (result.isOk()) {
  console.log('Plugin loaded:', result.unwrap().manifest.name);
} else {
  console.error('Failed to load:', result.unwrap());
}
```

### File-based Discovery

Place plugins in the `plugins/` directory and they can be loaded dynamically.

## Testing Plugins

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import MyPlugin from './index';

describe('MyPlugin', () => {
  it('should register tools', async () => {
    const mockContext = {
      pluginId: 'test',
      logger: console,
      config: {},
      registerTool: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
    };

    const plugin = new MyPlugin();
    await plugin.initialize(mockContext);

    expect(mockContext.registerTool).toHaveBeenCalled();
  });
});
```

### Integration Tests

Test with real Emissary instance:

```typescript
const emissary = new Emissary({ /* config */ });
await emissary.loadPlugin('./my-plugin');

const agent = await emissary.createAgent('Test', 'Test agent');
const result = await emissary.executeAgent(
  agent.id,
  'Use my_tool to do something'
);

expect(result.isOk()).toBe(true);
```

## Distribution

### NPM Package

1. Add to `package.json`:
```json
{
  "name": "emissary-plugin-myplugin",
  "keywords": ["emissary-plugin"],
  "main": "dist/index.js"
}
```

2. Publish to NPM:
```bash
npm publish
```

### Git Repository

Share via GitHub:
```bash
git clone https://github.com/user/emissary-plugin-myplugin
```

## Troubleshooting

### Plugin Not Loading

- Check `plugin.json` is valid JSON
- Verify `main` path is correct
- Ensure TypeScript is compiled to JavaScript
- Check console for error messages

### Tool Not Available

- Verify `registerTool` was called
- Check tool name doesn't conflict
- Ensure plugin initialized successfully

### Runtime Errors

- Check parameter validation
- Review error logs
- Test tool execution directly
- Verify dependencies are installed

## Resources

- [Example Plugins](../../plugins/examples/)
- [Architecture Overview](../architecture/OVERVIEW.md)
- [API Reference](../api/README.md)
