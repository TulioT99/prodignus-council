import "server-only";

import {
  ADVISOR_EXECUTION_ORDER,
  getAdvisorExecutionConfig,
} from "@/lib/council/advisor-execution-config";
import { runAdvisor } from "@/lib/council/advisor-runner";
import { runChairman } from "@/lib/council/chairman-runner";
import { determineCouncilSessionStatus } from "@/lib/council/council-status";
import {
  createDecisionContext,
  recordDecisionContextIntegrity,
} from "@/lib/council/decision-context";
import { councilConfig } from "@/config/council";
import { getAdvisorPersonaById } from "@/data/advisor-personas";
import type { AdvisorResult, CouncilResult, Decision } from "@/types/council";

async function resolveAdvisorResult(
  decisionContext: ReturnType<typeof createDecisionContext>,
  advisorId: string,
): Promise<AdvisorResult> {
  const persona = getAdvisorPersonaById(advisorId);
  const executionConfig = getAdvisorExecutionConfig(advisorId);

  if (!executionConfig) {
    throw new Error(`Advisor execution config not found: ${advisorId}`);
  }

  return runAdvisor(decisionContext, persona, executionConfig);
}

export async function runCouncil(decision: Decision): Promise<CouncilResult> {
  const decisionContext = createDecisionContext(decision);
  const integrity = recordDecisionContextIntegrity(
    decisionContext,
    ADVISOR_EXECUTION_ORDER,
  );

  const advisorResults = await Promise.all(
    ADVISOR_EXECUTION_ORDER.map((advisorId) =>
      resolveAdvisorResult(decisionContext, advisorId),
    ),
  );

  const chairman = councilConfig.chairmanEnabled
    ? await runChairman(decisionContext, advisorResults)
    : undefined;

  const totalDurationMs =
    advisorResults.reduce((total, advisor) => total + advisor.durationMs, 0) +
    (chairman?.durationMs ?? 0);

  return {
    decision,
    decisionContext,
    integrity,
    status: determineCouncilSessionStatus(
      advisorResults,
      councilConfig.liveAdvisorIds,
      councilConfig.minimumSuccessfulAdvisors,
    ),
    advisors: advisorResults,
    chairman,
    totalDurationMs,
  };
}
