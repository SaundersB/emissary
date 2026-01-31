#!/usr/bin/env node
/**
 * Full System Manual Test
 * Comprehensive test of all Emissary features with real LLM
 *
 * Usage:
 *   export ANTHROPIC_API_KEY="your-key"
 *   npm run cli tests/manual/full-system-test.ts
 */

import { Emissary, Capability, StepType, MemoryType } from '../../src/index.js';
import chalk from 'chalk';

// Test configuration
const TESTS = {
  basicExecution: true,
  toolUsage: true,
  memory: true,
  workflows: true,
  healthCheck: true,
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: [] as string[],
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warn: chalk.yellow('⚠'),
  };

  console.log(`${prefix[type]} ${message}`);
}

function section(title: string) {
  console.log('\n' + chalk.bold.cyan(`━━━ ${title} ━━━`));
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<boolean> {
  try {
    await testFn();
    log(name, 'success');
    results.passed++;
    return true;
  } catch (error) {
    log(`${name}: ${error instanceof Error ? error.message : String(error)}`, 'error');
    results.failed++;
    results.errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log(chalk.bold('\n🚀 Emissary Full System Test\n'));

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    log('No API key found. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY', 'error');
    process.exit(1);
  }

  const provider = process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai';
  log(`Using ${provider.toUpperCase()} provider`, 'info');

  // Initialize Emissary
  section('Initialization');

  const config: any = {
    memory: {
      enabled: true,
      consolidationThreshold: 5,
    },
    logging: {
      level: 'info',
    },
  };

  if (process.env.ANTHROPIC_API_KEY) {
    config.llm = {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      defaultProvider: 'anthropic',
    };
  } else {
    config.llm = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      defaultProvider: 'openai',
    };
  }

  const emissary = new Emissary(config);
  log('Emissary initialized', 'success');

  // Test 1: Basic Agent Execution
  if (TESTS.basicExecution) {
    section('Test 1: Basic Agent Execution');

    await runTest('Create agent', async () => {
      const agent = await emissary.createAgent(
        'Test Assistant',
        'A helpful test agent',
        [Capability.Custom]
      );

      if (!agent || !agent.id) {
        throw new Error('Failed to create agent');
      }

      log(`  Agent ID: ${agent.id.toString()}`, 'info');
    });

    await runTest('Execute simple task', async () => {
      const agents = await emissary.listAgents();
      const agent = agents[0];

      if (!agent) {
        throw new Error('No agent found');
      }

      const result = await emissary.executeAgent(
        agent.id,
        'Please respond with the text "System working correctly"',
        { maxIterations: 2 }
      );

      if (result.isErr()) {
        throw new Error('Execution failed: ' + result.unwrap());
      }

      const response = result.unwrap();

      if (!response.success) {
        throw new Error('Agent execution unsuccessful');
      }

      log(`  Response: ${response.output}`, 'info');
      log(`  Iterations: ${response.iterations.length}`, 'info');
    });
  }

  // Test 2: Tool Usage
  if (TESTS.toolUsage) {
    section('Test 2: Tool Usage');

    await runTest('Calculator tool', async () => {
      const agent = await emissary.createAgent(
        'Math Agent',
        'Performs calculations',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'Calculate 42 + 58 using the calculator tool',
        { maxIterations: 5, tools: ['calculator'] }
      );

      if (result.isErr()) {
        throw new Error('Execution failed');
      }

      const response = result.unwrap();

      const usedCalculator = response.iterations.some(
        (iter) => iter.action === 'calculator'
      );

      if (!usedCalculator) {
        throw new Error('Calculator tool was not used');
      }

      log(`  Result: ${response.output}`, 'info');
    });

    await runTest('Current time tool', async () => {
      const agent = await emissary.createAgent(
        'Time Agent',
        'Gets current time',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'What is the current date and time? Use the current_time tool',
        { maxIterations: 5, tools: ['current_time'] }
      );

      if (result.isErr()) {
        throw new Error('Execution failed');
      }

      const response = result.unwrap();

      const usedTimeTool = response.iterations.some(
        (iter) => iter.action === 'current_time'
      );

      if (!usedTimeTool) {
        throw new Error('current_time tool was not used');
      }

      log(`  Time info: ${response.output}`, 'info');
    });

    await runTest('Echo tool', async () => {
      const agent = await emissary.createAgent(
        'Echo Agent',
        'Echoes messages',
        []
      );

      const testMessage = 'Hello from Emissary!';

      const result = await emissary.executeAgent(
        agent.id,
        `Use the echo tool to echo this exact message: "${testMessage}"`,
        { maxIterations: 5, tools: ['echo'] }
      );

      if (result.isErr()) {
        throw new Error('Execution failed');
      }

      const response = result.unwrap();

      const usedEcho = response.iterations.some(
        (iter) => iter.action === 'echo'
      );

      if (!usedEcho) {
        throw new Error('echo tool was not used');
      }

      log(`  Echoed: ${response.output}`, 'info');
    });
  }

  // Test 3: Memory System
  if (TESTS.memory) {
    section('Test 3: Memory System');

    await runTest('Memory storage during execution', async () => {
      const agent = await emissary.createAgent(
        'Memory Test Agent',
        'Tests memory features',
        []
      );

      // Execute multiple tasks to build up memory
      await emissary.executeAgent(
        agent.id,
        'Calculate 10 + 15 using the calculator',
        { maxIterations: 5, tools: ['calculator'] }
      );

      await emissary.executeAgent(
        agent.id,
        'Calculate 20 * 3 using the calculator',
        { maxIterations: 5, tools: ['calculator'] }
      );

      const stats = await emissary.getMemoryStats();

      if (stats.isErr()) {
        throw new Error('Failed to get memory stats');
      }

      const memStats = stats.unwrap();

      if (memStats.totalEntries === 0) {
        throw new Error('No memories were stored');
      }

      log(`  Total memories: ${memStats.totalEntries}`, 'info');
      log(`  By type: ${JSON.stringify(memStats.byType)}`, 'info');
      log(`  By importance: ${JSON.stringify(memStats.byImportance)}`, 'info');
    });

    await runTest('Memory consolidation', async () => {
      const result = await emissary.consolidateMemory();

      if (result.isErr()) {
        throw new Error('Consolidation failed');
      }

      const count = result.unwrap();
      log(`  Consolidated: ${count} memories`, 'info');
    });

    await runTest('Memory statistics', async () => {
      const stats = await emissary.getMemoryStats();

      if (stats.isErr()) {
        throw new Error('Failed to get stats');
      }

      const memStats = stats.unwrap();
      log(`  Total: ${memStats.totalEntries}`, 'info');
      log(`  Avg access: ${memStats.averageAccessCount.toFixed(2)}`, 'info');
    });
  }

  // Test 4: Workflows
  if (TESTS.workflows) {
    section('Test 4: Workflows');

    await runTest('Create workflow', async () => {
      const agent = await emissary.createAgent(
        'Workflow Agent',
        'Agent for workflows',
        []
      );

      const workflow = await emissary.createWorkflow(
        'Test Workflow',
        'A test workflow with multiple steps',
        [
          {
            name: 'Echo Input',
            type: StepType.Fixed,
            config: { function: 'echo' },
          },
          {
            name: 'Calculate',
            type: StepType.Agent,
            config: {
              agentId: agent.id.toString(),
              taskDescription: 'Calculate 7 * 8 using the calculator tool',
              tools: ['calculator'],
              maxIterations: 5,
            },
          },
        ]
      );

      if (!workflow || !workflow.id) {
        throw new Error('Failed to create workflow');
      }

      log(`  Workflow ID: ${workflow.id.toString()}`, 'info');
      log(`  Steps: ${workflow.steps.length}`, 'info');
    });

    await runTest('Execute workflow', async () => {
      const workflows = await emissary.listWorkflows();
      const workflow = workflows[0];

      if (!workflow) {
        throw new Error('No workflow found');
      }

      const result = await emissary.runWorkflow(
        workflow.id,
        { data: 'test input' }
      );

      if (result.isErr()) {
        throw new Error('Workflow execution failed');
      }

      const response = result.unwrap();

      if (response.status !== 'completed') {
        throw new Error(`Workflow status: ${response.status}`);
      }

      log(`  Status: ${response.status}`, 'info');
      log(`  Steps executed: ${response.steps.length}`, 'info');
    });
  }

  // Test 5: Health Check
  if (TESTS.healthCheck) {
    section('Test 5: Health Check');

    await runTest('System health', async () => {
      const health = await emissary.healthCheck();

      if (!health.healthy) {
        throw new Error('System is not healthy');
      }

      log(`  Healthy: ${health.healthy}`, 'info');
      log(`  Providers: ${JSON.stringify(health.providers)}`, 'info');
      log(`  Tools: ${health.tools}`, 'info');
      log(`  Agents: ${health.agents}`, 'info');
      log(`  Workflows: ${health.workflows}`, 'info');

      if (health.memory) {
        log(`  Memory entries: ${health.memory.totalEntries}`, 'info');
      }
    });
  }

  // Cleanup
  section('Cleanup');
  await emissary.cleanup();
  log('Cleanup complete', 'success');

  // Summary
  section('Test Summary');
  console.log(`${chalk.green('Passed:')} ${results.passed}`);
  console.log(`${chalk.red('Failed:')} ${results.failed}`);
  console.log(`${chalk.bold('Total:')} ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\n' + chalk.red.bold('Failed Tests:'));
    results.errors.forEach((error) => {
      console.log(chalk.red(`  • ${error}`));
    });
  }

  console.log('\n' + chalk.bold.green('✨ Test run complete!\n'));

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error(chalk.red.bold('\n💥 Test run failed:'), error);
  process.exit(1);
});
