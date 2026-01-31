/**
 * Unit tests for Emissary main class
 * Uses mocks instead of real API calls
 */

import { Emissary, Capability, StepType } from '../../src/index';
import { LogLevel } from '../../src/shared/utils/logger';

// Mock the LLM providers
jest.mock('../../src/infrastructure/llm/providers/anthropic.provider', () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    healthCheck: jest.fn().mockResolvedValue(true),
    chat: jest.fn().mockResolvedValue({
      content: 'Mocked response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
  })),
}));

jest.mock('../../src/infrastructure/llm/providers/openai.provider', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    healthCheck: jest.fn().mockResolvedValue(true),
    chat: jest.fn().mockResolvedValue({
      content: 'Mocked response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
  })),
}));

describe('Emissary Unit Tests', () => {
  let emissary: Emissary;

  beforeEach(() => {
    // Initialize with mock config
    emissary = new Emissary({
      llm: {
        anthropic: {
          apiKey: 'test-key-123',
          defaultModel: 'claude-3-5-sonnet-20241022',
        },
        defaultProvider: 'anthropic',
      },
      memory: {
        enabled: true,
      },
    });
  });

  afterEach(async () => {
    if (emissary) {
      await emissary.cleanup();
    }
  });

  describe('Agent Management', () => {
    test('should create an agent with name and description', async () => {
      const agent = await emissary.createAgent(
        'Test Agent',
        'An agent for testing',
        [Capability.Custom]
      );

      expect(agent).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('An agent for testing');
      expect(agent.getCapabilities()).toContain(Capability.Custom);
    });

    test('should list all agents', async () => {
      await emissary.createAgent('Agent 1', 'First agent', []);
      await emissary.createAgent('Agent 2', 'Second agent', []);

      const agents = await emissary.listAgents();

      expect(agents).toHaveLength(2);
      expect(agents[0]?.name).toBe('Agent 1');
      expect(agents[1]?.name).toBe('Agent 2');
    });

    test('should get an agent by ID', async () => {
      const agent = await emissary.createAgent('Test Agent', 'Description', []);

      const retrieved = await emissary.getAgent(agent.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });

    test('should get an agent by string ID', async () => {
      const agent = await emissary.createAgent('Test Agent', 'Description', []);

      const retrieved = await emissary.getAgent(agent.id.toString());

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });
  });

  describe('Tool Registry', () => {
    test('should list built-in tools', () => {
      const tools = emissary.listTools();

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'calculator')).toBe(true);
      expect(tools.some(t => t.name === 'current_time')).toBe(true);
    });
  });

  describe('Workflow Management', () => {
    test('should create a workflow', async () => {
      const workflow = await emissary.createWorkflow(
        'Test Workflow',
        'A test workflow',
        []
      );

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.description).toBe('A test workflow');
    });

    test('should create a workflow with steps', async () => {
      const workflow = await emissary.createWorkflow(
        'Multi-Step Workflow',
        'A workflow with steps',
        [
          { name: 'Step 1', type: StepType.Agent },
          { name: 'Step 2', type: StepType.Agent },
        ]
      );

      expect(workflow).toBeDefined();
      expect(workflow.getSteps()).toHaveLength(2);
      expect(workflow.getSteps()[0]?.name).toBe('Step 1');
      expect(workflow.getSteps()[1]?.name).toBe('Step 2');
    });

    test('should list all workflows', async () => {
      await emissary.createWorkflow('Workflow 1', 'First workflow', []);
      await emissary.createWorkflow('Workflow 2', 'Second workflow', []);

      const workflows = await emissary.listWorkflows();

      expect(workflows).toHaveLength(2);
      expect(workflows[0]?.name).toBe('Workflow 1');
      expect(workflows[1]?.name).toBe('Workflow 2');
    });

    test('should get a workflow by ID', async () => {
      const workflow = await emissary.createWorkflow('Test Workflow', 'Description', []);

      const retrieved = await emissary.getWorkflow(workflow.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Workflow');
    });
  });

  describe('Memory System', () => {
    test('should get memory stats', async () => {
      const stats = await emissary.getMemoryStats();

      expect(stats.isOk()).toBe(true);
      if (stats.isOk()) {
        const memStats = stats.unwrap();
        expect(memStats).toHaveProperty('totalEntries');
        expect(memStats).toHaveProperty('shortTermCount');
        expect(memStats).toHaveProperty('longTermCount');
      }
    });

    test('should consolidate memories', async () => {
      const result = await emissary.consolidateMemory();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const count = result.unwrap();
        expect(typeof count).toBe('number');
      }
    });

    test('should clear memories', async () => {
      const result = await emissary.clearMemory();

      expect(result.isOk()).toBe(true);
    });

    test('should throw error when accessing memory if disabled', async () => {
      const emissaryNoMemory = new Emissary({
        llm: {
          anthropic: {
            apiKey: 'test-key',
          },
        },
        memory: {
          enabled: false,
        },
      });

      await expect(emissaryNoMemory.getMemoryStats()).rejects.toThrow(
        'Memory system is not enabled'
      );

      await emissaryNoMemory.cleanup();
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await emissary.healthCheck();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('providers');
      expect(health).toHaveProperty('tools');
      expect(health).toHaveProperty('agents');
      expect(health).toHaveProperty('workflows');
      expect(health.healthy).toBe(true);
      expect(health.tools).toBeGreaterThan(0);
    });

    test('should include memory stats in health check when enabled', async () => {
      const health = await emissary.healthCheck();

      expect(health.memory).toBeDefined();
      expect(health.memory).toHaveProperty('totalEntries');
    });
  });

  describe('Initialization', () => {
    test('should initialize with OpenAI provider', () => {
      const openaiEmissary = new Emissary({
        llm: {
          openai: {
            apiKey: 'test-openai-key',
          },
          defaultProvider: 'openai',
        },
      });

      expect(openaiEmissary).toBeDefined();
    });

    test('should initialize with custom logging level', () => {
      const debugEmissary = new Emissary({
        logging: {
          level: LogLevel.DEBUG,
        },
      });

      expect(debugEmissary).toBeDefined();
    });

    test('should initialize with custom memory settings', () => {
      const customMemoryEmissary = new Emissary({
        memory: {
          enabled: true,
          consolidationThreshold: 100,
          pruneInterval: 3600000,
        },
      });

      expect(customMemoryEmissary).toBeDefined();
    });
  });
});
