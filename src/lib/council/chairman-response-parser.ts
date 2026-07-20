import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import type { ChairmanResponseContent, CouncilDecision } from "@/types/council";

const EXECUTIVE_SUMMARY_MAX_LENGTH = 4_000;
const FINAL_RECOMMENDATION_MAX_LENGTH = 8_000;
const LIST_ITEM_MAX_LENGTH = 1_000;
const MAX_LIST_ITEMS = 50;
const RECOMMENDATION_MAX_LENGTH = 100;

const VALID_DECISIONS: CouncilDecision[] = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

export class ChairmanModelOutputParseError extends InvalidModelOutputError {}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ChairmanModelOutputParseError(`${label} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ChairmanModelOutputParseError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ChairmanModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new ChairmanModelOutputParseError(`${fieldName} exceeds the allowed length.`);
  }

  return trimmed;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (value.length > MAX_LIST_ITEMS) {
    throw new ChairmanModelOutputParseError(`${fieldName} contains too many items.`);
  }

  return value.map((item, index) =>
    readNonEmptyString(item, `${fieldName}[${index}]`, LIST_ITEM_MAX_LENGTH),
  );
}

function readDecision(value: unknown): CouncilDecision {
  const decision = readNonEmptyString(value, "decision", RECOMMENDATION_MAX_LENGTH);

  if (!VALID_DECISIONS.includes(decision as CouncilDecision)) {
    throw new ChairmanModelOutputParseError("decision must be a valid council decision.");
  }

  return decision as CouncilDecision;
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ChairmanModelOutputParseError("confidence must be a finite number.");
  }

  if (value < 0 || value > 100) {
    throw new ChairmanModelOutputParseError("confidence must be between 0 and 100.");
  }

  return value;
}

function stripMarkdownJsonFence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");

  if (lines.length < 2 || !lines[0].startsWith("```")) {
    return trimmed;
  }

  const closingFenceIndex = lines.lastIndexOf("```");

  if (closingFenceIndex <= 0) {
    return trimmed;
  }

  return lines.slice(1, closingFenceIndex).join("\n").trim();
}

export function parseChairmanResponseContent(text: string): ChairmanResponseContent {
  const normalizedText = stripMarkdownJsonFence(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new ChairmanModelOutputParseError("Model output is not valid JSON.");
  }

  const record = assertPlainObject(parsed, "model output");

  return {
    executiveSummary: readNonEmptyString(
      record.executiveSummary,
      "executiveSummary",
      EXECUTIVE_SUMMARY_MAX_LENGTH,
    ),
    finalRecommendation: readNonEmptyString(
      record.finalRecommendation,
      "finalRecommendation",
      FINAL_RECOMMENDATION_MAX_LENGTH,
    ),
    decision: readDecision(record.decision),
    consensus: readStringArray(record.consensus, "consensus"),
    disagreements: readStringArray(record.disagreements, "disagreements"),
    keyArguments: readStringArray(record.keyArguments, "keyArguments"),
    risks: readStringArray(record.risks, "risks"),
    conditions: readStringArray(record.conditions, "conditions"),
    nextSteps: readStringArray(record.nextSteps, "nextSteps"),
    confidence: readConfidence(record.confidence),
  };
}
