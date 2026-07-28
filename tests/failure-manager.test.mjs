import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

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

const sampleDecision = {
  id: "DEC-20260728-FAILURE",
  title: "Failure Model enforcement",
  question:
    "Should Prodignus enforce a deterministic Failure Model before publication?",
  context: "WP-05E operational resilience requirements.",
  constraints: "No changes to reasoning or policy algorithms.",
  createdAt: "2026-07-28T12:00:00.000Z",
  status: "under_review",
};

function createSuccessfulAdvisors(count = 5) {
  const ids = ["ADV-002", "ADV-003", "ADV-004", "ADV-005", "ADV-001"];

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
    executionId: "EXEC-FAILURE-001",
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

async function withConsensus(advisors, executionId = "EXEC-FAILURE-001") {
  return buildTestConsensusPackage({ executionId, advisors });
}

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL_CHAIRMAN: process.env.OPENROUTER_MODEL_CHAIRMAN,
  };

  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL_CHAIRMAN = "test/chairman";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_MODEL_CHAIRMAN = originalEnv.OPENROUTER_MODEL_CHAIRMAN;
  mock.restoreAll();
});

test("FM taxonomy covers FM-001 through FM-008 with deterministic recovery", async () => {
  const {
    FAILURE_RECOVERY_POLICIES,
    classifyFailureFromReasonCode,
    getRecoveryPolicy,
  } = await import("../src/lib/council/failure-manager.ts");

  const categories = [
    "FM-001",
    "FM-002",
    "FM-003",
    "FM-004",
    "FM-005",
    "FM-006",
    "FM-007",
    "FM-008",
  ];

  for (const category of categories) {
    const policy = getRecoveryPolicy(category);
    assert.equal(policy.category, category);
    assert.equal(policy.publicationEligible, false);
    assert.ok(policy.maxAttempts >= 1);
    assert.equal(FAILURE_RECOVERY_POLICIES[category].category, category);
  }

  assert.equal(
    classifyFailureFromReasonCode("PROVIDER_ERROR").category,
    "FM-001",
  );
  assert.equal(
    classifyFailureFromReasonCode("INSUFFICIENT_COUNCIL").category,
    "FM-003",
  );
  assert.equal(
    classifyFailureFromReasonCode("INVALID_MODEL_OUTPUT").category,
    "FM-004",
  );
  assert.equal(
    classifyFailureFromReasonCode("INVALID_DECISION_METADATA").category,
    "FM-005",
  );
  assert.equal(
    classifyFailureFromReasonCode("INVALID_DECISION_CONFIDENCE").category,
    "FM-006",
  );
  assert.equal(
    classifyFailureFromReasonCode("DECISION_POLICY_REJECTED").category,
    "FM-007",
  );
  assert.equal(
    classifyFailureFromReasonCode("INTERNAL_ERROR").category,
    "FM-008",
  );
});

test("DecisionFailureReport is deterministic and publication-blocked", async () => {
  const { buildDecisionFailureReport, validateDecisionFailureReport } =
    await import("../src/lib/council/failure-manager.ts");

  const report = buildDecisionFailureReport({
    executionId: "EXEC-FAILURE-001",
    failureReasonCode: "PROVIDER_ERROR",
    message: "Provider timeout after retries.",
    recoveryAttempted: true,
    recoverySucceeded: false,
    retryCount: 2,
    recoveryActions: ["retry:FM-001:attempt_1_of_3"],
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
    relatedMetadata: {
      failureId: "chfail:EXEC-FAILURE-001",
      requestId: "DEC-20260728-FAILURE",
    },
  });

  assert.equal(report.schemaVersion, "1.0");
  assert.equal(report.failureCategory, "FM-001");
  assert.equal(report.publicationAllowed, false);
  assert.equal(report.recoveryAttempted, true);
  assert.equal(report.recoverySucceeded, false);
  assert.equal(report.retryCount, 2);
  assert.equal(report.timestamp, "2026-07-28T20:00:00.000Z");
  assert.equal(report.relatedMetadata.governingSpecification, "ENG-0007");
  assert.deepEqual(validateDecisionFailureReport(report), { ok: true });
  assert.equal(validateDecisionFailureReport(null).ok, false);
});

test("FM-002 advisor failure classification isolates without fabricating data", async () => {
  const { classifyAdvisorFailure } =
    await import("../src/lib/council/failure-manager.ts");

  const report = classifyAdvisorFailure({
    executionId: "EXEC-FAILURE-001",
    advisorId: "ADV-002",
    message: "Malformed advisor JSON.",
    retryCount: 1,
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
  });

  assert.equal(report.failureCategory, "FM-002");
  assert.equal(report.severity, "WARNING");
  assert.equal(report.component, "advisor:ADV-002");
  assert.equal(report.publicationAllowed, false);
  assert.equal(report.diagnostics.terminalStatus, "isolated");
});

test("publication gate blocks failure candidates and missing artifacts", async () => {
  const { buildDecisionFailureReport, evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const failureReport = buildDecisionFailureReport({
    executionId: "EXEC-FAILURE-001",
    failureReasonCode: "INVALID_DECISION_METADATA",
    message: "Metadata missing.",
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
  });

  const blocked = evaluatePublicationGate({
    kind: "failure_candidate",
    failureReport,
  });
  assert.equal(blocked.publicationAllowed, false);
  assert.equal(blocked.failureCategory, "FM-005");

  const missing = evaluatePublicationGate({
    kind: "success_candidate",
    executionId: "EXEC-FAILURE-001",
    hasMetadata: false,
    hasConfidence: true,
    hasUncertainty: true,
    hasPolicyEvaluation: true,
    policyStatus: "Approved",
  });
  assert.equal(missing.publicationAllowed, false);
  assert.equal(missing.failureCategory, "FM-005");

  const rejected = evaluatePublicationGate({
    kind: "success_candidate",
    executionId: "EXEC-FAILURE-001",
    hasMetadata: true,
    hasConfidence: true,
    hasUncertainty: true,
    hasPolicyEvaluation: true,
    policyStatus: "Rejected",
  });
  assert.equal(rejected.publicationAllowed, false);
  assert.equal(rejected.failureCategory, "FM-007");

  const allowed = evaluatePublicationGate({
    kind: "success_candidate",
    executionId: "EXEC-FAILURE-001",
    hasMetadata: true,
    hasConfidence: true,
    hasUncertainty: true,
    hasPolicyEvaluation: true,
    policyStatus: "Approved",
  });
  assert.equal(allowed.publicationAllowed, true);
});

test("FM-008 publication serialization failure blocks publication", async () => {
  const { evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const decision = evaluatePublicationGate({
    kind: "publication_artifact",
    executionId: "EXEC-FAILURE-001",
    serialize: () => {
      throw new Error("artifact persistence failed");
    },
  });

  assert.equal(decision.publicationAllowed, false);
  assert.equal(decision.failureCategory, "FM-008");
  assert.match(decision.reason, /persistence failed/i);
});

test("bounded recovery succeeds after transient failure", async () => {
  const { runWithBoundedRecovery } =
    await import("../src/lib/council/failure-manager.ts");

  let calls = 0;
  const result = await runWithBoundedRecovery("FM-004", async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error("schema invalid");
    }
    return "ok";
  });

  assert.equal(result.ok, true);
  assert.equal(result.value, "ok");
  assert.equal(result.attempts, 2);
  assert.equal(result.recoveryAttempted, true);
  assert.equal(result.recoverySucceeded, true);
  assert.equal(calls, 2);
});

test("bounded recovery exhausts deterministically", async () => {
  const { runWithBoundedRecovery, getRecoveryPolicy } =
    await import("../src/lib/council/failure-manager.ts");

  const maxAttempts = getRecoveryPolicy("FM-004").maxAttempts;
  let calls = 0;
  const result = await runWithBoundedRecovery("FM-004", async () => {
    calls += 1;
    throw new Error("still invalid");
  });

  assert.equal(result.ok, false);
  assert.equal(result.recoverySucceeded, false);
  assert.equal(result.recoveryAttempted, true);
  assert.equal(calls, maxAttempts);
  assert.equal(result.attempts, maxAttempts);
});

test("FM-001 provider timeout yields structured ChairmanFailed report", async () => {
  globalThis.fetch = mock.fn(async () => {
    return new Response(JSON.stringify({ error: { message: "timeout" } }), {
      status: 408,
      headers: { "Content-Type": "application/json" },
    });
  });

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "PROVIDER_ERROR");
  assert.equal(result.failureReport.failureCategory, "FM-001");
  assert.equal(result.failureReport.publicationAllowed, false);
});

test("FM-003 insufficient advisors yields consensus-class failure report", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(2);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INSUFFICIENT_COUNCIL");
  assert.equal(result.failureReport.failureCategory, "FM-003");
  assert.equal(result.failureReport.severity, "CRITICAL");
});

test("FM-004 invalid Chairman JSON retries then fails with report", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse({ invalid: true }),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const { getRecoveryPolicy } =
    await import("../src/lib/council/failure-manager.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INVALID_MODEL_OUTPUT");
  assert.equal(result.failureReport.failureCategory, "FM-004");
  assert.equal(result.failureReport.recoveryAttempted, true);
  assert.equal(result.failureReport.recoverySucceeded, false);
  assert.equal(
    globalThis.fetch.mock.callCount(),
    getRecoveryPolicy("FM-004").maxAttempts,
  );
});

test("FM-004 schema recovery succeeds on second attempt", async () => {
  let calls = 0;
  globalThis.fetch = mock.fn(async () => {
    calls += 1;
    if (calls === 1) {
      return createOpenRouterChairmanResponse({ invalid: true });
    }
    return createOpenRouterChairmanResponse(validChairmanPayload);
  });

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assert.equal(result.status, "success");
  assert.equal(calls, 2);
  assert.ok(result.policyEvaluation);
  assert.equal("failureReport" in result, false);
});

test("FM-004 invalid Chairman contract yields structured failure", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(
    { ...sampleDecision, question: "   " },
    { executionId: "EXEC-FAILURE-001" },
  );
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INVALID_CHAIRMAN_CONTRACT");
  assert.equal(result.failureReport.failureCategory, "FM-004");
});

test("FM-005 metadata failure classification and publication block", async () => {
  const { buildDecisionFailureReport, evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const report = buildDecisionFailureReport({
    executionId: "EXEC-FAILURE-001",
    failureReasonCode: "INVALID_DECISION_METADATA",
    message: "Forced metadata validation failure.",
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
  });

  assert.equal(report.failureCategory, "FM-005");
  assert.equal(report.severity, "FATAL");
  assert.equal(
    evaluatePublicationGate({
      kind: "failure_candidate",
      failureReport: report,
    }).publicationAllowed,
    false,
  );
});

test("FM-006 confidence failure classification and publication block", async () => {
  const { buildDecisionFailureReport, evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const report = buildDecisionFailureReport({
    executionId: "EXEC-FAILURE-001",
    failureReasonCode: "INVALID_DECISION_CONFIDENCE",
    message: "Forced confidence validation failure.",
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
  });

  assert.equal(report.failureCategory, "FM-006");
  assert.equal(report.severity, "FATAL");
  assert.equal(
    evaluatePublicationGate({
      kind: "failure_candidate",
      failureReport: report,
    }).publicationAllowed,
    false,
  );
});

test("FM-007 policy rejection classification and publication block", async () => {
  const { buildDecisionFailureReport, evaluatePublicationGate } =
    await import("../src/lib/council/failure-manager.ts");

  const report = buildDecisionFailureReport({
    executionId: "EXEC-FAILURE-001",
    failureReasonCode: "DECISION_POLICY_REJECTED",
    message: "Forced policy rejection.",
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
  });

  assert.equal(report.failureCategory, "FM-007");
  assert.equal(report.severity, "CRITICAL");
  assert.equal(
    evaluatePublicationGate({
      kind: "failure_candidate",
      failureReport: report,
    }).publicationAllowed,
    false,
  );
});

test("successful execution remains backward compatible and passes failure gate", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });
  const consensus = await withConsensus(advisors);
  const result = await runChairman(decisionContext, advisors, { consensus });

  assert.equal(result.status, "success");
  assert.ok(result.metadata);
  assert.ok(result.decisionConfidence);
  assert.ok(result.uncertainty);
  assert.ok(result.policyEvaluation);
  assert.equal("failureReport" in result, false);
  assert.equal(
    "outcome" in result && result.outcome === "ChairmanFailed",
    false,
  );
});

test("missing advisor consensus package maps to FM-003", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-FAILURE-001",
  });

  const result = await runChairman(decisionContext, advisors, {
    consensus: undefined,
  });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "MISSING_CONSENSUS_PACKAGE");
  assert.equal(result.failureReport.failureCategory, "FM-003");
});

test("fixture helpers remain available for policy/confidence gates", () => {
  const metadata = createTestDecisionMetadata({
    executionId: "EXEC-FAILURE-001",
  });
  const confidence = createTestDecisionConfidence();
  const uncertainty = createTestDecisionUncertainty();

  assert.equal(metadata.governingEngineeringSpecification, "ENG-0007");
  assert.equal(confidence.method, "wp05c_structural_min_v1");
  assert.equal(uncertainty.schemaVersion, "1.0");
});
