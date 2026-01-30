/**
 * In-memory Agent Repository implementation
 */

import { AgentRepository, AgentCriteria } from '@application/ports/output/agent-repository.port.js';
import { Agent } from '@domain/entities/agent.js';
import { AgentId } from '@domain/value-objects/index.js';

/**
 * In-memory Agent Repository
 */
export class InMemoryAgentRepository implements AgentRepository {
  private agents: Map<string, Agent> = new Map();

  async save(agent: Agent): Promise<void> {
    this.agents.set(agent.id.toString(), agent);
  }

  async findById(id: AgentId): Promise<Agent | null> {
    return this.agents.get(id.toString()) ?? null;
  }

  async find(criteria: AgentCriteria): Promise<Agent[]> {
    const all = Array.from(this.agents.values());

    return all.filter((agent) => {
      if (criteria.name && !agent.name.includes(criteria.name)) {
        return false;
      }

      if (criteria.capabilities) {
        const hasAllCapabilities = criteria.capabilities.every((cap) =>
          agent.getCapabilities().includes(cap as never)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      if (criteria.tags) {
        const agentTags = (agent.getMetadata().tags as string[]) ?? [];
        const hasAllTags = criteria.tags.every((tag) => agentTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });
  }

  async findAll(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async delete(id: AgentId): Promise<void> {
    this.agents.delete(id.toString());
  }

  async exists(id: AgentId): Promise<boolean> {
    return this.agents.has(id.toString());
  }
}
