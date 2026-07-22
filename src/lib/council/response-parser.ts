import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import {
  ANALYSIS_DESCRIPTION_MAX_LENGTH,
  ANALYSIS_TITLE_MAX_LENGTH,
  LIST_ITEM_MAX_LENGTH,
  MAX_ANALYSIS_ITEMS,
  MAX_ASSUMPTIONS,
  MAX_RISKS,
  RECOMMENDATION_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  stripMarkdownJsonFence,
} from "@/lib/council/advisor-response-limits";
import type { AdvisorResponseContent, CouncilDecision } from "@/types/council";

const VALID_RECOMMENDATIONS: CouncilDecision[] = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

export class ModelOutputParseError extends InvalidModelOutputError {}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelOutputParseError(`${label} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ModelOutputParseError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new ModelOutputParseError(`${fieldName} exceeds the allowed length.`);
  }

  return trimmed;
}

function readStringArray(value: unknown, fieldName: string, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    throw new ModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (value.length > maxItems) {
    throw new ModelOutputParseError(`${fieldName} must contain at most ${maxItems} items.`);
  }

  return value.map((item, index) =>
    readStringArrayItem(item, `${fieldName}[${index}]`, LIST_ITEM_MAX_LENGTH),
  );
}

function readStringArrayItem(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value === "string") {
    return readNonEmptyString(value, fieldName, maxLength);
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const description =
      typeof record.description === "string" ? record.description.trim() : "";
    const combined = [title, description].filter(Boolean).join(": ");

    return readNonEmptyString(combined, fieldName, maxLength);
  }

  throw new ModelOutputParseError(`${fieldName} must be a string.`);
}

function readAnalysis(value: unknown): AdvisorResponseContent["analysis"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ModelOutputParseError("analysis must be a non-empty array.");
  }

  if (value.length > MAX_ANALYSIS_ITEMS) {
    throw new ModelOutputParseError(`analysis must contain at most ${MAX_ANALYSIS_ITEMS} items.`);
  }

  return value.map((item, index) => {
    const record = assertPlainObject(item, `analysis[${index}]`);

    return {
      title: readNonEmptyString(
        record.title,
        `analysis[${index}].title`,
        ANALYSIS_TITLE_MAX_LENGTH,
      ),
      description: readNonEmptyString(
        record.description,
        `analysis[${index}].description`,
        ANALYSIS_DESCRIPTION_MAX_LENGTH,
      ),
    };
  });
}

function readRecommendation(value: unknown): CouncilDecision {
  const recommendation = readNonEmptyString(
    value,
    "recommendation",
    RECOMMENDATION_MAX_LENGTH,
  );

  if (!VALID_RECOMMENDATIONS.includes(recommendation as CouncilDecision)) {
    throw new ModelOutputParseError("recommendation must be a valid council decision.");
  }

  return recommendation as CouncilDecision;
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ModelOutputParseError("confidence must be a finite number.");
  }

  const normalized = value > 0 && value <= 1 ? Math.round(value * 100) : value;

  if (normalized < 0 || normalized > 100) {
    throw new ModelOutputParseError("confidence must be between 0 and 100.");
  }

  return normalized;
}

function readAssumptions(record: Record<string, unknown>): string[] {
  if (record.assumptions !== undefined) {
    return readStringArray(record.assumptions, "assumptions", MAX_ASSUMPTIONS);
  }

  if (record.keyArguments !== undefined) {
    return readStringArray(record.keyArguments, "assumptions", MAX_ASSUMPTIONS);
  }

  throw new ModelOutputParseError("assumptions must be an array.");
}

function readRisks(record: Record<string, unknown>): string[] {
  if (record.risks === undefined) {
    throw new ModelOutputParseError("risks must be an array.");
  }

  return readStringArray(record.risks, "risks", MAX_RISKS);
}

export function parseAdvisorResponseContent(text: string): AdvisorResponseContent {
  const normalizedText = stripMarkdownJsonFence(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new ModelOutputParseError("Model output is not valid JSON.");
  }

  const record = assertPlainObject(parsed, "model output");

  return {
    summary: readNonEmptyString(record.summary, "summary", SUMMARY_MAX_LENGTH),
    analysis: readAnalysis(record.analysis),
    assumptions: readAssumptions(record),
    risks: readRisks(record),
    recommendation: readRecommendation(record.recommendation),
    confidence: readConfidence(record.confidence),
  };
}
