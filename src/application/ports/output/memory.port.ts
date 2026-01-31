/**
 * Memory port - interface for memory storage and retrieval
 */

import {
  MemoryEntry,
  MemoryType,
  MemoryQuery,
  MemoryStats,
  MemoryImportance,
} from '@domain/entities/memory.js';
import { JsonValue } from '@shared/types/index.js';
import { Result } from '@shared/types/result.js';

/**
 * Memory store interface - abstraction for memory persistence
 */
export interface MemoryStore {
  /**
   * Store a memory entry
   */
  store(
    type: MemoryType,
    content: JsonValue,
    importance?: MemoryImportance,
    tags?: string[]
  ): Promise<Result<MemoryEntry, Error>>;

  /**
   * Retrieve a specific memory by ID
   */
  retrieve(id: string): Promise<Result<MemoryEntry | null, Error>>;

  /**
   * Query memories based on criteria
   */
  query(query: MemoryQuery): Promise<Result<MemoryEntry[], Error>>;

  /**
   * Delete a memory entry
   */
  delete(id: string): Promise<Result<boolean, Error>>;

  /**
   * Clear all memories of a specific type
   */
  clear(type?: MemoryType): Promise<Result<number, Error>>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<Result<MemoryStats, Error>>;

  /**
   * Consolidate memories (e.g., move important short-term to long-term)
   */
  consolidate(): Promise<Result<number, Error>>;

  /**
   * Prune old or unimportant memories
   */
  prune(maxAge?: number, minImportance?: MemoryImportance): Promise<Result<number, Error>>;
}
