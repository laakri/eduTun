// Single error type used everywhere — API routes, services, server actions.
// Never throw a plain Error or string for anything user-facing; throw AppError
// so the API layer can turn it into a consistent JSON shape and status code.

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }
}

// Common cases as named constructors — keeps call sites readable
// and status codes consistent instead of guessing a number each time.
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  readonly issues: unknown;
  constructor(message = "Invalid input", issues?: unknown) {
    super(message, 422, "VALIDATION_ERROR");
    this.issues = issues;
  }
}

export class ConflictError extends AppError {
  constructor(message = "Already exists") {
    super(message, 409, "CONFLICT");
  }
}
