import "server-only";

import { councilConfig } from "@/config/council";
import type { AdvisorExecutionConfig } from "@/types/council";

const LIVE_ADVISOR_EXECUTION: Record<
  (typeof councilConfig.liveAdvisorIds)[number],
  AdvisorExecutionConfig
> = {
  "ADV-001": {
    advisorId: "ADV-001",
    modelEnvVar: "OPENROUTER_MODEL_CONTRARIAN",
  },
};

export function getLiveAdvisorExecutionConfig(
  advisorId: string,
): AdvisorExecutionConfig | undefined {
  if (!(advisorId in LIVE_ADVISOR_EXECUTION)) {
    return undefined;
  }

  return LIVE_ADVISOR_EXECUTION[advisorId as keyof typeof LIVE_ADVISOR_EXECUTION];
}

export const ADVISOR_EXECUTION_ORDER = [
  "ADV-001",
  "ADV-002",
  "ADV-003",
  "ADV-004",
  "ADV-005",
] as const;
