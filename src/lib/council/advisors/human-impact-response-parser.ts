import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import {
  ANALYSIS_DESCRIPTION_MAX_LENGTH,
  ANALYSIS_TITLE_MAX_LENGTH,
  LIST_ITEM_MAX_LENGTH,
  MAX_ANALYSIS_ITEMS,
  MAX_DOMAIN_LIST_ITEMS,
  MAX_KEY_ARGUMENTS,
  MAX_RISKS,
  MAX_UNKNOWNS,
  RECOMMENDATION_MAX_LENGTH,
  SUMMARY_MAX_LENGTH,
  stripMarkdownJsonFence,
} from "@/lib/council/advisor-response-limits";
import type { CouncilDecision, HumanImpactResponseContent } from "@/types/council";

const VALID_RECOMMENDATIONS: CouncilDecision[] = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

export class HumanImpactModelOutputParseError extends InvalidModelOutputError {}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HumanImpactModelOutputParseError(`${label} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new HumanImpactModelOutputParseError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new HumanImpactModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new HumanImpactModelOutputParseError(`${fieldName} exceeds the allowed length.`);
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
    throw new HumanImpactModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (!allowEmpty && value.length === 0) {
    throw new HumanImpactModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (value.length > maxItems) {
    throw new HumanImpactModelOutputParseError(
      `${fieldName} must contain at most ${maxItems} items.`,
    );
  }

  return value.map((item, index) =>
    readNonEmptyString(item, `${fieldName}[${index}]`, LIST_ITEM_MAX_LENGTH),
  );
}

function readAnalysis(value: unknown): HumanImpactResponseContent["analysis"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HumanImpactModelOutputParseError("analysis must be a non-empty array.");
  }

  if (value.length > MAX_ANALYSIS_ITEMS) {
    throw new HumanImpactModelOutputParseError(
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
    throw new HumanImpactModelOutputParseError(
      "recommendation must be a valid council decision.",
    );
  }

  return recommendation as CouncilDecision;
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HumanImpactModelOutputParseError("confidence must be a finite number.");
  }

  if (value < 0 || value > 100) {
    throw new HumanImpactModelOutputParseError("confidence must be between 0 and 100.");
  }

  return value;
}

export function parseHumanImpactResponseContent(text: string): HumanImpactResponseContent {
  const normalizedText = stripMarkdownJsonFence(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new HumanImpactModelOutputParseError("Model output is not valid JSON.");
  }

  const record = assertPlainObject(parsed, "model output");

  return {
    summary: readNonEmptyString(record.summary, "summary", SUMMARY_MAX_LENGTH),
    analysis: readAnalysis(record.analysis),
    recommendation: readRecommendation(record.recommendation),
    keyArguments: readStringArray(record.keyArguments, "keyArguments", MAX_KEY_ARGUMENTS, false),
    risks: readStringArray(record.risks, "risks", MAX_RISKS),
    unknowns: readStringArray(record.unknowns, "unknowns", MAX_UNKNOWNS),
    humanImpact: readStringArray(record.humanImpact, "humanImpact", MAX_DOMAIN_LIST_ITEMS, false),
    ethicalConcerns: readStringArray(record.ethicalConcerns, "ethicalConcerns", MAX_DOMAIN_LIST_ITEMS),
    inclusionConcerns: readStringArray(
      record.inclusionConcerns,
      "inclusionConcerns",
      MAX_DOMAIN_LIST_ITEMS,
    ),
    longTermEffects: readStringArray(record.longTermEffects, "longTermEffects", MAX_DOMAIN_LIST_ITEMS),
    confidence: readConfidence(record.confidence),
  };
}
