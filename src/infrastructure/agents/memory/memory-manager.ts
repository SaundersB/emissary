/**
 * Memory Manager - orchestrates short-term and long-term memory
 */

import {
  MemoryEntry,
  MemoryType,
  MemoryQuery,
  MemoryStats,
  MemoryImportance,
} from '@domain/entities/memory.js';
import { MemoryStore } from '@application/ports/output/memory.port.js';
import { JsonValue } from '@shared/types/index.js';
import { Result, ok, err } from '@shared/types/result.js';
import { Logger } from '@shared/utils/logger.js';

/**
 * Memory manager configuration
 */
export interface MemoryManagerConfig {
  shortTermStore: MemoryStore;
  longTermStore: MemoryStore;
  consolidationThreshold?: number; // Number of short-term memories before consolidation
  consolidationImportance?: MemoryImportance; // Min importance to consolidate
  pruneInterval?: number; // Interval in ms to auto-prune
  shortTermMaxAge?: number; // Max age for short-term memories (ms)
}

/**
 * Memory Manager - manages both short-term and long-term memory
 */
export class MemoryManager implements MemoryStore {
  private readonly shortTermStore: MemoryStore;
  private readonly longTermStore: MemoryStore;
  private readonly consolidationThreshold: number;
  private readonly consolidationImportance: MemoryImportance;
  private readonly shortTermMaxAge: number;
  private pruneTimer?: NodeJS.Timeout;

  constructor(config: MemoryManagerConfig, private readonly logger: Logger) {
    this.shortTermStore = config.shortTermStore;
    this.longTermStore = config.longTermStore;
    this.consolidationThreshold = config.consolidationThreshold ?? 100;
    this.consolidationImportance = config.consolidationImportance ?? MemoryImportance.High;
    this.shortTermMaxAge = config.shortTermMaxAge ?? 24 * 60 * 60 * 1000; // 24 hours

    // Auto-prune if configured
    if (config.pruneInterval) {
      this.startAutoPrune(config.pruneInterval);
    }
  }

  /**
   * Start automatic pruning
   */
  private startAutoPrune(interval: number): void {
    this.pruneTimer = setInterval(async () => {
      await this.autoPrune();
    }, interval);
  }

  /**
   * Stop automatic pruning
   */
  stopAutoPrune(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
  }

  /**
   * Auto-prune old short-term memories
   */
  private async autoPrune(): Promise<void> {
    try {
      const result = await this.shortTermStore.prune(
        this.shortTermMaxAge,
        MemoryImportance.Medium
      );

      if (result.isOk()) {
        const count = result.unwrap();
        if (count > 0) {
          this.logger.info(`Auto-pruned ${count} short-term memories`);
        }
      }
    } catch (error) {
      this.logger.error('Auto-prune failed', error);
    }
  }

  /**
   * Store a memory entry
   * Automatically routes to short-term or long-term based on type
   */
  async store(
    type: MemoryType,
    content: JsonValue,
    importance: MemoryImportance = MemoryImportance.Medium,
    tags: string[] = []
  ): Promise<Result<MemoryEntry, Error>> {
    try {
      // Route to appropriate store
      const store =
        type === MemoryType.LongTerm || type === MemoryType.Semantic
          ? this.longTermStore
          : this.shortTermStore;

      const result = await store.store(type, content, importance, tags);

      if (result.isOk()) {
        // Check if we should consolidate
        await this.maybeConsolidate();
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to store memory', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Retrieve a specific memory by ID from both stores
   */
  async retrieve(id: string): Promise<Result<MemoryEntry | null, Error>> {
    // Try short-term first
    const shortTermResult = await this.shortTermStore.retrieve(id);

    if (shortTermResult.isOk()) {
      const entry = shortTermResult.unwrap();
      if (entry) {
        return ok(entry);
      }
    }

    // Try long-term
    return this.longTermStore.retrieve(id);
  }

  /**
   * Query memories from both stores
   */
  async query(query: MemoryQuery): Promise<Result<MemoryEntry[], Error>> {
    try {
      const results: MemoryEntry[] = [];

      // Determine which stores to query based on type
      const shouldQueryShortTerm = !query.type ||
        query.type === MemoryType.ShortTerm ||
        query.type === MemoryType.Episodic;

      const shouldQueryLongTerm = !query.type ||
        query.type === MemoryType.LongTerm ||
        query.type === MemoryType.Semantic;

      // Query short-term if type matches or no type specified
      if (shouldQueryShortTerm) {
        const shortTermQuery = { ...query };
        if (query.type === MemoryType.LongTerm || query.type === MemoryType.Semantic) {
          shortTermQuery.type = undefined;
        }

        const shortTermResult = await this.shortTermStore.query(shortTermQuery);

        if (shortTermResult.isOk()) {
          results.push(...shortTermResult.unwrap());
        }
      }

      // Query long-term if type matches or no type specified
      if (shouldQueryLongTerm) {
        const longTermQuery = { ...query };
        if (query.type === MemoryType.ShortTerm || query.type === MemoryType.Episodic) {
          longTermQuery.type = undefined;
        }

        const longTermResult = await this.longTermStore.query(longTermQuery);

        if (longTermResult.isOk()) {
          results.push(...longTermResult.unwrap());
        }
      }

      // Sort combined results by access time
      results.sort((a, b) => b.metadata.accessedAt.getTime() - a.metadata.accessedAt.getTime());

      // Apply limit across combined results
      if (query.limit && query.limit > 0 && results.length > query.limit) {
        results.splice(query.limit);
      }

      return ok(results);
    } catch (error) {
      this.logger.error('Failed to query memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a memory entry from both stores
   */
  async delete(id: string): Promise<Result<boolean, Error>> {
    const shortTermResult = await this.shortTermStore.delete(id);
    const longTermResult = await this.longTermStore.delete(id);

    // Return true if deleted from either store
    if (shortTermResult.isOk() && shortTermResult.unwrap()) {
      return ok(true);
    }

    return longTermResult;
  }

  /**
   * Clear all memories of a specific type
   */
  async clear(type?: MemoryType): Promise<Result<number, Error>> {
    try {
      let total = 0;

      // Clear short-term if type matches or no type specified
      if (!type || type === MemoryType.ShortTerm || type === MemoryType.Episodic) {
        const result = await this.shortTermStore.clear(type);
        if (result.isOk()) {
          total += result.unwrap();
        }
      }

      // Clear long-term if type matches or no type specified
      if (!type || type === MemoryType.LongTerm || type === MemoryType.Semantic) {
        const result = await this.longTermStore.clear(type);
        if (result.isOk()) {
          total += result.unwrap();
        }
      }

      return ok(total);
    } catch (error) {
      this.logger.error('Failed to clear memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get combined memory statistics
   */
  async getStats(): Promise<Result<MemoryStats, Error>> {
    try {
      const shortTermResult = await this.shortTermStore.getStats();
      const longTermResult = await this.longTermStore.getStats();

      if (shortTermResult.isErr() || longTermResult.isErr()) {
        return err(new Error('Failed to get stats from one or both stores'));
      }

      const shortTermStats = shortTermResult.unwrap();
      const longTermStats = longTermResult.unwrap();

      // Calculate total entries first
      const totalEntries = shortTermStats.totalEntries + longTermStats.totalEntries;

      // Combine stats
      const stats: MemoryStats = {
        totalEntries,
        byType: {
          [MemoryType.ShortTerm]:
            shortTermStats.byType[MemoryType.ShortTerm] +
            longTermStats.byType[MemoryType.ShortTerm],
          [MemoryType.LongTerm]:
            shortTermStats.byType[MemoryType.LongTerm] +
            longTermStats.byType[MemoryType.LongTerm],
          [MemoryType.Episodic]:
            shortTermStats.byType[MemoryType.Episodic] +
            longTermStats.byType[MemoryType.Episodic],
          [MemoryType.Semantic]:
            shortTermStats.byType[MemoryType.Semantic] +
            longTermStats.byType[MemoryType.Semantic],
        },
        byImportance: {
          [MemoryImportance.Low]:
            shortTermStats.byImportance[MemoryImportance.Low] +
            longTermStats.byImportance[MemoryImportance.Low],
          [MemoryImportance.Medium]:
            shortTermStats.byImportance[MemoryImportance.Medium] +
            longTermStats.byImportance[MemoryImportance.Medium],
          [MemoryImportance.High]:
            shortTermStats.byImportance[MemoryImportance.High] +
            longTermStats.byImportance[MemoryImportance.High],
          [MemoryImportance.Critical]:
            shortTermStats.byImportance[MemoryImportance.Critical] +
            longTermStats.byImportance[MemoryImportance.Critical],
        },
        oldestEntry:
          shortTermStats.oldestEntry && longTermStats.oldestEntry
            ? new Date(
                Math.min(shortTermStats.oldestEntry.getTime(), longTermStats.oldestEntry.getTime())
              )
            : shortTermStats.oldestEntry ?? longTermStats.oldestEntry,
        newestEntry:
          shortTermStats.newestEntry && longTermStats.newestEntry
            ? new Date(
                Math.max(shortTermStats.newestEntry.getTime(), longTermStats.newestEntry.getTime())
              )
            : shortTermStats.newestEntry ?? longTermStats.newestEntry,
        averageAccessCount:
          totalEntries > 0
            ? (shortTermStats.averageAccessCount * shortTermStats.totalEntries +
                longTermStats.averageAccessCount * longTermStats.totalEntries) /
              totalEntries
            : 0,
      };

      return ok(stats);
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Consolidate memories - move important short-term memories to long-term
   */
  async consolidate(): Promise<Result<number, Error>> {
    try {
      this.logger.info('Starting memory consolidation...');

      // Query important short-term memories
      const query: MemoryQuery = {
        type: MemoryType.ShortTerm,
        minImportance: this.consolidationImportance,
      };

      const result = await this.shortTermStore.query(query);

      if (result.isErr()) {
        return err(result.unwrap() as Error);
      }

      const memories = result.unwrap();
      let consolidated = 0;

      for (const memory of memories) {
        // Store in long-term with same content and metadata
        const storeResult = await this.longTermStore.store(
          MemoryType.LongTerm,
          memory.content,
          memory.metadata.importance,
          memory.metadata.tags
        );

        if (storeResult.isOk()) {
          // Delete from short-term
          await this.shortTermStore.delete(memory.id);
          consolidated++;
        }
      }

      this.logger.info(`Consolidated ${consolidated} memories to long-term storage`);

      return ok(consolidated);
    } catch (error) {
      this.logger.error('Failed to consolidate memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maybe consolidate if threshold is reached
   */
  private async maybeConsolidate(): Promise<void> {
    const stats = await this.shortTermStore.getStats();

    if (stats.isOk()) {
      const shortTermStats = stats.unwrap();

      if (shortTermStats.totalEntries >= this.consolidationThreshold) {
        this.logger.info(
          `Short-term memory threshold reached (${shortTermStats.totalEntries}/${this.consolidationThreshold}), consolidating...`
        );
        await this.consolidate();
      }
    }
  }

  /**
   * Prune old or unimportant memories from both stores
   */
  async prune(
    maxAge?: number,
    minImportance: MemoryImportance = MemoryImportance.Low
  ): Promise<Result<number, Error>> {
    try {
      let total = 0;

      // Prune short-term
      const shortTermResult = await this.shortTermStore.prune(maxAge, minImportance);
      if (shortTermResult.isOk()) {
        total += shortTermResult.unwrap();
      }

      // Prune long-term
      const longTermResult = await this.longTermStore.prune(maxAge, minImportance);
      if (longTermResult.isOk()) {
        total += longTermResult.unwrap();
      }

      return ok(total);
    } catch (error) {
      this.logger.error('Failed to prune memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoPrune();
  }
}
