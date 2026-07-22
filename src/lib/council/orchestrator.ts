import "server-only";

import {
  ADVISOR_EXECUTION_ORDER,
  getAdvisorExecutionConfig,
} from "@/lib/council/advisor-execution-config";
import {
  createUnexpectedAdvisorFailureResult,
  runAdvisor,
} from "@/lib/council/advisor-runner";
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

function resolveSettledAdvisorResult(
  settled: PromiseSettledResult<AdvisorResult>,
  advisorId: string,
  executionId: string,
): AdvisorResult {
  if (settled.status === "fulfilled") {
    return settled.value;
  }

  const persona = getAdvisorPersonaById(advisorId);

  console.error(
    `[Council] Unexpected advisor rejection: advisorId=${advisorId} reason="${settled.reason instanceof Error ? settled.reason.message : "unknown"}"`,
  );

  return createUnexpectedAdvisorFailureResult(
    persona,
    executionId,
    "The advisor could not complete this review.",
  );
}

export async function runCouncil(decision: Decision): Promise<CouncilResult> {
  const decisionContext = createDecisionContext(decision);
  const integrity = recordDecisionContextIntegrity(
    decisionContext,
    ADVISOR_EXECUTION_ORDER,
  );

  const settledResults = await Promise.allSettled(
    ADVISOR_EXECUTION_ORDER.map((advisorId) =>
      resolveAdvisorResult(decisionContext, advisorId),
    ),
  );

  const advisorResults = ADVISOR_EXECUTION_ORDER.map((advisorId, index) =>
    resolveSettledAdvisorResult(
      settledResults[index],
      advisorId,
      decisionContext.executionId,
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
