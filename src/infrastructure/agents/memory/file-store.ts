/**
 * File-based memory store - for long-term persistent memory
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
 * File-based memory store configuration
 */
export interface FileStoreConfig {
  storageDir: string;
  indexFile?: string;
}

/**
 * Memory index for fast lookup
 */
interface MemoryIndex {
  memories: Array<{
    id: string;
    type: MemoryType;
    importance: MemoryImportance;
    tags: string[];
    createdAt: string;
    accessedAt: string;
    accessCount: number;
  }>;
}

/**
 * File-based memory store implementation
 */
export class FileMemoryStore implements MemoryStore {
  private readonly storageDir: string;
  private readonly indexFile: string;
  private index: MemoryIndex = { memories: [] };
  private nextId = 1;
  private initialized = false;

  constructor(config: FileStoreConfig, private readonly logger: Logger) {
    this.storageDir = config.storageDir;
    this.indexFile = config.indexFile ?? path.join(this.storageDir, 'index.json');
  }

  /**
   * Initialize the store (create directories, load index)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create storage directory if it doesn't exist
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load index if it exists
      try {
        const indexData = await fs.readFile(this.indexFile, 'utf-8');
        this.index = JSON.parse(indexData) as MemoryIndex;

        // Find the highest ID to continue numbering
        for (const mem of this.index.memories) {
          const idNum = parseInt(mem.id.split('-')[1] ?? '0', 10);
          if (idNum >= this.nextId) {
            this.nextId = idNum + 1;
          }
        }
      } catch (error) {
        // Index doesn't exist yet, will be created on first write
        this.logger.debug('No existing index found, starting fresh');
      }

      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize file store', error);
      throw error;
    }
  }

  /**
   * Save index to disk
   */
  private async saveIndex(): Promise<void> {
    try {
      await fs.writeFile(this.indexFile, JSON.stringify(this.index, null, 2));
    } catch (error) {
      this.logger.error('Failed to save index', error);
      throw error;
    }
  }

  /**
   * Get file path for a memory entry
   */
  private getMemoryPath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
  }

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
      await this.initialize();

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

      // Save to file
      const memoryPath = this.getMemoryPath(id);
      await fs.writeFile(memoryPath, JSON.stringify(entry.toJSON(), null, 2));

      // Update index
      this.index.memories.push({
        id,
        type,
        importance,
        tags,
        createdAt: now.toISOString(),
        accessedAt: now.toISOString(),
        accessCount: 0,
      });

      await this.saveIndex();

      this.logger.debug(`Stored memory ${id} to file (type: ${type}, importance: ${importance})`);

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
      await this.initialize();

      const memoryPath = this.getMemoryPath(id);

      try {
        const data = await fs.readFile(memoryPath, 'utf-8');
        const parsed = JSON.parse(data) as {
          id: string;
          type: MemoryType;
          content: JsonValue;
          metadata: MemoryMetadata;
        };

        // Parse dates
        parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);
        parsed.metadata.accessedAt = new Date(parsed.metadata.accessedAt);

        const entry = MemoryEntry.fromJSON(parsed);

        // Update access metadata
        entry.recordAccess();

        // Update index
        const indexEntry = this.index.memories.find((m) => m.id === id);
        if (indexEntry) {
          indexEntry.accessedAt = entry.metadata.accessedAt.toISOString();
          indexEntry.accessCount = entry.metadata.accessCount;
          await this.saveIndex();
        }

        // Save updated entry
        await fs.writeFile(memoryPath, JSON.stringify(entry.toJSON(), null, 2));

        this.logger.debug(`Retrieved memory ${id} from file`);

        return ok(entry);
      } catch (error) {
        // File doesn't exist
        return ok(null);
      }
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
      await this.initialize();

      let results = [...this.index.memories];

      // Filter by type
      if (query.type) {
        results = results.filter((entry) => entry.type === query.type);
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        results = results.filter((entry) =>
          query.tags!.some((tag) => entry.tags.includes(tag))
        );
      }

      // Filter by minimum importance
      if (query.minImportance) {
        results = results.filter((entry) => entry.importance >= query.minImportance!);
      }

      // Filter by age
      if (query.maxAge) {
        const now = new Date().getTime();
        results = results.filter((entry) => {
          const createdAt = new Date(entry.createdAt).getTime();
          const age = now - createdAt;
          return age <= query.maxAge!;
        });
      }

      // Sort by access time (most recent first)
      results.sort((a, b) => {
        const dateA = new Date(a.accessedAt).getTime();
        const dateB = new Date(b.accessedAt).getTime();
        return dateB - dateA;
      });

      // Apply limit
      if (query.limit && query.limit > 0) {
        results = results.slice(0, query.limit);
      }

      // Load full entries from files
      const entries: MemoryEntry[] = [];

      for (const indexEntry of results) {
        const result = await this.retrieve(indexEntry.id);
        if (result.isOk()) {
          const entry = result.unwrap();
          if (entry) {
            // Apply search text filter on full content
            if (query.searchText) {
              const searchLower = query.searchText.toLowerCase();
              const contentStr = JSON.stringify(entry.content).toLowerCase();
              if (!contentStr.includes(searchLower)) {
                continue;
              }
            }

            entries.push(entry);
          }
        }
      }

      this.logger.debug(`Query returned ${entries.length} memories from file store`);

      return ok(entries);
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
      await this.initialize();

      const memoryPath = this.getMemoryPath(id);

      try {
        await fs.unlink(memoryPath);

        // Remove from index
        this.index.memories = this.index.memories.filter((m) => m.id !== id);
        await this.saveIndex();

        this.logger.debug(`Deleted memory ${id} from file`);

        return ok(true);
      } catch (error) {
        // File doesn't exist
        return ok(false);
      }
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
      await this.initialize();

      let count = 0;

      if (type) {
        // Clear specific type
        const toDelete = this.index.memories.filter((m) => m.type === type);

        for (const entry of toDelete) {
          const memoryPath = this.getMemoryPath(entry.id);
          try {
            await fs.unlink(memoryPath);
            count++;
          } catch (error) {
            this.logger.warn(`Failed to delete file for memory ${entry.id}`);
          }
        }

        this.index.memories = this.index.memories.filter((m) => m.type !== type);
      } else {
        // Clear all
        count = this.index.memories.length;

        for (const entry of this.index.memories) {
          const memoryPath = this.getMemoryPath(entry.id);
          try {
            await fs.unlink(memoryPath);
          } catch (error) {
            this.logger.warn(`Failed to delete file for memory ${entry.id}`);
          }
        }

        this.index.memories = [];
      }

      await this.saveIndex();

      this.logger.info(`Cleared ${count} memories${type ? ` of type ${type}` : ''} from files`);

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
      await this.initialize();

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

      for (const entry of this.index.memories) {
        byType[entry.type]++;
        byImportance[entry.importance]++;
        totalAccessCount += entry.accessCount;

        const createdAt = new Date(entry.createdAt);

        if (!oldestEntry || createdAt < oldestEntry) {
          oldestEntry = createdAt;
        }

        if (!newestEntry || createdAt > newestEntry) {
          newestEntry = createdAt;
        }
      }

      const stats: MemoryStats = {
        totalEntries: this.index.memories.length,
        byType,
        byImportance,
        oldestEntry,
        newestEntry,
        averageAccessCount:
          this.index.memories.length > 0 ? totalAccessCount / this.index.memories.length : 0,
      };

      return ok(stats);
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Consolidate memories (no-op for file store)
   */
  async consolidate(): Promise<Result<number, Error>> {
    // For file store, consolidation is handled by the memory manager
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
      await this.initialize();

      let count = 0;
      const now = new Date().getTime();

      const toDelete: string[] = [];

      for (const entry of this.index.memories) {
        let shouldPrune = false;

        // Check age
        if (maxAge) {
          const createdAt = new Date(entry.createdAt).getTime();
          const age = now - createdAt;
          if (age > maxAge && entry.importance < minImportance) {
            shouldPrune = true;
          }
        } else if (entry.importance < minImportance) {
          shouldPrune = true;
        }

        if (shouldPrune) {
          toDelete.push(entry.id);
        }
      }

      // Delete files
      for (const id of toDelete) {
        const memoryPath = this.getMemoryPath(id);
        try {
          await fs.unlink(memoryPath);
          count++;
        } catch (error) {
          this.logger.warn(`Failed to delete file for memory ${id}`);
        }
      }

      // Update index
      this.index.memories = this.index.memories.filter((m) => !toDelete.includes(m.id));
      await this.saveIndex();

      this.logger.info(`Pruned ${count} memories from files`);

      return ok(count);
    } catch (error) {
      this.logger.error('Failed to prune memories', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
