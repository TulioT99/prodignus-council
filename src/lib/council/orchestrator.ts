import "server-only";

import { getRuntimeConfig } from "@/config/runtime";
import {
  getAdvisorExecutionConfig,
  getAdvisorExecutionOrder,
} from "@/lib/council/advisor-execution-config";
import {
  createUnexpectedAdvisorFailureResult,
  runAdvisor,
} from "@/lib/council/advisor-runner";
import { runChairman } from "@/lib/council/chairman-runner";
import { mapWithConcurrency } from "@/lib/council/concurrency";
import { determineCouncilSessionStatus } from "@/lib/council/council-status";
import {
  attachEvidenceToDecisionContext,
  createDecisionContext,
  recordDecisionContextIntegrity,
} from "@/lib/council/decision-context";
import { retrieveEvidenceForCouncil } from "@/lib/pkos/context-retrieval-engine";
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

async function runCouncilSession(decision: Decision): Promise<CouncilResult> {
  const runtime = getRuntimeConfig();
  const advisorOrder = getAdvisorExecutionOrder();
  const councilStartedAt = Date.now();
  const baseDecisionContext = createDecisionContext(decision);
  const pkosRetrieval = retrieveEvidenceForCouncil(baseDecisionContext);
  const decisionContext = attachEvidenceToDecisionContext(
    baseDecisionContext,
    pkosRetrieval,
  );
  const integrity = recordDecisionContextIntegrity(
    decisionContext,
    advisorOrder,
  );

  const advisorStageStartedAt = Date.now();
  const settledResults = await mapWithConcurrency(
    advisorOrder,
    runtime.advisors.maxConcurrency,
    (advisorId) => resolveAdvisorResult(decisionContext, advisorId),
  );
  const advisorStageDurationMs = Date.now() - advisorStageStartedAt;

  const advisorResults = advisorOrder.map((advisorId, index) =>
    resolveSettledAdvisorResult(
      settledResults[index],
      advisorId,
      decisionContext.executionId,
    ),
  );

  const chairmanStartedAt = Date.now();
  const chairman = runtime.chairman.enabled
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
      runtime.chairman.minimumSuccessfulAdvisors,
    ),
    advisors: advisorResults,
    chairman,
    advisorStageDurationMs,
    chairmanDurationMs,
    totalDurationMs,
    pkosRetrieval,
  };
}

export async function runCouncil(decision: Decision): Promise<CouncilResult> {
  const overallTimeoutMs = getRuntimeConfig().timeouts.overallCouncilTimeoutMs;

  if (overallTimeoutMs <= 0) {
    return runCouncilSession(decision);
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      runCouncilSession(decision),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Council session exceeded overall timeout of ${overallTimeoutMs}ms.`,
            ),
          );
        }, overallTimeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
