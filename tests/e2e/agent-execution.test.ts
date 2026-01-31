/**
 * End-to-End Agent Execution Tests
 * Tests agent execution with real LLM providers
 *
 * Usage:
 *   export ANTHROPIC_API_KEY="your-key"
 *   npm run test:e2e
 */

import { Emissary, Capability } from '../../src/index';

// Skip E2E tests if no API key is available
const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
const describeE2E = hasApiKey ? describe : describe.skip;

describeE2E('Agent Execution E2E Tests', () => {
  let emissary: Emissary;

  beforeAll(() => {
    // Initialize Emissary with available provider
    const config: any = { memory: { enabled: true } };

    if (process.env.ANTHROPIC_API_KEY) {
      config.llm = {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
        defaultProvider: 'anthropic',
      };
    } else if (process.env.OPENAI_API_KEY) {
      config.llm = {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
        },
        defaultProvider: 'openai',
      };
    }

    emissary = new Emissary(config);
  });

  afterAll(async () => {
    // Cleanup
    if (emissary) {
      await emissary.cleanup();
    }
  });

  describe('Basic Agent Execution', () => {
    test('should create an agent', async () => {
      const agent = await emissary.createAgent(
        'Test Agent',
        'An agent for testing',
        [Capability.Custom]
      );

      expect(agent).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('An agent for testing');
    });

    test('should execute agent with simple task', async () => {
      const agent = await emissary.createAgent(
        'Echo Agent',
        'Echoes back the input',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'Please respond with "Hello, World!"',
        { maxIterations: 2 }
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const response = result.unwrap();
        expect(response.success).toBe(true);
        expect(response.output).toBeDefined();
        expect(typeof response.output).toBe('string');
      }
    }, 30000); // 30 second timeout for LLM call
  });

  describe('Tool Usage', () => {
    test('should use calculator tool', async () => {
      const agent = await emissary.createAgent(
        'Math Agent',
        'Performs calculations',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'Calculate 15 + 27 using the calculator tool',
        { maxIterations: 5, tools: ['calculator'] }
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const response = result.unwrap();
        expect(response.success).toBe(true);
        expect(response.iterations.length).toBeGreaterThan(0);

        // Check that calculator was used
        const usedCalculator = response.iterations.some(
          (iter) => iter.action === 'calculator'
        );
        expect(usedCalculator).toBe(true);
      }
    }, 30000);

    test('should use current_time tool', async () => {
      const agent = await emissary.createAgent(
        'Time Agent',
        'Gets current time',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'What is the current time? Use the current_time tool',
        { maxIterations: 5, tools: ['current_time'] }
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const response = result.unwrap();
        expect(response.success).toBe(true);

        const usedTimeTool = response.iterations.some(
          (iter) => iter.action === 'current_time'
        );
        expect(usedTimeTool).toBe(true);
      }
    }, 30000);

    test('should use multiple tools', async () => {
      const agent = await emissary.createAgent(
        'Multi-Tool Agent',
        'Uses multiple tools',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'First get the current time, then calculate 10 + 20',
        {
          maxIterations: 10,
          tools: ['current_time', 'calculator'],
        }
      );

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const response = result.unwrap();
        expect(response.iterations.length).toBeGreaterThan(0);
      }
    }, 45000);
  });

  describe('Memory System', () => {
    test('should store and retrieve memories', async () => {
      const agent = await emissary.createAgent(
        'Memory Test Agent',
        'Tests memory',
        []
      );

      // Execute first task
      await emissary.executeAgent(
        agent.id,
        'Calculate 5 + 5 using the calculator',
        { maxIterations: 5, tools: ['calculator'] }
      );

      // Check memory was created
      const stats = await emissary.getMemoryStats();
      expect(stats.isOk()).toBe(true);

      if (stats.isOk()) {
        const memStats = stats.unwrap();
        expect(memStats.totalEntries).toBeGreaterThan(0);
      }
    }, 30000);

    test('should consolidate memories', async () => {
      const result = await emissary.consolidateMemory();
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const count = result.unwrap();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid agent ID', async () => {
      const result = await emissary.executeAgent(
        'invalid-agent-id',
        'Test task',
        { maxIterations: 1 }
      );

      expect(result.isErr()).toBe(true);
    });

    test('should handle max iterations', async () => {
      const agent = await emissary.createAgent(
        'Limited Agent',
        'Agent with iteration limit',
        []
      );

      const result = await emissary.executeAgent(
        agent.id,
        'Keep using the calculator tool repeatedly',
        { maxIterations: 1, tools: ['calculator'] }
      );

      // May succeed or fail depending on if it completes in 1 iteration
      expect(result.isOk()).toBe(true);
    }, 30000);
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const health = await emissary.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.tools).toBeGreaterThan(0);
      expect(health.agents).toBeGreaterThan(0);
      expect(health.memory).toBeDefined();
    });
  });
});
