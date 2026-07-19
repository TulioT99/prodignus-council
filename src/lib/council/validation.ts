import "server-only";

import type { Decision, DecisionStatus } from "@/types/council";

const DECISION_STATUSES: DecisionStatus[] = [
  "draft",
  "under_review",
  "decided",
  "archived",
];

const ID_MAX_LENGTH = 100;
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 150;
const QUESTION_MIN_LENGTH = 10;
const QUESTION_MAX_LENGTH = 4_000;
const CONTEXT_MAX_LENGTH = 8_000;
const CONSTRAINTS_MAX_LENGTH = 4_000;

export class DecisionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionValidationError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; minLength?: number; maxLength?: number },
): string {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new DecisionValidationError(`${fieldName} is required.`);
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new DecisionValidationError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (options.required && !trimmed) {
    throw new DecisionValidationError(`${fieldName} is required.`);
  }

  if (options.minLength !== undefined && trimmed.length < options.minLength) {
    throw new DecisionValidationError(
      `${fieldName} must be at least ${options.minLength} characters.`,
    );
  }

  if (options.maxLength !== undefined && trimmed.length > options.maxLength) {
    throw new DecisionValidationError(
      `${fieldName} must be at most ${options.maxLength} characters.`,
    );
  }

  return trimmed;
}

function readDecisionStatus(value: unknown): DecisionStatus {
  if (typeof value !== "string" || !DECISION_STATUSES.includes(value as DecisionStatus)) {
    throw new DecisionValidationError("status must be a valid DecisionStatus.");
  }

  return value as DecisionStatus;
}

function readCreatedAt(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DecisionValidationError("createdAt must be a valid ISO date-time string.");
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new DecisionValidationError("createdAt must be a valid ISO date-time string.");
  }

  return new Date(parsed).toISOString();
}

export function validateDecision(value: unknown): Decision {
  if (!isPlainObject(value)) {
    throw new DecisionValidationError("decision must be an object.");
  }

  const id = readTrimmedString(value.id, "id", {
    required: true,
    maxLength: ID_MAX_LENGTH,
  });
  const title = readTrimmedString(value.title, "title", {
    required: true,
    minLength: TITLE_MIN_LENGTH,
    maxLength: TITLE_MAX_LENGTH,
  });
  const question = readTrimmedString(value.question, "question", {
    required: true,
    minLength: QUESTION_MIN_LENGTH,
    maxLength: QUESTION_MAX_LENGTH,
  });
  const context = readTrimmedString(value.context, "context", {
    maxLength: CONTEXT_MAX_LENGTH,
  });
  const constraints = readTrimmedString(value.constraints, "constraints", {
    maxLength: CONSTRAINTS_MAX_LENGTH,
  });
  const createdAt = readCreatedAt(value.createdAt);
  const status = readDecisionStatus(value.status);

  const decision: Decision = {
    id,
    title,
    question,
    context,
    constraints,
    createdAt,
    status,
  };

  if (value.owner !== undefined) {
    if (typeof value.owner !== "string") {
      throw new DecisionValidationError("owner must be a string when provided.");
    }

    decision.owner = value.owner.trim();
  }

  if (value.expectedOutcome !== undefined) {
    if (typeof value.expectedOutcome !== "string") {
      throw new DecisionValidationError(
        "expectedOutcome must be a string when provided.",
      );
    }

    decision.expectedOutcome = value.expectedOutcome.trim();
  }

  return decision;
}

export function validateContrarianRequestBody(value: unknown): { decision: Decision } {
  if (!isPlainObject(value)) {
    throw new DecisionValidationError("Request body must be a JSON object.");
  }

  return {
    decision: validateDecision(value.decision),
  };
}
