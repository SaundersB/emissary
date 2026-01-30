/**
 * Workflow Example
 * Demonstrates creating and executing workflows with agent steps
 */

import { Emissary, Capability, StepType } from '../src/index.js';

async function main() {
  // Initialize Emissary
  const emissary = new Emissary({
    llm: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
      },
      defaultProvider: 'anthropic',
    },
  });

  console.log('🚀 Emissary initialized\n');

  // Create a math agent for workflow steps
  const mathAgent = await emissary.createAgent(
    'Math Agent',
    'An agent that performs calculations',
    [Capability.Custom]
  );

  console.log(`🤖 Created agent: ${mathAgent.name} (${mathAgent.id.toString()})\n`);

  // Create a hybrid workflow combining fixed steps and agent steps
  const workflow = await emissary.createWorkflow(
    'Data Processing Workflow',
    'A workflow that processes data through multiple steps',
    [
      {
        name: 'Input Processing',
        type: StepType.Fixed,
        config: {
          function: 'echo',
        },
      },
      {
        name: 'Mathematical Analysis',
        type: StepType.Agent,
        config: {
          agentId: mathAgent.id.toString(),
          taskDescription:
            'Calculate the sum of 100 and 200, then multiply the result by 3. Use the calculator tool.',
          tools: ['calculator'],
          maxIterations: 5,
        },
      },
      {
        name: 'Transform Result',
        type: StepType.Fixed,
        config: {
          function: 'transform',
          transformation: 'uppercase',
        },
      },
    ]
  );

  console.log(`📋 Created workflow: ${workflow.name} (${workflow.id.toString()})\n`);
  console.log(`Steps: ${workflow.getSteps().length}\n`);

  // Run the workflow
  console.log('▶️  Starting workflow execution...\n');

  const result = await emissary.runWorkflow(workflow.id, {
    data: 'Initial input data',
    timestamp: Date.now(),
  });

  if (result.isOk()) {
    const response = result.unwrap();

    console.log('✅ Workflow completed!\n');
    console.log('Status:', response.status);
    console.log('Output:', JSON.stringify(response.output, null, 2));
    console.log('\nExecution Details:');
    console.log('- Duration:', response.metadata.duration, 'ms');
    console.log('- Steps executed:', response.steps.length);

    console.log('\n📊 Step Results:');
    for (const step of response.steps) {
      console.log(`\n  ${step.stepId.toString()}`);
      console.log(`  Status: ${step.status}`);
      console.log(`  Output: ${JSON.stringify(step.output)?.substring(0, 100)}`);
      if (step.error) {
        console.log(`  Error: ${step.error}`);
      }
    }
  } else {
    console.error('❌ Workflow failed:', result.unwrap());
  }

  // Demonstrate workflow control
  console.log('\n\n🔄 Testing workflow control...\n');

  const workflow2 = await emissary.createWorkflow(
    'Long Running Workflow',
    'A workflow to test pause/resume',
    [
      {
        name: 'Step 1',
        type: StepType.Fixed,
        config: { function: 'echo' },
      },
      {
        name: 'Step 2',
        type: StepType.Fixed,
        config: { function: 'echo' },
      },
      {
        name: 'Step 3',
        type: StepType.Fixed,
        config: { function: 'echo' },
      },
    ]
  );

  // Run workflow (non-blocking in real usage)
  const execution = await emissary.runWorkflow(workflow2.id, { test: 'data' });

  if (execution.isOk()) {
    const execResponse = execution.unwrap();
    console.log(`✅ Workflow executed: ${execResponse.executionId.toString()}`);
  }

  console.log('\n🎉 Workflow examples completed!');
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
