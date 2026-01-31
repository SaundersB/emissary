# Emissary

A TypeScript-based agentic framework built with clean architecture principles, featuring hybrid AI/traditional workflows, an extensible plugin system, and provider-agnostic LLM integration.

## Features

- **Clean Architecture**: Clear separation of concerns with domain-driven design
- **Hybrid Agents**: Combine AI-powered reasoning with traditional workflow orchestration
- **Memory System**: Short-term and long-term memory with automatic consolidation
- **Plugin System**: File-based plugins with three trust levels (trusted, sandboxed, isolated)
- **Provider-Agnostic**: Support for OpenAI, Anthropic, and local LLM providers
- **Type-Safe**: Fully typed with TypeScript for reliability and maintainability
- **Extensible**: Easy to extend with custom agents, tools, workflows, and LLM providers
- **CLI Interface**: Full command-line interface for agent management and execution

## Architecture

Emissary follows clean architecture principles with four main layers:

1. **Domain Layer**: Core business entities (Agent, Task, Tool, Workflow)
2. **Application Layer**: Use cases and port interfaces
3. **Infrastructure Layer**: LLM providers, plugin system, agent runtime, workflow engine
4. **Adapters Layer**: CLI, API, and other interfaces

## Getting Started

### Prerequisites

- Node.js 20.x or later
- API key from Anthropic or OpenAI

### Installation

```bash
# Clone or navigate to the project
cd emissary

# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY="your-key-here"
# or
export OPENAI_API_KEY="your-key-here"
```

### Quick Start Options

Choose your preferred interface:

**1. Web UI (Easiest)**
```bash
npm run web
# Open http://localhost:3000
```

**2. CLI**
```bash
npm run cli
# Interactive CLI interface
```

**3. Code/Examples**
```bash
npm run cli examples/basic-example.ts
```

**4. Testing**
```bash
npm run test:manual
```

### Quick Start

```typescript
import { Emissary, Capability } from 'emissary';

// Initialize with your LLM provider
const emissary = new Emissary({
  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
  },
});

// Create an agent
const agent = await emissary.createAgent(
  'Research Assistant',
  'An agent that helps with research tasks',
  [Capability.WebSearch, Capability.Summarization]
);

// Execute a task
const result = await emissary.executeAgent(
  agent.id,
  'Calculate the sum of 15 and 27 using the calculator tool',
  { maxIterations: 5 }
);

if (result.isOk()) {
  console.log('Result:', result.unwrap().output);
}
```

### Running Examples

```bash
# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Run the basic example
npm run cli examples/basic-example.ts

# Run the memory example
npm run cli examples/memory-example.ts

# Run the workflow example
npm run cli examples/workflow-example.ts
```

### Web UI

Launch the web interface for visual agent management:

```bash
# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Start the web server
npm run web

# Open http://localhost:3000
```

Features:
- 🎨 Modern dark theme UI
- 🚀 Create and manage agents
- ⚡ Execute agents with real-time results
- 📊 Monitor memory statistics
- 🔧 Browse available tools
- 🌊 View and run workflows

### Testing

Run comprehensive tests with real LLM integration:

```bash
# Manual test script (recommended)
npm run test:manual

# Jest E2E tests
npm run test:e2e
```

## Core Concepts

### Agents

Agents are autonomous entities that can:
- Reason using LLMs
- Use tools to accomplish tasks
- Maintain memory across executions
- Work within defined capabilities

### Tools

Built-in tools include:
- **calculator**: Perform mathematical calculations
- **echo**: Echo back input (useful for testing)
- **current_time**: Get current date/time
- **parse_json**: Parse JSON strings
- **string_manipulation**: String operations

### Memory

Agents can remember past interactions and learn from experience:
- **Short-Term Memory**: Fast in-memory storage for active sessions
- **Long-Term Memory**: Persistent file-based storage for important knowledge
- **Automatic Consolidation**: Important memories promoted to long-term storage
- **Smart Retrieval**: Relevant past experiences inform current decisions

```typescript
const emissary = new Emissary({
  llm: { /* config */ },
  memory: {
    enabled: true,
    consolidationThreshold: 100,
    pruneInterval: 3600000, // 1 hour
  }
});

// Memory is automatically used during agent execution
// Manually manage memory
await emissary.getMemoryStats();
await emissary.consolidateMemory();
await emissary.pruneMemory();
```

### Plugins

Extend Emissary with custom functionality:
- Tool plugins: Add new capabilities
- Agent plugins: Custom agent types
- Workflow plugins: New workflow steps
- LLM provider plugins: Support new LLM providers

### Trust Levels

Plugins can run at different trust levels:
- **Trusted**: Full access, same process
- **Sandboxed**: Limited API, VM context (planned)
- **Isolated**: Separate process, minimal access (planned)

## Architecture

```
┌─────────────────────────────────────┐
│         Domain Layer                │
│  (Entities, Value Objects, Errors)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Application Layer              │
│  (Use Cases, Ports/Interfaces)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Infrastructure Layer             │
│  (LLM, Plugins, Agents, Workflows)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Adapters Layer                │
│        (CLI, API)                   │
└─────────────────────────────────────┘
```

## Development

### Build

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## Project Structure

```
emissary/
├── src/
│   ├── domain/           # Core business logic
│   ├── application/      # Use cases and interfaces
│   ├── infrastructure/   # Implementation details
│   ├── adapters/         # External interfaces
│   └── shared/          # Shared utilities
├── plugins/             # Plugin directory
├── examples/            # Example usage
└── tests/              # Test files
```

## Contributing

Contributions are welcome! Please ensure:
- All tests pass
- Code follows the style guide (enforced by ESLint/Prettier)
- Clean architecture principles are maintained

### Workflows

Create multi-step workflows that combine fixed logic with agent reasoning:

```typescript
const workflow = await emissary.createWorkflow(
  'Data Processing',
  'Process and analyze data',
  [
    {
      name: 'Load Data',
      type: StepType.Fixed,
      config: { function: 'echo' }
    },
    {
      name: 'Analyze',
      type: StepType.Agent,
      config: {
        agentId: agent.id.toString(),
        taskDescription: 'Analyze and summarize the data',
        tools: ['calculator'],
        maxIterations: 5
      }
    }
  ]
);

const result = await emissary.runWorkflow(workflow.id, { data: 'input' });
```

## Roadmap

- [x] Core architecture and domain model
- [x] LLM provider integration (Anthropic, OpenAI)
- [x] Basic agent execution with tool use
- [x] Plugin system foundation
- [x] Workflow orchestration engine
- [x] Memory system (short-term and long-term)
- [x] CLI interface
- [ ] Sandboxed plugin runtime
- [ ] Web UI
- [ ] Advanced memory features (semantic search, embeddings)

## Project Status

This project is in active development. The core architecture is complete and functional, with basic agent execution and tool use working.

## License

MIT
