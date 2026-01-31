# Testing Guide

## Overview

Emissary includes comprehensive testing capabilities:
- **E2E Tests**: End-to-end tests with real LLM integration
- **Manual Tests**: Full system test script for validation
- **Unit Tests**: Jest-based unit tests (coming soon)

## Prerequisites

You need an API key from either:
- Anthropic (Claude): Get one at https://console.anthropic.com/
- OpenAI (GPT): Get one at https://platform.openai.com/

## End-to-End Tests

### Setup

1. Set your API key:
```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
# or
export OPENAI_API_KEY="your-openai-key"
```

2. Install dependencies:
```bash
npm install
```

### Running E2E Tests

```bash
npm run test:e2e
```

This runs the test suite in `tests/e2e/agent-execution.test.ts` with Jest.

### Test Coverage

The E2E tests validate:
- ✓ Agent creation
- ✓ Basic agent execution
- ✓ Tool usage (calculator, current_time, echo)
- ✓ Multiple tool coordination
- ✓ Memory storage and retrieval
- ✓ Memory consolidation
- ✓ Error handling
- ✓ Health checks

### Test Timeouts

LLM calls can take time, so tests have extended timeouts:
- Basic tests: 30 seconds
- Multi-tool tests: 45 seconds
- Default Jest timeout: 60 seconds

## Manual Testing

### Full System Test

Run the comprehensive manual test script:

```bash
npm run test:manual
```

This executes `tests/manual/full-system-test.ts` and tests:

1. **Basic Agent Execution**
   - Create agent
   - Execute simple task

2. **Tool Usage**
   - Calculator tool
   - Current time tool
   - Echo tool

3. **Memory System**
   - Memory storage during execution
   - Memory consolidation
   - Memory statistics

4. **Workflows**
   - Create workflow
   - Execute workflow

5. **Health Check**
   - System health status

### Test Output

The manual test provides colorful, detailed output:

```
🚀 Emissary Full System Test

━━━ Initialization ━━━
✓ Emissary initialized

━━━ Test 1: Basic Agent Execution ━━━
✓ Create agent
  Agent ID: agent-abc...
✓ Execute simple task
  Response: System working correctly
  Iterations: 1

━━━ Test Summary ━━━
Passed: 12
Failed: 0
Total: 12

✨ Test run complete!
```

### Customizing Tests

Edit `tests/manual/full-system-test.ts` to enable/disable test sections:

```typescript
const TESTS = {
  basicExecution: true,
  toolUsage: true,
  memory: true,
  workflows: true,
  healthCheck: true,
};
```

## Testing Individual Features

### Test Agent Execution

```typescript
import { Emissary } from './src/index.js';

const emissary = new Emissary({
  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
  },
});

const agent = await emissary.createAgent(
  'Test Agent',
  'A test agent',
  []
);

const result = await emissary.executeAgent(
  agent.id,
  'Say hello',
  { maxIterations: 2 }
);

console.log(result.unwrap().output);
```

### Test Tool Usage

```typescript
const result = await emissary.executeAgent(
  agent.id,
  'Calculate 42 + 58 using the calculator tool',
  { maxIterations: 5, tools: ['calculator'] }
);

console.log('Success:', result.unwrap().success);
console.log('Output:', result.unwrap().output);
```

### Test Memory

```typescript
// Execute multiple tasks
await emissary.executeAgent(agent.id, 'Task 1', { tools: ['calculator'] });
await emissary.executeAgent(agent.id, 'Task 2', { tools: ['calculator'] });

// Check memory stats
const stats = await emissary.getMemoryStats();
console.log('Total memories:', stats.unwrap().totalEntries);

// Consolidate
const consolidated = await emissary.consolidateMemory();
console.log('Consolidated:', consolidated.unwrap());
```

### Test Workflows

```typescript
const workflow = await emissary.createWorkflow(
  'Test Workflow',
  'A test workflow',
  [
    {
      name: 'Step 1',
      type: StepType.Fixed,
      config: { function: 'echo' },
    },
    {
      name: 'Step 2',
      type: StepType.Agent,
      config: {
        agentId: agent.id.toString(),
        taskDescription: 'Process the input',
        maxIterations: 5,
      },
    },
  ]
);

const result = await emissary.runWorkflow(
  workflow.id,
  { data: 'test' }
);

console.log('Status:', result.unwrap().status);
```

## Continuous Integration

### GitHub Actions (Example)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run type check
        run: npm run typecheck

      - name: Run E2E tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run test:e2e
```

## Troubleshooting

### Tests Timeout

**Problem**: Tests fail with timeout errors

**Solutions**:
- Increase timeout in test file: `test('...', async () => { ... }, 60000);`
- Check network connection
- Verify API key is valid
- Check LLM provider status

### API Rate Limits

**Problem**: Tests fail due to rate limiting

**Solutions**:
- Add delays between tests
- Reduce number of tests
- Use different API key tiers

### Memory Issues

**Problem**: Out of memory errors

**Solutions**:
- Clear memory between tests
- Reduce consolidation threshold
- Enable pruning

### Agent Not Responding

**Problem**: Agent doesn't complete tasks

**Solutions**:
- Increase `maxIterations`
- Check tool availability
- Review task description clarity
- Enable debug logging

## Best Practices

### 1. Clean State

Start each test with a clean state:

```typescript
beforeEach(async () => {
  await emissary.clearMemory();
});
```

### 2. Descriptive Tasks

Use clear, specific task descriptions:

```typescript
// Good
'Calculate 15 + 27 using the calculator tool'

// Bad
'Do some math'
```

### 3. Appropriate Timeouts

Set realistic timeouts based on task complexity:

```typescript
// Simple task: 30 seconds
test('simple task', async () => { ... }, 30000);

// Complex task: 60 seconds
test('complex task', async () => { ... }, 60000);
```

### 4. Error Handling

Always check result status:

```typescript
const result = await emissary.executeAgent(...);

if (result.isErr()) {
  console.error('Error:', result.unwrap());
  return;
}

const response = result.unwrap();
```

### 5. Cleanup

Clean up resources after tests:

```typescript
afterAll(async () => {
  await emissary.cleanup();
});
```

## Performance Testing

### Measure Execution Time

```typescript
const start = Date.now();

const result = await emissary.executeAgent(...);

const duration = Date.now() - start;
console.log(`Execution took ${duration}ms`);
```

### Monitor Memory Usage

```typescript
const before = await emissary.getMemoryStats();

// Run tests...

const after = await emissary.getMemoryStats();
console.log('Memory growth:', after.totalEntries - before.totalEntries);
```

## Test Data

### Sample Tasks

```typescript
const tasks = [
  'Calculate 15 + 27 using the calculator tool',
  'What is the current time? Use the current_time tool',
  'Echo the message "Hello World" using the echo tool',
  'Parse this JSON: {"name": "test"}',
  'Convert "HELLO" to lowercase using string_manipulation',
];
```

### Sample Workflows

```typescript
const workflows = [
  {
    name: 'Simple Pipeline',
    steps: [
      { name: 'Echo', type: StepType.Fixed, config: { function: 'echo' } },
      { name: 'Calculate', type: StepType.Agent, config: { ... } },
    ],
  },
];
```

## Debugging Tests

### Enable Debug Logging

```typescript
const emissary = new Emissary({
  llm: { ... },
  logging: {
    level: LogLevel.DEBUG, // Set to DEBUG for verbose output
  },
});
```

### Inspect Iterations

```typescript
const result = await emissary.executeAgent(...);

if (result.isOk()) {
  const response = result.unwrap();

  response.iterations.forEach((iter, i) => {
    console.log(`\nIteration ${i + 1}:`);
    console.log('  Action:', iter.action);
    console.log('  Observation:', iter.observation);
  });
}
```

### Check Health Before Tests

```typescript
beforeAll(async () => {
  const health = await emissary.healthCheck();

  if (!health.healthy) {
    throw new Error('System is not healthy');
  }
});
```

## Next Steps

- Run the tests: `npm run test:manual`
- Add custom tests for your use cases
- Integrate with CI/CD pipeline
- Monitor test performance over time
