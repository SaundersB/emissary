/**
 * Agent-specific errors
 */

import { DomainError } from './domain-error.js';

export class AgentError extends DomainError {
  constructor(message: string, code: string = 'AGENT_ERROR', details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'AgentError';
  }
}

export class AgentExecutionError extends AgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AGENT_EXECUTION_ERROR', details);
    this.name = 'AgentExecutionError';
  }
}

export class AgentTimeoutError extends AgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AGENT_TIMEOUT', details);
    this.name = 'AgentTimeoutError';
  }
}

export class AgentMaxIterationsError extends AgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AGENT_MAX_ITERATIONS', details);
    this.name = 'AgentMaxIterationsError';
  }
}

export class CapabilityMissingError extends AgentError {
  constructor(capability: string, details?: Record<string, unknown>) {
    super(`Agent is missing required capability: ${capability}`, 'CAPABILITY_MISSING', {
      ...details,
      capability,
    });
    this.name = 'CapabilityMissingError';
  }
}
