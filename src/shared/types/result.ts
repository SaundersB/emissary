/**
 * Result type for error handling without exceptions
 * Represents either a successful value (Ok) or an error (Err)
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly _tag = 'Ok' as const;

  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is never {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: (error: never) => T): T {
    return this.value;
  }
}

export class Err<E> {
  readonly _tag = 'Err' as const;

  constructor(readonly error: E) {}

  isOk(): this is never {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  flatMap<U, F>(_fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this as unknown as Result<U, E | F>;
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error);
  }
}

/**
 * Helper functions to create Result instances
 */
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);

/**
 * Convert a promise to a Result
 */
export async function tryAsync<T, E = Error>(
  fn: () => Promise<T>
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error as E);
  }
}

/**
 * Convert a synchronous function to a Result
 */
export function trySync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    const value = fn();
    return ok(value);
  } catch (error) {
    return err(error as E);
  }
}
