import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import {
  ANALYSIS_DESCRIPTION_MAX_LENGTH,
  ANALYSIS_TITLE_MAX_LENGTH,
  LIST_ITEM_MAX_LENGTH,
  MAX_ANALYSIS_ITEMS,
  MAX_ASSUMPTIONS,
  MAX_KEY_ARGUMENTS,
  MAX_RISKS,
  MAX_UNKNOWNS,
  RECOMMENDATION_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  stripMarkdownJsonFence,
} from "@/lib/council/advisor-response-limits";
import type { CouncilDecision, ProductStrategyResponseContent } from "@/types/council";

const VALID_RECOMMENDATIONS: CouncilDecision[] = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

export class ProductStrategyModelOutputParseError extends InvalidModelOutputError {}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProductStrategyModelOutputParseError(`${label} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ProductStrategyModelOutputParseError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ProductStrategyModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new ProductStrategyModelOutputParseError(`${fieldName} exceeds the allowed length.`);
  }

  return trimmed;
}

function readStringArray(
  value: unknown,
  fieldName: string,
  maxItems: number,
  allowEmpty = true,
): string[] {
  if (!Array.isArray(value)) {
    throw new ProductStrategyModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (!allowEmpty && value.length === 0) {
    throw new ProductStrategyModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (value.length > maxItems) {
    throw new ProductStrategyModelOutputParseError(
      `${fieldName} must contain at most ${maxItems} items.`,
    );
  }

  return value.map((item, index) =>
    readNonEmptyString(item, `${fieldName}[${index}]`, LIST_ITEM_MAX_LENGTH),
  );
}

function readAnalysis(value: unknown): ProductStrategyResponseContent["analysis"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProductStrategyModelOutputParseError("analysis must be a non-empty array.");
  }

  if (value.length > MAX_ANALYSIS_ITEMS) {
    throw new ProductStrategyModelOutputParseError(
      `analysis must contain at most ${MAX_ANALYSIS_ITEMS} items.`,
    );
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
    throw new ProductStrategyModelOutputParseError(
      "recommendation must be a valid council decision.",
    );
  }

  return recommendation as CouncilDecision;
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ProductStrategyModelOutputParseError("confidence must be a finite number.");
  }

  if (value < 0 || value > 100) {
    throw new ProductStrategyModelOutputParseError("confidence must be between 0 and 100.");
  }

  return value;
}

export function parseProductStrategyResponseContent(
  text: string,
): ProductStrategyResponseContent {
  const normalizedText = stripMarkdownJsonFence(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new ProductStrategyModelOutputParseError("Model output is not valid JSON.");
  }

  const record = assertPlainObject(parsed, "model output");

  return {
    summary: readNonEmptyString(record.summary, "summary", SUMMARY_MAX_LENGTH),
    analysis: readAnalysis(record.analysis),
    recommendation: readRecommendation(record.recommendation),
    keyArguments: readStringArray(record.keyArguments, "keyArguments", MAX_KEY_ARGUMENTS, false),
    risks: readStringArray(record.risks, "risks", MAX_RISKS),
    assumptions: readStringArray(record.assumptions, "assumptions", MAX_ASSUMPTIONS),
    unknowns: readStringArray(record.unknowns, "unknowns", MAX_UNKNOWNS),
    confidence: readConfidence(record.confidence),
  };
}
