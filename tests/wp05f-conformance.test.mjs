import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";
import {
  assertChairmanFailed,
  buildTestConsensusPackage,
  createTestDecisionConfidence,
  createTestDecisionMetadata,
  createTestDecisionUncertainty,
} from "./chairman-test-helpers.mjs";

/**
 * WP-05F Conformance Suite — CT-001 … CT-010
 * Verifies architectural contracts without introducing new Council capabilities.
 */

const sampleDecision = {
  id: "DEC-20260728-CONFORMANCE",
  title: "WP-05F Conformance",
  question: "Does the Decision Council conform to ENG-0003 through ENG-0007?",
  context: "Final WP-05 conformance evidence.",
  constraints: "No new capabilities; verify existing contracts.",
  createdAt: "2026-07-28T21:00:00.000Z",
  status: "under_review",
};

function createSuccessfulAdvisors(count = 5, order) {
  const ids = order ?? ["ADV-002", "ADV-003", "ADV-004", "ADV-005", "ADV-001"];

  return ids.slice(0, count).map((id, index) => ({
    persona: {
      id,
      displayName: `Advisor ${id}`,
      thinkingLens: "product-strategy",
      expertise: "Product Strategy",
      background: "Head of Product",
      yearsExperience: 18,
      mission: "Challenge assumptions.",
      decisionStyle: "Evaluate product fit.",
      coreBeliefs: ["Every recommendation depends on explicit assumptions."],
      model: "OpenRouter (configured model)",
    },
    source: "live",
    status: "success",
    executionId: "EXEC-CONFORM-001",
    summary: `Perspective ${index + 1}.`,
    analysis: [{ title: "Need", description: "Scoped decision." }],
    assumptions: ["Assumptions are explicit."],
    risks: ["Residual risk remains."],
    recommendation: "proceed_with_conditions",
    confidence: 0.8,
    durationMs: 100,
    totalTokens: 200,
  }));
}

test("CT-001: advisor contracts produce serializable structured results", async () => {
  const advisors = createSuccessfulAdvisors(5);

  for (const advisor of advisors) {
    assert.equal(advisor.status, "success");
    assert.ok(advisor.persona.id);
    assert.ok(typeof advisor.summary === "string");
    assert.ok(Array.isArray(advisor.analysis));
    assert.ok(typeof advisor.recommendation === "string");
    assert.ok(Number.isFinite(advisor.confidence));
    const serialized = JSON.stringify(advisor);
    assert.ok(serialized.length > 0);
    assert.deepEqual(JSON.parse(serialized).persona.id, advisor.persona.id);
  }
});

test("CT-002: consensus engine is deterministic under advisor order permutation (M-01)", async () => {
  const orderA = ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"];
  const orderB = ["ADV-005", "ADV-004", "ADV-003", "ADV-002", "ADV-001"];
  const advisorsA = createSuccessfulAdvisors(5, orderA);
  const byId = new Map(advisorsA.map((a) => [a.persona.id, a]));
  const advisorsB = orderB.map((id) => {
    const match = byId.get(id);
    return {
      ...match,
      persona: { ...match.persona },
    };
  });

  const consensusA = await buildTestConsensusPackage({
    executionId: "EXEC-CONFORM-001",
    advisors: advisorsA,
    expectedAdvisorIds: orderA,
  });
  const consensusB = await buildTestConsensusPackage({
    executionId: "EXEC-CONFORM-001",
    advisors: advisorsB,
    expectedAdvisorIds: orderA,
  });

  assert.equal(consensusA.schemaVersion, consensusB.schemaVersion);
  assert.equal(consensusA.status, consensusB.status);
  assert.equal(consensusA.confidence.overall, consensusB.confidence.overall);
  assert.equal(
    consensusA.metadata.dominantRecommendation,
    consensusB.metadata.dominantRecommendation,
  );
  assert.deepEqual(
    consensusA.participatingAdvisors
      .map((p) => p.advisorId)
      .slice()
      .sort(),
    consensusB.participatingAdvisors
      .map((p) => p.advisorId)
      .slice()
      .sort(),
  );
  assert.deepEqual(
    consensusA.agreementMap.map((entry) => ({
      kind: entry.kind,
      position: entry.position,
      advisorIds: [...entry.advisorIds].sort(),
    })),
    consensusB.agreementMap.map((entry) => ({
      kind: entry.kind,
      position: entry.position,
      advisorIds: [...entry.advisorIds].sort(),
    })),
  );
});

test("CT-003: Chairman contract rejects missing Consensus Package", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONFORM-001",
  });

  const result = await runChairman(decisionContext, advisors, {
    consensus: undefined,
  });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "MISSING_CONSENSUS_PACKAGE");
  assert.equal(result.failureReport.failureCategory, "FM-003");
});

test("CT-004: Decision Metadata package carries required ENG-0007 fields", () => {
  const metadata = createTestDecisionMetadata({
    executionId: "EXEC-CONFORM-001",
    requestId: sampleDecision.id,
  });

  assert.equal(metadata.schemaVersion, "1.0");
  assert.equal(metadata.governingEngineeringSpecification, "ENG-0007");
  assert.ok(metadata.decisionId);
  assert.ok(metadata.decisionTimestamp);
  assert.ok(metadata.implementationBaseline);
  assert.ok(metadata.consensusPackageId);
  assert.ok(metadata.traceabilityId);
  assert.ok(metadata.parentConsensusReference);
  assert.ok(metadata.executionMetadataReference);
});

test("CT-005: Confidence Triad and Uncertainty are deterministic fixtures", () => {
  const decisionConfidence = createTestDecisionConfidence({
    consensusConfidence: 0.72,
    evidenceConfidence: 0.7,
    reasoningConfidence: 0.65,
    recommendationConfidence: 0.65,
  });
  const uncertainty = createTestDecisionUncertainty({ material: false });

  assert.equal(decisionConfidence.method, "wp05c_structural_min_v1");
  assert.equal(decisionConfidence.schemaVersion, "1.0");
  assert.ok(
    decisionConfidence.recommendationConfidence <=
      decisionConfidence.evidenceConfidence + 1e-9,
  );
  assert.equal(uncertainty.schemaVersion, "1.0");
  assert.equal(typeof uncertainty.material, "boolean");
});

test("CT-006: Policy Engine yields Approved / EscalationRequired / Rejected", async () => {
  const { evaluateDecisionPolicy, INITIAL_DECISION_POLICY_RULES } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const advisors = createSuccessfulAdvisors(5);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONFORM-001",
    advisors,
  });
  const metadata = createTestDecisionMetadata({
    executionId: "EXEC-CONFORM-001",
    requestId: sampleDecision.id,
    consensusPackageId: `cp:EXEC-CONFORM-001:v${consensus.schemaVersion}`,
    parentConsensusReference: `cp:EXEC-CONFORM-001:v${consensus.schemaVersion}`,
  });
  const decisionConfidence = createTestDecisionConfidence({
    consensusConfidence: Math.round(consensus.confidence.overall * 1000) / 1000,
    evidenceConfidence: 0.7,
    reasoningConfidence: 0.65,
    recommendationConfidence: 0.65,
  });
  const uncertainty = createTestDecisionUncertainty({ material: false });

  const approved = evaluateDecisionPolicy({
    candidate: {
      metadata,
      decisionConfidence,
      uncertainty,
      consensus,
      publishedConfidenceAlias: decisionConfidence.recommendationConfidence,
      priorValidationFailed: false,
      candidateKind: "success_candidate",
    },
    clock: { now: () => "2026-07-28T21:00:00.000Z" },
    rules: INITIAL_DECISION_POLICY_RULES,
  });
  assert.equal(approved.status, "Approved");

  const escalated = evaluateDecisionPolicy({
    candidate: {
      metadata,
      decisionConfidence,
      uncertainty,
      consensus,
      publishedConfidenceAlias: decisionConfidence.recommendationConfidence,
      priorValidationFailed: false,
      candidateKind: "success_candidate",
      reducedConfidenceSynthesis: true,
    },
    clock: { now: () => "2026-07-28T21:00:00.000Z" },
    rules: INITIAL_DECISION_POLICY_RULES,
  });
  assert.equal(escalated.status, "EscalationRequired");

  const rejected = evaluateDecisionPolicy({
    candidate: {
      metadata: null,
      decisionConfidence,
      uncertainty,
      consensus,
      publishedConfidenceAlias: decisionConfidence.recommendationConfidence,
      priorValidationFailed: false,
      candidateKind: "success_candidate",
    },
    clock: { now: () => "2026-07-28T21:00:00.000Z" },
    rules: INITIAL_DECISION_POLICY_RULES,
  });
  assert.equal(rejected.status, "Rejected");
});

test("CT-007: Failure Model defines FM-001..FM-008 with publication blocking", async () => {
  const {
    FAILURE_RECOVERY_POLICIES,
    buildDecisionFailureReport,
    evaluatePublicationGate,
  } = await import("../src/lib/council/failure-manager.ts");

  for (const category of [
    "FM-001",
    "FM-002",
    "FM-003",
    "FM-004",
    "FM-005",
    "FM-006",
    "FM-007",
    "FM-008",
  ]) {
    assert.equal(
      FAILURE_RECOVERY_POLICIES[category].publicationEligible,
      false,
    );
  }

  const report = buildDecisionFailureReport({
    executionId: "EXEC-CONFORM-001",
    failureReasonCode: "INVALID_MODEL_OUTPUT",
    message: "Schema invalid after recovery.",
    recoveryAttempted: true,
    recoverySucceeded: false,
    retryCount: 1,
    clock: { now: () => "2026-07-28T21:00:00.000Z" },
  });

  assert.equal(report.failureCategory, "FM-004");
  assert.equal(report.publicationAllowed, false);
  assert.equal(
    evaluatePublicationGate({
      kind: "failure_candidate",
      failureReport: report,
    }).publicationAllowed,
    false,
  );
});

test("CT-008: publication contract serializes success and blocks empty artifacts", async () => {
  const { evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const allowed = evaluatePublicationGate({
    kind: "success_candidate",
    executionId: "EXEC-CONFORM-001",
    hasMetadata: true,
    hasConfidence: true,
    hasUncertainty: true,
    hasPolicyEvaluation: true,
    policyStatus: "Approved",
  });
  assert.equal(allowed.publicationAllowed, true);

  const serialized = evaluatePublicationGate({
    kind: "publication_artifact",
    executionId: "EXEC-CONFORM-001",
    serialize: () => JSON.stringify({ ok: true, decisionId: "decpkg:1" }),
  });
  assert.equal(serialized.publicationAllowed, true);

  const blocked = evaluatePublicationGate({
    kind: "publication_artifact",
    executionId: "EXEC-CONFORM-001",
    serialize: () => "null",
  });
  assert.equal(blocked.publicationAllowed, false);
  assert.equal(blocked.failureCategory, "FM-008");
});

test("CT-009: end-to-end Chairman pipeline publishes success with all gates", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    createOpenRouterChairmanResponse(validChairmanPayload);

  try {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL_CHAIRMAN = "test/chairman";

    const { createDecisionContext } =
      await import("../src/lib/council/decision-context.ts");
    const { runChairman } =
      await import("../src/lib/council/chairman-runner.ts");
    const advisors = createSuccessfulAdvisors(5);
    const decisionContext = createDecisionContext(sampleDecision, {
      executionId: "EXEC-CONFORM-001",
    });
    const consensus = await buildTestConsensusPackage({
      executionId: "EXEC-CONFORM-001",
      advisors,
    });

    const result = await runChairman(decisionContext, advisors, { consensus });

    assert.equal(result.status, "success");
    assert.ok(result.metadata);
    assert.ok(result.decisionConfidence);
    assert.ok(result.uncertainty);
    assert.ok(result.policyEvaluation);
    assert.ok(
      ["Approved", "EscalationRequired"].includes(
        result.policyEvaluation.status,
      ),
    );
    assert.equal("failureReport" in result, false);
    assert.ok(JSON.stringify(result).length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CT-010: regression surface — WP-05 modules remain loadable and export gates", async () => {
  const contract = await import("../src/lib/council/chairman-contract.ts");
  const metadata =
    await import("../src/lib/council/chairman-decision-metadata.ts");
  const confidence =
    await import("../src/lib/council/chairman-decision-confidence.ts");
  const policy = await import("../src/lib/council/chairman-decision-policy.ts");
  const failure = await import("../src/lib/council/failure-manager.ts");
  const consensus = await import("../src/lib/council/consensus/engine.ts");

  assert.equal(typeof contract.validateChairmanExecutionContract, "function");
  assert.equal(typeof metadata.buildDecisionMetadata, "function");
  assert.equal(typeof confidence.buildDecisionConfidence, "function");
  assert.equal(typeof policy.runDecisionPolicyGate, "function");
  assert.equal(typeof failure.evaluatePublicationGate, "function");
  assert.equal(typeof consensus.buildConsensusPackage, "function");
});

test("WP-05F: DecisionCouncilConformanceReport is machine-readable and PASS WITH OBSERVATIONS", async () => {
  const {
    CONFORMANCE_DOMAINS,
    buildDecisionCouncilConformanceReport,
    validateConformanceReport,
  } = await import("../tools/decision-council-conformance/index.ts");

  const domains = CONFORMANCE_DOMAINS.map((domain) => ({
    domainId: domain.domainId,
    name: domain.name,
    status: "PASS",
    evidence: [`tests/wp05f-conformance.test.mjs:${domain.domainId}`],
  }));

  const report = buildDecisionCouncilConformanceReport({
    implementationVersion: "wp-05f-candidate",
    domains,
    testSummary: {
      totalTests: 10,
      passed: 10,
      failed: 0,
      newConformanceTests: 11,
      regressionStatus: "PASS",
    },
    observations: [
      "O-01: Informal prompt Decision policy wording remains informational only.",
      "O-02: Client runtime schema validation remains deferred.",
      "O-03: Policy version discipline remains process-governed.",
    ],
    knownLimitations: [
      "PKOS retrieval remains soft-fail for incomplete evidence packages.",
      "Full production provider latency SLOs are out of band for WP-05F.",
    ],
    generatedAt: "2026-07-28T21:00:00.000Z",
  });

  assert.deepEqual(validateConformanceReport(report), { ok: true });
  assert.equal(report.conformanceStatus, "PASS WITH OBSERVATIONS");
  assert.equal(report.specificationsVerified.length, 5);
  assert.ok(report.workPackagesVerified.includes("WP-05F"));
  assert.equal(report.traceabilityMatrix.length, 5);
  assert.ok(
    report.traceabilityMatrix.every(
      (row) => row.implementationPresent && row.testSuitePresent,
    ),
  );

  const serialized = JSON.stringify(report);
  assert.ok(serialized.includes("Decision Council v1.0-candidate"));
  assert.equal(JSON.parse(serialized).evaluator, report.evaluator);
});
