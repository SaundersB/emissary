/**
 * Application-wide constants
 */

export const APP_NAME = 'emissary';
export const APP_VERSION = '0.1.0';

/**
 * Default configuration values
 */
export const DEFAULTS = {
  MAX_ITERATIONS: 10,
  TIMEOUT_MS: 300000, // 5 minutes
  MAX_TOKEN_LENGTH: 100000,
  MEMORY_TTL_MS: 3600000, // 1 hour
  PLUGIN_LOAD_TIMEOUT_MS: 30000, // 30 seconds
  WORKFLOW_STEP_TIMEOUT_MS: 60000, // 1 minute
} as const;

/**
 * Plugin constants
 */
export const PLUGIN = {
  MANIFEST_FILENAME: 'plugin.json',
  DEFAULT_TRUST_LEVEL: 'sandboxed',
  SUPPORTED_TYPES: ['tool', 'agent', 'workflow', 'llm-provider', 'storage', 'integration'] as const,
  SUPPORTED_TRUST_LEVELS: ['trusted', 'sandboxed', 'isolated'] as const,
} as const;

/**
 * LLM Provider constants
 */
export const LLM = {
  DEFAULT_PROVIDER: 'anthropic',
  DEFAULT_MODEL: {
    openai: 'gpt-4-turbo-preview',
    anthropic: 'claude-3-5-sonnet-20241022',
  },
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
} as const;

/**
 * Agent constants
 */
export const AGENT = {
  DEFAULT_MAX_ITERATIONS: 5,
  DEFAULT_TIMEOUT_MS: 300000,
  THOUGHT_PREFIX: 'Thought:',
  ACTION_PREFIX: 'Action:',
  OBSERVATION_PREFIX: 'Observation:',
} as const;

/**
 * Workflow constants
 */
export const WORKFLOW = {
  MAX_PARALLEL_STEPS: 10,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Domain errors (1000-1999)
  INVALID_ENTITY: 'ERR_1000',
  INVALID_VALUE_OBJECT: 'ERR_1001',
  BUSINESS_RULE_VIOLATION: 'ERR_1002',

  // Application errors (2000-2999)
  USE_CASE_FAILED: 'ERR_2000',
  VALIDATION_FAILED: 'ERR_2001',
  UNAUTHORIZED: 'ERR_2002',
  FORBIDDEN: 'ERR_2003',
  NOT_FOUND: 'ERR_2004',

  // Infrastructure errors (3000-3999)
  LLM_PROVIDER_ERROR: 'ERR_3000',
  PLUGIN_LOAD_ERROR: 'ERR_3001',
  PLUGIN_EXECUTION_ERROR: 'ERR_3002',
  AGENT_EXECUTION_ERROR: 'ERR_3003',
  WORKFLOW_EXECUTION_ERROR: 'ERR_3004',
  PERSISTENCE_ERROR: 'ERR_3005',

  // System errors (4000-4999)
  INTERNAL_ERROR: 'ERR_4000',
  TIMEOUT: 'ERR_4001',
  RESOURCE_EXHAUSTED: 'ERR_4002',
} as const;

/**
 * Event types
 */
export const EVENT_TYPES = {
  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_STARTED: 'agent.started',
  AGENT_COMPLETED: 'agent.completed',
  AGENT_FAILED: 'agent.failed',
  AGENT_ITERATION: 'agent.iteration',

  // Workflow events
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_STEP_STARTED: 'workflow.step.started',
  WORKFLOW_STEP_COMPLETED: 'workflow.step.completed',
  WORKFLOW_STEP_FAILED: 'workflow.step.failed',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',

  // Plugin events
  PLUGIN_LOADED: 'plugin.loaded',
  PLUGIN_UNLOADED: 'plugin.unloaded',
  PLUGIN_ERROR: 'plugin.error',

  // Tool events
  TOOL_REGISTERED: 'tool.registered',
  TOOL_EXECUTED: 'tool.executed',
  TOOL_FAILED: 'tool.failed',

  // LLM events
  LLM_REQUEST: 'llm.request',
  LLM_RESPONSE: 'llm.response',
  LLM_ERROR: 'llm.error',
} as const;
