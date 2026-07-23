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
  attachEvidenceToDecisionContext,
  createDecisionContext,
  recordDecisionContextIntegrity,
} from "@/lib/council/decision-context";
import { retrieveEvidenceForCouncil } from "@/lib/pkos/context-retrieval-engine";
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
  const councilStartedAt = Date.now();
  const baseDecisionContext = createDecisionContext(decision);
  const pkosRetrieval = retrieveEvidenceForCouncil(baseDecisionContext);
  const decisionContext = attachEvidenceToDecisionContext(
    baseDecisionContext,
    pkosRetrieval,
  );
  const integrity = recordDecisionContextIntegrity(
    decisionContext,
    ADVISOR_EXECUTION_ORDER,
  );

  const advisorStageStartedAt = Date.now();
  const settledResults = await Promise.allSettled(
    ADVISOR_EXECUTION_ORDER.map((advisorId) =>
      resolveAdvisorResult(decisionContext, advisorId),
    ),
  );
  const advisorStageDurationMs = Date.now() - advisorStageStartedAt;

  const advisorResults = ADVISOR_EXECUTION_ORDER.map((advisorId, index) =>
    resolveSettledAdvisorResult(
      settledResults[index],
      advisorId,
      decisionContext.executionId,
    ),
  );

  const chairmanStartedAt = Date.now();
  const chairman = councilConfig.chairmanEnabled
    ? await runChairman(decisionContext, advisorResults)
    : undefined;
  const chairmanDurationMs = chairman ? Date.now() - chairmanStartedAt : 0;
  const totalDurationMs = Date.now() - councilStartedAt;

  return {
    decision,
    decisionContext,
    integrity,
    status: determineCouncilSessionStatus(
      advisorResults,
      chairman,
      councilConfig.minimumSuccessfulAdvisors,
    ),
    advisors: advisorResults,
    chairman,
    advisorStageDurationMs,
    chairmanDurationMs,
    totalDurationMs,
    pkosRetrieval,
  };
}
