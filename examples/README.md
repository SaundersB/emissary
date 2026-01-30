## Emissary Examples

This directory contains examples demonstrating how to use the Emissary framework.

### Running Examples

1. Set up your API key:
```bash
export ANTHROPIC_API_KEY="your-key-here"
# or
export OPENAI_API_KEY="your-key-here"
```

2. Install dependencies:
```bash
npm install
```

3. Run an example:
```bash
npm run dev examples/basic-example.ts
```

### Available Examples

#### basic-example.ts
Demonstrates:
- Initializing Emissary with an LLM provider
- Creating an agent
- Executing a task with tool use
- Viewing execution results and iteration traces

### Creating Your Own Agent

```typescript
import { Emissary, Capability } from 'emissary';

const emissary = new Emissary({
  llm: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
  },
});

// Create an agent
const agent = await emissary.createAgent(
  'My Agent',
  'Description of what this agent does',
  [Capability.Custom]
);

// Execute a task
const result = await emissary.executeAgent(
  agent.id,
  'Your task description here',
  { maxIterations: 10 }
);

if (result.isOk()) {
  console.log('Success:', result.unwrap().output);
} else {
  console.error('Error:', result.unwrap());
}
```
