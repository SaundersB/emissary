# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd /Users/brandonsaunders/src/emissary
npm install
```

### 2. Set Your API Key

```bash
# Use Anthropic (recommended)
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Or use OpenAI
export OPENAI_API_KEY="your-openai-api-key"
```

Get your API key:
- **Anthropic**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/

### 3. Choose Your Interface

#### Option A: Web UI (Easiest) ⭐

```bash
npm run web
```

Then open: **http://localhost:3000**

Features:
- 🎨 Modern dark theme interface
- 🤖 Create and manage agents visually
- ⚡ Execute agents with real-time results
- 📊 Monitor memory statistics
- 🔧 Browse available tools

#### Option B: Interactive CLI

```bash
npm run cli
```

Then follow the prompts to:
- Configure settings
- Create agents
- Run agents
- Manage workflows

#### Option C: Run Examples

```bash
# Basic agent execution
npm run cli examples/basic-example.ts

# Memory system demo
npm run cli examples/memory-example.ts

# Workflow orchestration
npm run cli examples/workflow-example.ts
```

#### Option D: Run Tests

```bash
# Comprehensive test suite (colorful output)
npm run test:manual

# Automated E2E tests
npm run test:e2e
```

## 📖 What Can You Do?

### Create Agents

```typescript
const agent = await emissary.createAgent(
  'Research Assistant',
  'Helps with research tasks',
  [Capability.WebSearch]
);
```

### Execute Tasks

```typescript
const result = await emissary.executeAgent(
  agent.id,
  'Calculate 42 + 58 using the calculator tool',
  { maxIterations: 5, tools: ['calculator'] }
);
```

### Create Workflows

```typescript
const workflow = await emissary.createWorkflow(
  'Data Pipeline',
  'Process and analyze data',
  [
    { name: 'Load', type: StepType.Fixed, config: { function: 'echo' } },
    { name: 'Analyze', type: StepType.Agent, config: { /* ... */ } }
  ]
);
```

### Manage Memory

```typescript
// Get statistics
const stats = await emissary.getMemoryStats();

// Consolidate important memories
await emissary.consolidateMemory();

// Clear old memories
await emissary.pruneMemory(maxAge, minImportance);
```

## 🛠️ Available Tools

Built-in tools ready to use:
- **calculator** - Perform mathematical calculations
- **echo** - Echo back input (useful for testing)
- **current_time** - Get current date and time
- **parse_json** - Parse JSON strings
- **string_manipulation** - String operations (uppercase, lowercase, reverse)

## 📚 Documentation

Comprehensive guides available in `docs/guides/`:

- **TESTING.md** - Testing guide with examples
- **WEB_UI.md** - Web UI documentation and API reference
- **MEMORY.md** - Memory system guide
- **WORKFLOWS.md** - Workflow orchestration guide
- **PLUGIN_DEVELOPMENT.md** - Plugin creation guide

## 🔧 Configuration

### Basic Configuration

```typescript
const emissary = new Emissary({
  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
  },
  memory: {
    enabled: true,
    consolidationThreshold: 100,
    pruneInterval: 3600000, // 1 hour
  },
});
```

### Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="your-key"
# or
export OPENAI_API_KEY="your-key"

# Optional
export PORT=3000              # Web server port
export HOST=localhost         # Web server host
export LOG_LEVEL=info        # Logging level (debug, info, warn, error)
```

## ✅ Verify Installation

Run the type checker:

```bash
npm run typecheck
```

Expected output: No errors ✓

Run the manual test:

```bash
npm run test:manual
```

Expected output:
```
🚀 Emissary Full System Test

━━━ Initialization ━━━
✓ Emissary initialized

...

━━━ Test Summary ━━━
Passed: 12
Failed: 0

✨ Test run complete!
```

## 🎯 Next Steps

1. **Try the Web UI**: `npm run web` then open http://localhost:3000
2. **Create your first agent** using the web interface
3. **Execute a task** with the calculator tool
4. **Explore the examples** in the `examples/` directory
5. **Read the guides** in `docs/guides/` for advanced features

## 🆘 Troubleshooting

### API Key Not Found

**Problem**: "No API key found" error

**Solution**: Make sure you've exported your API key:
```bash
export ANTHROPIC_API_KEY="your-key"
```

### Port Already in Use

**Problem**: Web server can't start on port 3000

**Solution**: Use a different port:
```bash
PORT=8080 npm run web
```

### TypeScript Errors

**Problem**: TypeScript compilation fails

**Solution**: Ensure all dependencies are installed:
```bash
npm install
npm run typecheck
```

### Agent Execution Timeout

**Problem**: Agent takes too long or doesn't respond

**Solution**:
- Increase `maxIterations` option
- Check your internet connection
- Verify API key is valid
- Try a simpler task first

## 📊 Project Status

Current Features:
- ✅ Clean Architecture (Domain, Application, Infrastructure, Adapters)
- ✅ LLM Providers (Anthropic Claude, OpenAI GPT)
- ✅ Agent Execution with Tool Use
- ✅ Plugin System (Trusted runtime)
- ✅ Workflow Orchestration
- ✅ Memory System (Short-term & Long-term)
- ✅ CLI Interface
- ✅ Web UI with REST API
- ✅ E2E Testing Infrastructure
- ⏳ Sandboxed Plugin Runtime (planned)

## 🎉 You're Ready!

Everything is set up and ready to use. Start with the web UI for the easiest experience:

```bash
npm run web
```

Then open **http://localhost:3000** and start creating agents!

For questions or issues, refer to the documentation in `docs/guides/` or the `README.md`.

Happy building! 🚀
