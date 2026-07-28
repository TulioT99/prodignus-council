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

export function createTestDecisionMetadata(overrides = {}) {
  const executionId = overrides.executionId ?? "EXEC-SHARED-001";
  const consensusPackageId =
    overrides.consensusPackageId ?? `cp:${executionId}:v1.0`;

  return {
    schemaVersion: "1.0",
    decisionId: overrides.decisionId ?? `decpkg:${executionId}`,
    decisionTimestamp:
      overrides.decisionTimestamp ?? "2026-07-28T18:00:00.000Z",
    chairmanSpecificationVersion: "1.0",
    governingEngineeringSpecification: "ENG-0007",
    governingEngineeringSpecificationVersion: "1.0",
    implementationBaseline:
      overrides.implementationBaseline ??
      "9ae4974941bb253c8b7977a1fa18f63236e8cdb7",
    consensusPackageId,
    consensusSchemaVersion: "1.0",
    executionId,
    requestId: overrides.requestId ?? "DEC-TEST-001",
    sessionId: executionId,
    traceabilityId: overrides.traceabilityId ?? `trace:${executionId}`,
    parentConsensusReference: consensusPackageId,
    executionMetadataReference:
      overrides.executionMetadataReference ??
      `execmeta:${executionId}:cfg:test`,
    ...overrides,
  };
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
    "executiveSummary" in result ||
    "metadata" in result
  ) {
    throw new Error(
      "ChairmanFailed must not carry recommendation-shaped fields or success metadata",
    );
  }

  if (
    !result.failureTraceability ||
    result.failureTraceability.decisionAbsent !== true
  ) {
    throw new Error(
      "ChairmanFailed must include failureTraceability with decisionAbsent=true",
    );
  }
}
