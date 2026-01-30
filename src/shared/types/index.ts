/**
 * Common types used throughout the application
 */

export * from './result.js';

/**
 * Branded type for creating nominal types from primitives
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Extract the value type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * JSON-serializable types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Timestamp type (ISO 8601 string)
 */
export type Timestamp = Brand<string, 'Timestamp'>;

/**
 * Create a timestamp from a Date
 */
export function timestamp(date: Date = new Date()): Timestamp {
  return date.toISOString() as Timestamp;
}

/**
 * Parse a timestamp to a Date
 */
export function parseTimestamp(ts: Timestamp): Date {
  return new Date(ts);
}

/**
 * Event type for pub/sub
 */
export interface Event<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly timestamp: Timestamp;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Create an event
 */
export function createEvent<T>(type: string, payload: T, metadata?: Record<string, unknown>): Event<T> {
  return {
    type,
    payload,
    timestamp: timestamp(),
    metadata,
  };
}

/**
 * Pagination types
 */
export interface Paginated<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Optional type that can be null or undefined
 */
export type Optional<T> = T | null | undefined;

/**
 * Ensure a value is not null or undefined
 */
export function isDefined<T>(value: Optional<T>): value is T {
  return value !== null && value !== undefined;
}

/**
 * NonEmptyArray type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Check if an array is non-empty
 */
export function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}
