import "server-only";

import {
  ADVISOR_EXECUTION_ORDER,
  getLiveAdvisorExecutionConfig,
} from "@/lib/council/advisor-execution-config";
import { runAdvisor } from "@/lib/council/advisor-runner";
import { determineCouncilSessionStatus } from "@/lib/council/council-status";
import { councilConfig } from "@/config/council";
import { getAdvisorPersonaById } from "@/data/advisor-personas";
import { getMockAdvisorResult, getMockChairmanResult } from "@/data/mock-council-result";
import type { AdvisorResult, CouncilResult, Decision } from "@/types/council";

async function resolveAdvisorResult(
  decision: Decision,
  advisorId: string,
): Promise<AdvisorResult> {
  const persona = getAdvisorPersonaById(advisorId);
  const executionConfig = getLiveAdvisorExecutionConfig(advisorId);

  if (executionConfig) {
    return runAdvisor(decision, persona, executionConfig);
  }

  return getMockAdvisorResult(advisorId);
}

export async function runCouncil(decision: Decision): Promise<CouncilResult> {
  const advisorResults = await Promise.all(
    ADVISOR_EXECUTION_ORDER.map((advisorId) => resolveAdvisorResult(decision, advisorId)),
  );

  const totalDurationMs = advisorResults.reduce(
    (total, advisor) => total + advisor.durationMs,
    0,
  );

  return {
    decision,
    status: determineCouncilSessionStatus(
      advisorResults,
      councilConfig.liveAdvisorIds,
      councilConfig.minimumSuccessfulAdvisors,
    ),
    advisors: advisorResults,
    chairman: councilConfig.chairmanEnabled ? getMockChairmanResult() : undefined,
    totalDurationMs,
  };
}
