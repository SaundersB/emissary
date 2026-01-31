/**
 * Memory System Example
 * Demonstrates using short-term and long-term memory with agents
 */

import { Emissary, Capability } from '../src/index.js';

async function main() {
  // Initialize Emissary with memory enabled
  const emissary = new Emissary({
    llm: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY!,
      },
    },
    memory: {
      enabled: true,
      consolidationThreshold: 5, // Consolidate after 5 short-term memories
      pruneInterval: 60000, // Auto-prune every minute
    },
  });

  console.log('=== Memory System Example ===\n');

  // Create an agent
  const agent = await emissary.createAgent(
    'Math Assistant',
    'An agent that helps with mathematical calculations',
    [Capability.Custom]
  );

  console.log(`Agent created: ${agent.name}\n`);

  // Execute several tasks to build up memory
  console.log('Executing tasks to build memory...\n');

  const tasks = [
    'Calculate 15 + 27 using the calculator tool',
    'Calculate 100 - 45 using the calculator tool',
    'Calculate 8 * 12 using the calculator tool',
    'What is 50 divided by 2? Use the calculator tool',
    'Calculate the square of 9 using the calculator tool',
  ];

  for (const task of tasks) {
    console.log(`Task: ${task}`);

    const result = await emissary.executeAgent(agent.id, task, {
      maxIterations: 3,
      tools: ['calculator'],
    });

    if (result.isOk()) {
      const response = result.unwrap();
      console.log(`Result: ${response.output}`);
      console.log(`Iterations: ${response.iterations.length}\n`);
    } else {
      console.error('Execution failed:', result.unwrap());
    }

    // Small delay between tasks
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check memory statistics
  console.log('=== Memory Statistics ===\n');
  const stats = await emissary.getMemoryStats();

  if (stats.isOk()) {
    const memStats = stats.unwrap();
    console.log('Total memories:', memStats.totalEntries);
    console.log('By type:', memStats.byType);
    console.log('By importance:', memStats.byImportance);
    console.log('Average access count:', memStats.averageAccessCount.toFixed(2));
    console.log('');
  }

  // Manually consolidate memories
  console.log('=== Consolidating Memories ===\n');
  const consolidateResult = await emissary.consolidateMemory();

  if (consolidateResult.isOk()) {
    const count = consolidateResult.unwrap();
    console.log(`Consolidated ${count} memories to long-term storage\n`);
  }

  // Check stats again
  const statsAfter = await emissary.getMemoryStats();

  if (statsAfter.isOk()) {
    const memStats = statsAfter.unwrap();
    console.log('After consolidation:');
    console.log('Total memories:', memStats.totalEntries);
    console.log('By type:', memStats.byType);
    console.log('');
  }

  // Execute a task that might benefit from past memory
  console.log('=== Testing Memory Recall ===\n');
  console.log('Task: Calculate 25 + 30 using the calculator tool');

  const finalResult = await emissary.executeAgent(
    agent.id,
    'Calculate 25 + 30 using the calculator tool',
    {
      maxIterations: 3,
      tools: ['calculator'],
    }
  );

  if (finalResult.isOk()) {
    const response = finalResult.unwrap();
    console.log(`Result: ${response.output}`);
    console.log(`Iterations: ${response.iterations.length}\n`);
  }

  // Show health check with memory info
  console.log('=== System Health ===\n');
  const health = await emissary.healthCheck();
  console.log('Healthy:', health.healthy);
  console.log('Tools:', health.tools);
  console.log('Agents:', health.agents);
  if (health.memory) {
    console.log('Memory entries:', health.memory.totalEntries);
  }
  console.log('');

  // Cleanup
  console.log('=== Cleanup ===\n');
  await emissary.cleanup();
  console.log('Example complete!');
}

// Run the example
main().catch(console.error);
