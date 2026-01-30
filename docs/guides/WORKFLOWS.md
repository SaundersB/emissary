# Workflow Guide

## Introduction

Emissary's workflow engine allows you to orchestrate complex multi-step processes that combine fixed logic with autonomous agent steps. Workflows provide structured task execution while leveraging the power of AI agents when needed.

## Core Concepts

### Workflow

A workflow is a sequence of steps executed in order. Each workflow has:
- **ID**: Unique identifier
- **Name**: Human-readable name
- **Description**: What the workflow does
- **Steps**: Ordered list of steps to execute
- **Context**: Shared data available to all steps

### Step Types

Emissary supports several step types:

#### 1. Fixed Steps
Execute predefined logic without AI reasoning.

```typescript
{
  name: 'Process Input',
  type: StepType.Fixed,
  config: {
    function: 'echo'  // or 'transform', 'merge'
  }
}
```

**Available Functions**:
- `echo`: Pass through the input
- `transform`: Apply transformation (uppercase, lowercase, reverse)
- `merge`: Merge results from previous steps

#### 2. Agent Steps
Execute an autonomous agent to reason and use tools.

```typescript
{
  name: 'Analyze Data',
  type: StepType.Agent,
  config: {
    agentId: 'agent-123',
    taskDescription: 'Analyze the data and summarize findings',
    tools: ['calculator', 'web_search'],
    maxIterations: 5,
    timeout: 300000
  }
}
```

#### 3. Conditional Steps
Execute different steps based on conditions (simplified implementation).

```typescript
{
  name: 'Check Condition',
  type: StepType.Conditional,
  config: {
    condition: 'stepInput == "valid"',
    thenOutput: 'Condition met',
    elseOutput: 'Condition not met'
  }
}
```

#### 4. Parallel Steps
Execute multiple steps concurrently (simplified implementation).

```typescript
{
  name: 'Parallel Processing',
  type: StepType.Parallel,
  config: {
    steps: [/* array of steps */]
  }
}
```

## Creating Workflows

### Basic Example

```typescript
import { Emissary, StepType } from 'emissary';

const emissary = new Emissary({ /* config */ });

// Create a simple workflow
const workflow = await emissary.createWorkflow(
  'Data Pipeline',
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
        agentId: myAgent.id.toString(),
        taskDescription: 'Analyze the loaded data',
        maxIterations: 3
      }
    },
    {
      name: 'Format Output',
      type: StepType.Fixed,
      config: {
        function: 'transform',
        transformation: 'uppercase'
      }
    }
  ]
);
```

### Hybrid Workflow

Combine multiple step types for complex orchestration:

```typescript
const workflow = await emissary.createWorkflow(
  'Research Workflow',
  'Research a topic and generate a report',
  [
    // Step 1: Get initial data
    {
      name: 'Gather Data',
      type: StepType.Fixed,
      config: { function: 'echo' }
    },

    // Step 2: Research using agent
    {
      name: 'Research',
      type: StepType.Agent,
      config: {
        agentId: researchAgent.id.toString(),
        taskDescription: 'Research the topic using available tools',
        tools: ['web_search', 'summarize'],
        maxIterations: 10
      }
    },

    // Step 3: Validate results
    {
      name: 'Validate',
      type: StepType.Conditional,
      config: {
        condition: 'stepInput != null',
        thenOutput: 'Valid',
        elseOutput: 'Invalid'
      }
    },

    // Step 4: Format final output
    {
      name: 'Format Report',
      type: StepType.Fixed,
      config: {
        function: 'merge'
      }
    }
  ]
);
```

## Running Workflows

### Execute a Workflow

```typescript
const result = await emissary.runWorkflow(
  workflow.id,
  {
    topic: 'quantum computing',
    depth: 'detailed'
  },
  {
    outputFormat: 'markdown'
  }
);

if (result.isOk()) {
  const response = result.unwrap();
  console.log('Status:', response.status);
  console.log('Output:', response.output);
  console.log('Steps executed:', response.steps.length);
}
```

### Monitor Execution

```typescript
// Get execution status
const status = await emissary.getWorkflowStatus(executionId);

if (status.isOk()) {
  const info = status.unwrap();
  console.log('Current step:', info.currentStep);
  console.log('Progress:', info.progress);
}
```

### Control Execution

```typescript
// Pause workflow
await emissary.controlWorkflow(executionId, 'pause');

// Resume workflow
await emissary.controlWorkflow(executionId, 'resume');

// Cancel workflow
await emissary.controlWorkflow(executionId, 'cancel');
```

## Workflow Context

Workflows maintain a shared context that steps can read from and write to:

```typescript
// Run workflow with initial context
const result = await emissary.runWorkflow(
  workflow.id,
  { initialData: 'value' },
  {
    environment: 'production',
    userId: 'user-123'
  }
);
```

Each step can access:
- `workflowContext`: Shared workflow context
- `stepInput`: Input for this specific step
- `previousResults`: Results from all previous steps

## Step Results

Each step produces a result with:
- `stepId`: Step identifier
- `status`: completed, failed, or skipped
- `output`: Step output data
- `error`: Error message if failed
- `startedAt`: When step started
- `completedAt`: When step completed
- `duration`: Execution duration in ms

## Error Handling

Workflows handle errors gracefully:

```typescript
const result = await emissary.runWorkflow(workflow.id, input);

if (result.isErr()) {
  const error = result.unwrap();
  console.error('Workflow failed:', error.message);
}

if (result.isOk()) {
  const response = result.unwrap();

  if (response.status === 'failed') {
    console.error('Workflow execution failed');

    // Check which step failed
    const failedStep = response.steps.find(s => s.status === 'failed');
    if (failedStep) {
      console.error(`Step "${failedStep.stepId}" failed:`, failedStep.error);
    }
  }
}
```

## Best Practices

### 1. Design Clear Step Boundaries
Each step should have a single, well-defined purpose.

### 2. Use Appropriate Step Types
- Use **Fixed steps** for deterministic operations
- Use **Agent steps** when reasoning or tool use is needed
- Use **Conditional steps** for branching logic
- Use **Parallel steps** for concurrent operations (when implemented)

### 3. Handle Failures Gracefully
Always check step results and handle errors appropriately.

### 4. Provide Clear Task Descriptions
For agent steps, provide specific, actionable task descriptions.

### 5. Set Reasonable Limits
Configure appropriate timeouts and iteration limits for agent steps.

### 6. Monitor Long-Running Workflows
Use status checking for workflows that take significant time.

## Advanced Patterns

### Sequential Processing

```typescript
const workflow = await emissary.createWorkflow(
  'Sequential Pipeline',
  'Process data through multiple stages',
  [
    { name: 'Stage 1', type: StepType.Fixed, config: { function: 'echo' } },
    { name: 'Stage 2', type: StepType.Agent, config: { /* agent config */ } },
    { name: 'Stage 3', type: StepType.Fixed, config: { function: 'transform' } }
  ]
);
```

### Agent Collaboration

Multiple agent steps can work together in a workflow:

```typescript
const workflow = await emissary.createWorkflow(
  'Multi-Agent Analysis',
  'Collaborate on complex analysis',
  [
    {
      name: 'Research',
      type: StepType.Agent,
      config: {
        agentId: researchAgent.id.toString(),
        taskDescription: 'Research the topic'
      }
    },
    {
      name: 'Analyze',
      type: StepType.Agent,
      config: {
        agentId: analysisAgent.id.toString(),
        taskDescription: 'Analyze the research findings'
      }
    },
    {
      name: 'Summarize',
      type: StepType.Agent,
      config: {
        agentId: summaryAgent.id.toString(),
        taskDescription: 'Create executive summary'
      }
    }
  ]
);
```

## Limitations

### Current Implementation

- **Conditional steps**: Simplified implementation, limited condition evaluation
- **Parallel steps**: Simplified placeholder implementation
- **State persistence**: In-memory only, lost on restart
- **Nested workflows**: Not yet supported

### Future Enhancements

- Complex condition evaluation with safe expression parser
- Full parallel execution support
- Persistent workflow state
- Workflow templates and reusability
- Loop steps for iteration
- Workflow versioning

## Examples

See `examples/workflow-example.ts` for a complete working example.

## API Reference

### EmissaryMethods

```typescript
// Create workflow
createWorkflow(
  name: string,
  description: string,
  steps: WorkflowStepConfig[]
): Promise<Workflow>

// Run workflow
runWorkflow(
  workflowId: WorkflowId | string,
  input: Record<string, JsonValue>,
  context?: Record<string, JsonValue>
): Promise<Result<RunWorkflowResponse, Error>>

// Get status
getWorkflowStatus(
  executionId: ExecutionId | string
): Promise<Result<WorkflowExecutionInfo, Error>>

// Control workflow
controlWorkflow(
  executionId: ExecutionId | string,
  action: 'pause' | 'resume' | 'cancel'
): Promise<Result<ControlWorkflowResponse, Error>>

// List workflows
listWorkflows(): Promise<Workflow[]>

// Get workflow
getWorkflow(
  workflowId: WorkflowId | string
): Promise<Workflow | null>
```
