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
import { ABORT_REASON_CANCELLED } from "@/lib/council/execution-abort";
import { selectValidatedAdvisorOpinions } from "@/lib/council/validated-advisor-opinions";
import { retrieveEvidenceForCouncil } from "@/lib/pkos/context-retrieval-engine";
import { getAdvisorPersonaById } from "@/data/advisor-personas";
import type { AdvisorResult, CouncilResult, Decision } from "@/types/council";

async function resolveAdvisorResult(
  decisionContext: ReturnType<typeof createDecisionContext>,
  advisorId: string,
  signal?: AbortSignal,
): Promise<AdvisorResult> {
  const persona = getAdvisorPersonaById(advisorId);
  const executionConfig = getAdvisorExecutionConfig(advisorId);

  if (!executionConfig) {
    throw new Error(`Advisor execution config not found: ${advisorId}`);
  }

  return runAdvisor(decisionContext, persona, executionConfig, { signal });
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

async function runCouncilSession(
  decision: Decision,
  signal?: AbortSignal,
): Promise<CouncilResult> {
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
    (advisorId) => resolveAdvisorResult(decisionContext, advisorId, signal),
    signal,
  );
  const advisorStageDurationMs = Date.now() - advisorStageStartedAt;

  const advisorResults = advisorOrder.map((advisorId, index) =>
    resolveSettledAdvisorResult(
      settledResults[index],
      advisorId,
      decisionContext.executionId,
    ),
  );

  // Validation gate for future consensus (WP-04). Side-effect free; keeps
  // Chairman path unchanged while proving validated opinions are selectable.
  const validatedOpinions = selectValidatedAdvisorOpinions(advisorResults);
  if (runtime.features.enableDetailedTraces) {
    console.info(
      `[Council] Validated advisor opinions: executionId=${decisionContext.executionId} count=${validatedOpinions.length}/${advisorResults.length}`,
    );
  }

  if (signal?.aborted) {
    throw new Error("Council session was cancelled.");
  }

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

  const sessionController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      runCouncilSession(decision, sessionController.signal),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          sessionController.abort(ABORT_REASON_CANCELLED);
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

    if (!sessionController.signal.aborted) {
      sessionController.abort(ABORT_REASON_CANCELLED);
    }
  }
}
