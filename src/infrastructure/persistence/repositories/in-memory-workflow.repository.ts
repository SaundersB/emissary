/**
 * In-memory Workflow Repository implementation
 */

import {
  WorkflowRepository,
  WorkflowCriteria,
} from '@application/ports/output/workflow-repository.port.js';
import { Workflow } from '@domain/entities/workflow.js';
import { WorkflowId } from '@domain/value-objects/index.js';

/**
 * In-memory Workflow Repository
 */
export class InMemoryWorkflowRepository implements WorkflowRepository {
  private workflows: Map<string, Workflow> = new Map();

  async save(workflow: Workflow): Promise<void> {
    this.workflows.set(workflow.id.toString(), workflow);
  }

  async findById(id: WorkflowId): Promise<Workflow | null> {
    return this.workflows.get(id.toString()) ?? null;
  }

  async find(criteria: WorkflowCriteria): Promise<Workflow[]> {
    const all = Array.from(this.workflows.values());

    return all.filter((workflow) => {
      if (criteria.name && !workflow.name.includes(criteria.name)) {
        return false;
      }

      if (criteria.status && workflow.getStatus() !== criteria.status) {
        return false;
      }

      if (criteria.tags) {
        const workflowTags = (workflow.getMetadata().tags as string[]) ?? [];
        const hasAllTags = criteria.tags.every((tag) => workflowTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });
  }

  async findAll(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async delete(id: WorkflowId): Promise<void> {
    this.workflows.delete(id.toString());
  }

  async exists(id: WorkflowId): Promise<boolean> {
    return this.workflows.has(id.toString());
  }
}
