import "server-only";

import { DEFAULT_RUNTIME_CONFIG } from "@/config/defaults";
import { getRuntimeConfig } from "@/config/runtime";
import type { AdvisorId } from "@/config/types";
import type { AdvisorExecutionConfig } from "@/types/council";

const defaultModelEnvVars = DEFAULT_RUNTIME_CONFIG.openRouter.modelEnvVars.advisors;

/**
 * Default advisor → model env var map (derived from DEFAULT_RUNTIME_CONFIG).
 * Prefer getAdvisorExecutionConfig / getAdvisorExecutionOrder at runtime.
 */
export const ADVISOR_EXECUTION_CONFIG: Record<AdvisorId, AdvisorExecutionConfig> =
  {
    "ADV-001": {
      advisorId: "ADV-001",
      modelEnvVar: defaultModelEnvVars["ADV-001"],
    },
    "ADV-002": {
      advisorId: "ADV-002",
      modelEnvVar: defaultModelEnvVars["ADV-002"],
    },
    "ADV-003": {
      advisorId: "ADV-003",
      modelEnvVar: defaultModelEnvVars["ADV-003"],
    },
    "ADV-004": {
      advisorId: "ADV-004",
      modelEnvVar: defaultModelEnvVars["ADV-004"],
    },
    "ADV-005": {
      advisorId: "ADV-005",
      modelEnvVar: defaultModelEnvVars["ADV-005"],
    },
  };

export function getAdvisorExecutionConfig(
  advisorId: string,
): AdvisorExecutionConfig | undefined {
  const runtime = getRuntimeConfig();
  const modelEnvVar =
    runtime.openRouter.modelEnvVars.advisors[advisorId as AdvisorId];

  if (!modelEnvVar) {
    return undefined;
  }

  return {
    advisorId,
    modelEnvVar,
  };
}

/** @deprecated Use getAdvisorExecutionConfig */
export function getLiveAdvisorExecutionConfig(
  advisorId: string,
): AdvisorExecutionConfig | undefined {
  return getAdvisorExecutionConfig(advisorId);
}

/**
 * Default advisor execution order (derived from DEFAULT_RUNTIME_CONFIG).
 * Prefer getAdvisorExecutionOrder() at runtime.
 */
export const ADVISOR_EXECUTION_ORDER =
  DEFAULT_RUNTIME_CONFIG.advisors.executionOrder;

/**
 * Enabled advisors in configured execution order.
 * Defaults match ADVISOR_EXECUTION_ORDER with all advisors enabled.
 */
export function getAdvisorExecutionOrder(): readonly AdvisorId[] {
  const runtime = getRuntimeConfig();
  const enabled = new Set(runtime.advisors.enabledAdvisorIds);

  return runtime.advisors.executionOrder.filter((advisorId) =>
    enabled.has(advisorId),
  );
}
