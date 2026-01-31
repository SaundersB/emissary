/**
 * Emissary - Agentic framework with clean architecture
 * Main entry point
 */

import { Logger, LogLevel } from './shared/utils/logger.js';
import { JsonValue } from './shared/types/index.js';
import { LLMProviderRegistryImpl } from './infrastructure/llm/registry.js';
import { AnthropicProvider } from './infrastructure/llm/providers/anthropic.provider.js';
import { OpenAIProvider } from './infrastructure/llm/providers/openai.provider.js';
import { ToolRegistryImpl } from './infrastructure/agents/tools/tool-registry.js';
import { getBuiltInTools } from './infrastructure/agents/tools/built-in-tools.js';
import { PluginRegistryImpl } from './infrastructure/plugins/registry.js';
import { TrustedPluginRuntime } from './infrastructure/plugins/runtime/trusted-runtime.js';
import { FilePluginLoader } from './infrastructure/plugins/loader/file-loader.js';
import { InMemoryAgentRepository } from './infrastructure/persistence/repositories/in-memory-agent.repository.js';
import { InMemoryWorkflowRepository } from './infrastructure/persistence/repositories/in-memory-workflow.repository.js';
import { ExecuteAgentUseCaseImpl } from './application/use-cases/execute-agent.use-case.js';
import { LoadPluginUseCaseImpl } from './application/use-cases/load-plugin.use-case.js';
import { RunWorkflowUseCaseImpl } from './application/use-cases/run-workflow.use-case.js';
import { WorkflowEngineImpl } from './infrastructure/workflows/engine/workflow-engine.js';
import { Agent, Capability } from './domain/entities/agent.js';
import { Workflow, StepType } from './domain/entities/workflow.js';
import { AgentId, WorkflowId, StepId, ExecutionId } from './domain/value-objects/index.js';
import { MemoryManager, InMemoryMemoryStore, FileMemoryStore } from './infrastructure/agents/memory/index.js';
import * as path from 'path';
import * as os from 'os';

// Re-export public API
export * from './domain/index.js';
export * from './application/ports/index.js';
export type { Plugin, PluginContext } from './infrastructure/plugins/types.js';
export { ExecutionId } from './domain/value-objects/index.js';

/**
 * Emissary configuration
 */
export interface EmissaryConfig {
  llm?: {
    anthropic?: {
      apiKey: string;
      defaultModel?: string;
    };
    openai?: {
      apiKey: string;
      organization?: string;
      defaultModel?: string;
    };
    defaultProvider?: 'anthropic' | 'openai';
  };
  memory?: {
    enabled?: boolean;
    storageDir?: string;
    consolidationThreshold?: number;
    pruneInterval?: number;
  };
  logging?: {
    level?: LogLevel;
  };
}

/**
 * Main Emissary class
 */
export class Emissary {
  private logger: Logger;
  private llmRegistry: LLMProviderRegistryImpl;
  private toolRegistry: ToolRegistryImpl;
  private pluginRegistry: PluginRegistryImpl;
  private pluginRuntime: TrustedPluginRuntime;
  private pluginLoader: FilePluginLoader;
  private agentRepository: InMemoryAgentRepository;
  private workflowRepository: InMemoryWorkflowRepository;
  private workflowEngine: WorkflowEngineImpl;
  private memoryManager?: MemoryManager;
  private executeAgentUseCase: ExecuteAgentUseCaseImpl;
  private loadPluginUseCase: LoadPluginUseCaseImpl;
  private runWorkflowUseCase: RunWorkflowUseCaseImpl;

  constructor(config: EmissaryConfig = {}) {
    // Initialize logger
    this.logger = new Logger({
      level: config.logging?.level ?? LogLevel.INFO,
      prefix: 'emissary',
    });

    this.logger.info('Initializing Emissary...');

    // Initialize LLM registry
    this.llmRegistry = new LLMProviderRegistryImpl(this.logger.child('llm'));

    // Register LLM providers
    if (config.llm?.anthropic) {
      const anthropicProvider = new AnthropicProvider(
        config.llm.anthropic,
        this.logger.child('anthropic')
      );
      this.llmRegistry.register('anthropic', anthropicProvider);
    }

    if (config.llm?.openai) {
      const openaiProvider = new OpenAIProvider(
        config.llm.openai,
        this.logger.child('openai')
      );
      this.llmRegistry.register('openai', openaiProvider);
    }

    // Set default provider if specified
    if (config.llm?.defaultProvider) {
      this.llmRegistry.setDefault(config.llm.defaultProvider);
    }

    // Initialize tool registry
    this.toolRegistry = new ToolRegistryImpl(this.logger.child('tools'));

    // Register built-in tools
    const builtInTools = getBuiltInTools();
    for (const tool of builtInTools) {
      this.toolRegistry.register(tool);
    }

    // Initialize plugin system
    this.pluginRegistry = new PluginRegistryImpl(this.logger.child('plugins'));
    this.pluginRuntime = new TrustedPluginRuntime(
      this.toolRegistry,
      this.logger.child('plugin-runtime')
    );
    this.pluginLoader = new FilePluginLoader(
      this.pluginRuntime,
      this.logger.child('plugin-loader')
    );

    // Initialize repositories
    this.agentRepository = new InMemoryAgentRepository();
    this.workflowRepository = new InMemoryWorkflowRepository();

    // Initialize memory system if enabled
    if (config.memory?.enabled !== false) {
      const storageDir = config.memory?.storageDir ?? path.join(os.homedir(), '.emissary', 'memory');

      const shortTermStore = new InMemoryMemoryStore(this.logger.child('memory-short-term'));
      const longTermStore = new FileMemoryStore(
        { storageDir },
        this.logger.child('memory-long-term')
      );

      this.memoryManager = new MemoryManager(
        {
          shortTermStore,
          longTermStore,
          consolidationThreshold: config.memory?.consolidationThreshold,
          pruneInterval: config.memory?.pruneInterval,
        },
        this.logger.child('memory-manager')
      );

      this.logger.info(`Memory system enabled (storage: ${storageDir})`);
    }

    // Initialize use cases
    this.executeAgentUseCase = new ExecuteAgentUseCaseImpl(
      this.agentRepository,
      this.llmRegistry.getDefault(),
      this.toolRegistry,
      this.logger.child('execute-agent'),
      this.memoryManager
    );

    this.loadPluginUseCase = new LoadPluginUseCaseImpl(
      this.pluginRegistry,
      this.pluginLoader,
      this.logger.child('load-plugin')
    );

    // Initialize workflow engine
    this.workflowEngine = new WorkflowEngineImpl(
      this.workflowRepository,
      this.executeAgentUseCase,
      this.logger.child('workflow-engine')
    );

    this.runWorkflowUseCase = new RunWorkflowUseCaseImpl(
      this.workflowRepository,
      this.workflowEngine,
      this.logger.child('run-workflow')
    );

    this.logger.info('Emissary initialized successfully');
  }

  /**
   * Create and register a new agent
   */
  async createAgent(
    name: string,
    description: string,
    capabilities: Capability[] = []
  ): Promise<Agent> {
    const agent = new Agent(
      AgentId.create(),
      name,
      description,
      capabilities
    );

    await this.agentRepository.save(agent);
    this.logger.info(`Agent created: ${name} (${agent.id.toString()})`);

    return agent;
  }

  /**
   * Execute an agent
   */
  async executeAgent(
    agentId: AgentId | string,
    taskDescription: string,
    options?: {
      maxIterations?: number;
      timeout?: number;
      tools?: string[];
    }
  ) {
    const id = typeof agentId === 'string' ? AgentId.from(agentId) : agentId;

    const result = await this.executeAgentUseCase.execute({
      agentId: id,
      taskDescription,
      options,
    });

    return result;
  }

  /**
   * Load a plugin
   */
  async loadPlugin(pluginPath: string, force = false) {
    const result = await this.loadPluginUseCase.load({ pluginPath, force });
    return result;
  }

  /**
   * List all plugins
   */
  async listPlugins() {
    const result = await this.loadPluginUseCase.list();
    return result;
  }

  /**
   * List all agents
   */
  async listAgents() {
    return await this.agentRepository.findAll();
  }

  /**
   * Get an agent by ID
   */
  async getAgent(agentId: AgentId | string) {
    const id = typeof agentId === 'string' ? AgentId.from(agentId) : agentId;
    return await this.agentRepository.findById(id);
  }

  /**
   * List all available tools
   */
  listTools() {
    return this.toolRegistry.list();
  }

  /**
   * Create and register a new workflow
   */
  async createWorkflow(
    name: string,
    description: string,
    steps: Array<{
      name: string;
      type: StepType;
      config?: Record<string, JsonValue>;
    }> = []
  ): Promise<Workflow> {
    const workflowSteps = steps.map((step) => ({
      id: StepId.create(),
      name: step.name,
      type: step.type,
      config: step.config,
    }));

    const workflow = new Workflow(
      WorkflowId.create(),
      name,
      description,
      workflowSteps
    );

    await this.workflowRepository.save(workflow);
    this.logger.info(`Workflow created: ${name} (${workflow.id.toString()})`);

    return workflow;
  }

  /**
   * Run a workflow
   */
  async runWorkflow(
    workflowId: WorkflowId | string,
    input: Record<string, JsonValue> = {},
    context?: Record<string, JsonValue>
  ) {
    const id = typeof workflowId === 'string' ? WorkflowId.from(workflowId) : workflowId;

    const result = await this.runWorkflowUseCase.run({
      workflowId: id,
      input,
      context,
    });

    return result;
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(executionId: ExecutionId | string) {
    const id = typeof executionId === 'string' ? ExecutionId.from(executionId) : executionId;
    const result = await this.runWorkflowUseCase.getStatus(id);
    return result;
  }

  /**
   * Control workflow execution (pause, resume, cancel)
   */
  async controlWorkflow(
    executionId: ExecutionId | string,
    action: 'pause' | 'resume' | 'cancel'
  ) {
    const id = typeof executionId === 'string' ? ExecutionId.from(executionId) : executionId;
    const result = await this.runWorkflowUseCase.control({
      executionId: id,
      action,
    });
    return result;
  }

  /**
   * List all workflows
   */
  async listWorkflows() {
    return await this.workflowRepository.findAll();
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(workflowId: WorkflowId | string) {
    const id = typeof workflowId === 'string' ? WorkflowId.from(workflowId) : workflowId;
    return await this.workflowRepository.findById(id);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    if (!this.memoryManager) {
      throw new Error('Memory system is not enabled');
    }
    return await this.memoryManager.getStats();
  }

  /**
   * Clear all memories or memories of a specific type
   */
  async clearMemory(type?: import('@domain/entities/memory.js').MemoryType) {
    if (!this.memoryManager) {
      throw new Error('Memory system is not enabled');
    }
    return await this.memoryManager.clear(type);
  }

  /**
   * Consolidate memories (move important short-term to long-term)
   */
  async consolidateMemory() {
    if (!this.memoryManager) {
      throw new Error('Memory system is not enabled');
    }
    return await this.memoryManager.consolidate();
  }

  /**
   * Prune old or unimportant memories
   */
  async pruneMemory(maxAge?: number, minImportance?: import('@domain/entities/memory.js').MemoryImportance) {
    if (!this.memoryManager) {
      throw new Error('Memory system is not enabled');
    }
    return await this.memoryManager.prune(maxAge, minImportance);
  }

  /**
   * Get health status
   */
  async healthCheck() {
    const providers = this.llmRegistry.list();
    const providerHealth: Record<string, boolean> = {};

    for (const providerName of providers) {
      const provider = this.llmRegistry.get(providerName);
      if (provider) {
        providerHealth[providerName] = await provider.healthCheck();
      }
    }

    // Get memory stats if enabled
    let memoryStats;
    if (this.memoryManager) {
      const stats = await this.memoryManager.getStats();
      if (stats.isOk()) {
        memoryStats = stats.unwrap();
      }
    }

    return {
      healthy: Object.values(providerHealth).every((h) => h),
      providers: providerHealth,
      tools: this.toolRegistry.list().length,
      agents: (await this.agentRepository.findAll()).length,
      workflows: (await this.workflowRepository.findAll()).length,
      memory: memoryStats,
    };
  }

  /**
   * Cleanup resources on shutdown
   */
  async cleanup() {
    this.logger.info('Cleaning up Emissary resources...');

    if (this.memoryManager) {
      await this.memoryManager.cleanup();
    }

    this.logger.info('Emissary cleanup complete');
  }
}

// Default export
export default Emissary;
