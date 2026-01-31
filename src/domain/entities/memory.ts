/**
 * Memory entity - represents agent memory (short-term and long-term)
 */

import { JsonValue } from '@shared/types/index.js';

/**
 * Memory types
 */
export enum MemoryType {
  ShortTerm = 'short-term',
  LongTerm = 'long-term',
  Episodic = 'episodic',
  Semantic = 'semantic',
}

/**
 * Memory importance levels
 */
export enum MemoryImportance {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

/**
 * Memory entry metadata
 */
export interface MemoryMetadata {
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
  importance: MemoryImportance;
  tags?: string[];
  source?: string;
}

/**
 * Memory entry - a single piece of stored information
 */
export class MemoryEntry {
  constructor(
    public readonly id: string,
    public readonly type: MemoryType,
    public readonly content: JsonValue,
    public readonly metadata: MemoryMetadata
  ) {}

  /**
   * Update access metadata
   */
  recordAccess(): void {
    this.metadata.accessedAt = new Date();
    this.metadata.accessCount++;
  }

  /**
   * Check if memory is important
   */
  isImportant(): boolean {
    return this.metadata.importance >= MemoryImportance.High;
  }

  /**
   * Check if memory is stale (not accessed recently)
   */
  isStale(maxAge: number): boolean {
    const now = new Date().getTime();
    const lastAccess = this.metadata.accessedAt.getTime();
    return now - lastAccess > maxAge;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      metadata: this.metadata,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: {
    id: string;
    type: MemoryType;
    content: JsonValue;
    metadata: MemoryMetadata;
  }): MemoryEntry {
    return new MemoryEntry(data.id, data.type, data.content, data.metadata);
  }
}

/**
 * Memory search query
 */
export interface MemoryQuery {
  type?: MemoryType;
  tags?: string[];
  minImportance?: MemoryImportance;
  maxAge?: number;
  limit?: number;
  searchText?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  byImportance: Record<MemoryImportance, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  averageAccessCount: number;
}
