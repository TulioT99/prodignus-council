import "server-only";

import { ADVISOR_CALIBRATION_LIMITS } from "@/lib/council/advisor-calibration";

export { ADVISOR_CALIBRATION_LIMITS };

export function stripMarkdownJsonFence(text: string): string {
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

export const {
  MAX_KEY_ARGUMENTS,
  MAX_UNKNOWNS,
  MAX_RISKS,
  MAX_ASSUMPTIONS,
  MAX_ANALYSIS_ITEMS,
  MAX_DOMAIN_LIST_ITEMS,
  SUMMARY_MAX_LENGTH,
  ANALYSIS_DESCRIPTION_MAX_LENGTH,
  ANALYSIS_TITLE_MAX_LENGTH,
  LIST_ITEM_MAX_LENGTH,
  RECOMMENDATION_MAX_LENGTH,
} = ADVISOR_CALIBRATION_LIMITS;
