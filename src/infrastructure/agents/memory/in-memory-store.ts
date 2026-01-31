/**
 * In-memory memory store - for short-term memory
 */

import {
  MemoryEntry,
  MemoryType,
  MemoryQuery,
  MemoryStats,
  MemoryImportance,
  MemoryMetadata,
} from '@domain/entities/memory.js';
import { MemoryStore } from '@application/ports/output/memory.port.js';
import { JsonValue } from '@shared/types/index.js';
import { Result, ok, err } from '@shared/types/result.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * In-memory memory store implementation
 */
export class InMemoryMemoryStore implements MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private nextId = 1;

  constructor(private readonly logger: Logger) {}

  /**
   * Store a memory entry
   */
  async store(
    type: MemoryType,
    content: JsonValue,
    importance: MemoryImportance = MemoryImportance.Medium,
    tags: string[] = []
  ): Promise<Result<MemoryEntry, Error>> {
    try {
      const id = `mem-${this.nextId++}`;
      const now = new Date();

      const metadata: MemoryMetadata = {
        createdAt: now,
        accessedAt: now,
        accessCount: 0,
        importance,
        tags,
      };

      const entry = new MemoryEntry(id, type, content, metadata);
      this.memories.set(id, entry);

      this.logger.debug(`Stored memory ${id} (type: ${type}, importance: ${importance})`);

      return ok(entry);
    } catch (error) {
      this.logger.error('Failed to store memory', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Retrieve a specific memory by ID
   */
  async retrieve(id: string): Promise<Result<MemoryEntry | null, Error>> {
    try {
      const entry = this.memories.get(id);

      if (entry) {
        entry.recordAccess();
        this.logger.debug(`Retrieved memory ${id}`);
      }

      return ok(entry ?? null);
    } catch (error) {
      this.logger.error(`Failed to retrieve memory ${id}`, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Query memories based on criteria
   */
  async query(query: MemoryQuery): Promise<Result<MemoryEntry[], Error>> {
    try {
      let results = Array.from(this.memories.values());

      // Filter by type
      if (query.type) {
        results = results.filter((entry) => entry.type === query.type);
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        results = results.filter((entry) =>
          query.tags!.some((tag) => entry.metadata.tags?.includes(tag))
        );
      }

      // Filter by minimum importance
      if (query.minImportance) {
        results = results.filter((entry) => entry.metadata.importance >= query.minImportance!);
      }

      // Filter by age
      if (query.maxAge) {
        const now = new Date().getTime();
        results = results.filter((entry) => {
          const age = now - entry.metadata.createdAt.getTime();
          return age <= query.maxAge!;
        });
      }

      // Filter by search text (simple substring match)
      if (query.searchText) {
        const searchLower = query.searchText.toLowerCase();
        results = results.filter((entry) => {
          const contentStr = JSON.stringify(entry.content).toLowerCase();
          return contentStr.includes(searchLower);
        });
      }

      // Sort by access time (most recent first)
      results.sort((a, b) => b.metadata.accessedAt.getTime() - a.metadata.accessedAt.getTime());

      // Apply limit
      if (query.limit && query.limit > 0) {
        results = results.slice(0, query.limit);
      }

      // Update access counts
      results.forEach((entry) => entry.recordAccess());

      this.logger.debug(`Query returned ${results.length} memories`);

      return ok(results);
    } catch (error) {
      this.logger.error('Failed to query memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<Result<boolean, Error>> {
    try {
      const deleted = this.memories.delete(id);
      this.logger.debug(`Deleted memory ${id}: ${deleted}`);
      return ok(deleted);
    } catch (error) {
      this.logger.error(`Failed to delete memory ${id}`, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all memories of a specific type
   */
  async clear(type?: MemoryType): Promise<Result<number, Error>> {
    try {
      let count = 0;

      if (type) {
        // Clear specific type
        for (const [id, entry] of this.memories.entries()) {
          if (entry.type === type) {
            this.memories.delete(id);
            count++;
          }
        }
      } else {
        // Clear all
        count = this.memories.size;
        this.memories.clear();
      }

      this.logger.info(`Cleared ${count} memories${type ? ` of type ${type}` : ''}`);

      return ok(count);
    } catch (error) {
      this.logger.error('Failed to clear memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<Result<MemoryStats, Error>> {
    try {
      const entries = Array.from(this.memories.values());

      const byType: Record<MemoryType, number> = {
        [MemoryType.ShortTerm]: 0,
        [MemoryType.LongTerm]: 0,
        [MemoryType.Episodic]: 0,
        [MemoryType.Semantic]: 0,
      };

      const byImportance: Record<MemoryImportance, number> = {
        [MemoryImportance.Low]: 0,
        [MemoryImportance.Medium]: 0,
        [MemoryImportance.High]: 0,
        [MemoryImportance.Critical]: 0,
      };

      let totalAccessCount = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      for (const entry of entries) {
        byType[entry.type]++;
        byImportance[entry.metadata.importance]++;
        totalAccessCount += entry.metadata.accessCount;

        if (!oldestEntry || entry.metadata.createdAt < oldestEntry) {
          oldestEntry = entry.metadata.createdAt;
        }

        if (!newestEntry || entry.metadata.createdAt > newestEntry) {
          newestEntry = entry.metadata.createdAt;
        }
      }

      const stats: MemoryStats = {
        totalEntries: entries.length,
        byType,
        byImportance,
        oldestEntry,
        newestEntry,
        averageAccessCount: entries.length > 0 ? totalAccessCount / entries.length : 0,
      };

      return ok(stats);
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Consolidate memories (no-op for in-memory store)
   */
  async consolidate(): Promise<Result<number, Error>> {
    // For in-memory store, consolidation is handled by the memory manager
    return ok(0);
  }

  /**
   * Prune old or unimportant memories
   */
  async prune(
    maxAge?: number,
    minImportance: MemoryImportance = MemoryImportance.Low
  ): Promise<Result<number, Error>> {
    try {
      let count = 0;
      const now = new Date().getTime();

      for (const [id, entry] of this.memories.entries()) {
        let shouldPrune = false;

        // Check age
        if (maxAge) {
          const age = now - entry.metadata.createdAt.getTime();
          if (age > maxAge && entry.metadata.importance < minImportance) {
            shouldPrune = true;
          }
        } else if (entry.metadata.importance < minImportance) {
          shouldPrune = true;
        }

        if (shouldPrune) {
          this.memories.delete(id);
          count++;
        }
      }

      this.logger.info(`Pruned ${count} memories`);

      return ok(count);
    } catch (error) {
      this.logger.error('Failed to prune memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all memories (for testing/debugging)
   */
  getAll(): MemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Get memory count
   */
  size(): number {
    return this.memories.size;
  }
}
