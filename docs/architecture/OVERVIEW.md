# Emissary Architecture Overview

## Introduction

Emissary is built following Clean Architecture principles, ensuring separation of concerns, testability, and maintainability. The architecture consists of concentric layers where dependencies flow inward, with the domain at the center.

## Architecture Layers

### 1. Domain Layer (Core)

**Location**: `src/domain/`

The innermost layer containing the core business logic. This layer has no dependencies on other layers.

**Components**:
- **Entities**: Core business objects (Agent, Task, Tool, Workflow)
- **Value Objects**: Immutable values (IDs, timestamps)
- **Domain Errors**: Business rule violations and validation errors

**Key Entities**:
- `Agent`: Autonomous entity with capabilities and configuration
- `Task`: Unit of work with status, constraints, and results
- `Tool`: Executable capability with schema and validation
- `Workflow`: Orchestrated sequence of steps with context

### 2. Application Layer

**Location**: `src/application/`

Contains the application's business rules and orchestration logic.

**Components**:
- **Use Cases**: Application-specific business logic
  - `ExecuteAgentUseCase`: Run agents with LLM and tool integration
  - `LoadPluginUseCase`: Manage plugin lifecycle
  - `RunWorkflowUseCase`: Execute workflows

- **Ports (Interfaces)**:
  - **Input Ports**: Use case interfaces
  - **Output Ports**: Dependencies (LLM providers, repositories, tool registry)

**Dependency Rule**: The application layer depends only on the domain layer.

### 3. Infrastructure Layer

**Location**: `src/infrastructure/`

Implements the interfaces defined in the application layer.

**Components**:

#### LLM Providers
- `AnthropicProvider`: Claude integration
- `OpenAIProvider`: GPT integration
- `LLMProviderRegistry`: Provider management

#### Plugin System
- `PluginRegistry`: Plugin management
- `FilePluginLoader`: File-based plugin discovery
- `TrustedPluginRuntime`: Plugin execution environment

#### Agent Infrastructure
- `ToolRegistry`: Tool management
- Built-in tools: calculator, echo, current_time, etc.

#### Persistence
- `InMemoryAgentRepository`: Agent storage (demo implementation)

### 4. Adapters Layer

**Location**: `src/adapters/`

External interfaces and entry points (planned).

**Components**:
- CLI controllers
- API controllers
- Presenters
- Data mappers

## Data Flow

### Agent Execution Flow

```
User Request
    ↓
Emissary.executeAgent()
    ↓
ExecuteAgentUseCaseImpl
    ↓
AgentRepository (load agent)
    ↓
LLM Provider (generate completion)
    ↓
ToolRegistry (execute tools)
    ↓
Result ← back to user
```

### Plugin Loading Flow

```
User Request
    ↓
Emissary.loadPlugin()
    ↓
LoadPluginUseCaseImpl
    ↓
FilePluginLoader.discover()
    ↓
PluginRuntime.load()
    ↓
Plugin.initialize(context)
    ↓
Plugin registers tools/capabilities
    ↓
Result ← back to user
```

## Key Design Patterns

### 1. Dependency Inversion

All dependencies point inward. Infrastructure implements interfaces defined in the application layer.

### 2. Repository Pattern

Abstracts data persistence behind interfaces, allowing for different storage implementations.

### 3. Result Type

Uses a Result monad for error handling without exceptions:
```typescript
const result: Result<Value, Error> = await useCase.execute();
if (result.isOk()) {
  const value = result.unwrap();
} else {
  const error = result.unwrap();
}
```

### 4. Plugin Architecture

Plugins extend functionality through a well-defined interface:
- Discovery via manifest files
- Isolated execution contexts
- Capability-based access control

### 5. Registry Pattern

Centralized management of providers, tools, and plugins:
- `LLMProviderRegistry`
- `ToolRegistry`
- `PluginRegistry`

## Extension Points

### Adding a New LLM Provider

1. Implement the `LLMProvider` interface
2. Register with `LLMProviderRegistry`
3. Configure in `EmissaryConfig`

### Creating a Custom Tool

1. Create a `Tool` instance with schema and executor
2. Register with `ToolRegistry`
3. Available to all agents

### Building a Plugin

1. Create `plugin.json` manifest
2. Implement the `Plugin` interface
3. Register tools/capabilities in `initialize()`
4. Load via `Emissary.loadPlugin()`

### Adding a Use Case

1. Define input port interface in `application/ports/input/`
2. Define output port interfaces in `application/ports/output/`
3. Implement use case in `application/use-cases/`
4. Wire up in `Emissary` class

## Type Safety

Emissary is fully typed with TypeScript:
- Branded types for IDs prevent mixing
- Strict null checks enabled
- No implicit any
- Result types for error handling

## Testing Strategy

### Unit Tests
Test domain logic in isolation:
- Entity behavior
- Value object validation
- Business rule enforcement

### Integration Tests
Test layer interactions:
- Use cases with mocked dependencies
- Repository implementations
- LLM provider integrations

### End-to-End Tests
Test complete flows:
- Agent execution
- Plugin loading
- Workflow orchestration

## Future Enhancements

### Workflow Engine
Complete implementation of:
- Workflow execution
- Step orchestration
- State management
- Parallel execution

### Advanced Plugin Runtime
- Sandboxed execution (VM-based)
- Process isolation
- Resource limits
- Security policies

### Memory System
- Short-term memory (conversation context)
- Long-term memory (persistent storage)
- Vector embeddings for semantic search

### CLI Interface
- Interactive agent execution
- Plugin management
- Configuration management

## Conclusion

Emissary's clean architecture ensures:
- **Testability**: Pure domain logic, mockable dependencies
- **Flexibility**: Easy to swap implementations
- **Maintainability**: Clear boundaries and responsibilities
- **Extensibility**: Well-defined extension points
