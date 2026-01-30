/**
 * Basic Emissary Example
 * Demonstrates creating an agent and executing a simple task
 */

import { Emissary, Capability } from '../src/index.js';

async function main() {
  // Initialize Emissary with Anthropic provider
  // Note: Set ANTHROPIC_API_KEY environment variable
  const emissary = new Emissary({
    llm: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
      },
      defaultProvider: 'anthropic',
    },
  });

  console.log('🚀 Emissary initialized\n');

  // Check health
  const health = await emissary.healthCheck();
  console.log('📊 Health check:', JSON.stringify(health, null, 2), '\n');

  // List available tools
  const tools = emissary.listTools();
  console.log(`🔧 Available tools: ${tools.map((t) => t.name).join(', ')}\n`);

  // Create a math agent
  const mathAgent = await emissary.createAgent(
    'Math Assistant',
    'An agent that helps with mathematical calculations',
    [Capability.Custom]
  );

  console.log(`🤖 Created agent: ${mathAgent.name} (${mathAgent.id.toString()})\n`);

  // Execute the agent with a task
  console.log('📝 Executing task: Calculate (15 * 4) + (100 / 5)\n');

  const result = await emissary.executeAgent(
    mathAgent.id,
    'Calculate (15 * 4) + (100 / 5). Use the calculator tool and show your work.',
    {
      maxIterations: 5,
      tools: ['calculator'],
    }
  );

  if (result.isOk()) {
    const response = result.unwrap();
    console.log('✅ Task completed!\n');
    console.log('Result:', response.output, '\n');
    console.log('Iterations:', response.iterations.length);
    console.log('Duration:', response.metadata.duration, 'ms\n');

    // Show iteration details
    console.log('📋 Execution trace:');
    for (const iteration of response.iterations) {
      console.log(`\n--- Iteration ${iteration.number} ---`);
      console.log('Thought:', iteration.thought.substring(0, 100) + '...');
      console.log('Action:', iteration.action);
      console.log('Observation:', iteration.observation.substring(0, 100));
    }
  } else {
    console.error('❌ Task failed:', result.unwrap());
  }

  console.log('\n🎉 Example completed!');
}

// Run the example
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
