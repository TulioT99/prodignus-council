/**
 * Shared helpers for Chairman tests that require a published Consensus Package.
 */

export async function buildTestConsensusPackage({
  executionId,
  advisors,
  expectedAdvisorIds,
  minimumEligibleAdvisors = 3,
}) {
  const { buildConsensusPackage } =
    await import("../src/lib/council/consensus/engine.ts");

  const ids =
    expectedAdvisorIds ??
    advisors.map((advisor) => advisor.persona.id).filter(Boolean);

  return buildConsensusPackage({
    executionId,
    advisors,
    expectedAdvisorIds: ids,
    minimumEligibleAdvisors,
  });
}

export function assertChairmanFailed(result) {
  if (result.status !== "failed") {
    throw new Error(`Expected ChairmanFailed, got status=${result.status}`);
  }

  if (result.outcome !== "ChairmanFailed") {
    throw new Error(`Expected outcome ChairmanFailed, got ${result.outcome}`);
  }

  if (
    "decision" in result ||
    "finalRecommendation" in result ||
    "recommendationType" in result ||
    "rationale" in result ||
    "executiveSummary" in result
  ) {
    throw new Error(
      "ChairmanFailed must not carry recommendation-shaped fields",
    );
  }
}
