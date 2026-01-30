/**
 * Workflow Repository port - interface for workflow persistence
 */

import { Workflow, WorkflowStatus } from '@domain/entities/workflow.js';
import { WorkflowId } from '@domain/value-objects/index.js';

/**
 * Workflow search criteria
 */
export interface WorkflowCriteria {
  name?: string;
  status?: WorkflowStatus;
  tags?: string[];
}

/**
 * Workflow Repository interface
 */
export interface WorkflowRepository {
  /**
   * Save a workflow
   */
  save(workflow: Workflow): Promise<void>;

  /**
   * Find a workflow by ID
   */
  findById(id: WorkflowId): Promise<Workflow | null>;

  /**
   * Find workflows matching criteria
   */
  find(criteria: WorkflowCriteria): Promise<Workflow[]>;

  /**
   * Find all workflows
   */
  findAll(): Promise<Workflow[]>;

  /**
   * Delete a workflow
   */
  delete(id: WorkflowId): Promise<void>;

  /**
   * Check if a workflow exists
   */
  exists(id: WorkflowId): Promise<boolean>;
}
