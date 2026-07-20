import "server-only";

import { councilConfig } from "@/config/council";
import type { AdvisorExecutionConfig } from "@/types/council";

export const ADVISOR_EXECUTION_CONFIG: Record<
  (typeof councilConfig.liveAdvisorIds)[number],
  AdvisorExecutionConfig
> = {
  "ADV-001": {
    advisorId: "ADV-001",
    modelEnvVar: "OPENROUTER_MODEL_CONTRARIAN",
  },
  "ADV-002": {
    advisorId: "ADV-002",
    modelEnvVar: "OPENROUTER_MODEL_PRODUCT_STRATEGY",
  },
  "ADV-003": {
    advisorId: "ADV-003",
    modelEnvVar: "OPENROUTER_MODEL_UX_ACCESSIBILITY",
  },
  "ADV-004": {
    advisorId: "ADV-004",
    modelEnvVar: "OPENROUTER_MODEL_DELIVERY_ENGINEERING",
  },
  "ADV-005": {
    advisorId: "ADV-005",
    modelEnvVar: "OPENROUTER_MODEL_HUMAN_IMPACT",
  },
};

export function getAdvisorExecutionConfig(
  advisorId: string,
): AdvisorExecutionConfig | undefined {
  if (!(advisorId in ADVISOR_EXECUTION_CONFIG)) {
    return undefined;
  }

  return ADVISOR_EXECUTION_CONFIG[advisorId as keyof typeof ADVISOR_EXECUTION_CONFIG];
}

/** @deprecated Use getAdvisorExecutionConfig */
export function getLiveAdvisorExecutionConfig(
  advisorId: string,
): AdvisorExecutionConfig | undefined {
  return getAdvisorExecutionConfig(advisorId);
}

export const ADVISOR_EXECUTION_ORDER = [
  "ADV-001",
  "ADV-002",
  "ADV-003",
  "ADV-004",
  "ADV-005",
] as const;
