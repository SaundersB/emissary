/**
 * Agent Repository port - interface for agent persistence
 */

import { Agent } from '@domain/entities/agent.js';
import { AgentId } from '@domain/value-objects/index.js';

/**
 * Agent search criteria
 */
export interface AgentCriteria {
  name?: string;
  capabilities?: string[];
  tags?: string[];
}

/**
 * Agent Repository interface
 */
export interface AgentRepository {
  /**
   * Save an agent
   */
  save(agent: Agent): Promise<void>;

  /**
   * Find an agent by ID
   */
  findById(id: AgentId): Promise<Agent | null>;

  /**
   * Find agents matching criteria
   */
  find(criteria: AgentCriteria): Promise<Agent[]>;

  /**
   * Find all agents
   */
  findAll(): Promise<Agent[]>;

  /**
   * Delete an agent
   */
  delete(id: AgentId): Promise<void>;

  /**
   * Check if an agent exists
   */
  exists(id: AgentId): Promise<boolean>;
}
