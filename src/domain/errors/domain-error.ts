/**
 * Base domain error class
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class InvalidEntityError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_ENTITY', details);
    this.name = 'InvalidEntityError';
  }
}

export class InvalidValueObjectError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_VALUE_OBJECT', details);
    this.name = 'InvalidValueObjectError';
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', details);
    this.name = 'BusinessRuleViolationError';
  }
}
