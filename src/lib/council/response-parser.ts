import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import type { AdvisorResponseContent, CouncilDecision } from "@/types/council";

const SUMMARY_MAX_LENGTH = 4_000;
const ANALYSIS_TITLE_MAX_LENGTH = 200;
const ANALYSIS_DESCRIPTION_MAX_LENGTH = 4_000;
const LIST_ITEM_MAX_LENGTH = 1_000;
const MAX_LIST_ITEMS = 50;
const MAX_ANALYSIS_ITEMS = 20;
const RECOMMENDATION_MAX_LENGTH = 100;

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

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new ModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (value.length > MAX_LIST_ITEMS) {
    throw new ModelOutputParseError(`${fieldName} contains too many items.`);
  }

  return value.map((item, index) =>
    readNonEmptyString(item, `${fieldName}[${index}]`, LIST_ITEM_MAX_LENGTH),
  );
}

function readAnalysis(value: unknown): AdvisorResponseContent["analysis"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ModelOutputParseError("analysis must be a non-empty array.");
  }

  if (value.length > MAX_ANALYSIS_ITEMS) {
    throw new ModelOutputParseError("analysis contains too many items.");
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

  if (value < 0 || value > 100) {
    throw new ModelOutputParseError("confidence must be between 0 and 100.");
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
    assumptions: readStringArray(record.assumptions, "assumptions"),
    risks: readStringArray(record.risks, "risks"),
    recommendation: readRecommendation(record.recommendation),
    confidence: readConfidence(record.confidence),
  };
}
