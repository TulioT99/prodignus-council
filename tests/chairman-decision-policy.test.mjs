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
  id: "DEC-20260728-POLICY",
  title: "Decision Policy enforcement",
  question:
    "Should Prodignus enforce Decision Policy before Chairman publication?",
  context: "WP-05D governance requirements.",
  constraints: "Deterministic policy only; no prompt-embedded rules.",
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
    executionId: "EXEC-POLICY-001",
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

async function buildApprovedCandidate(overrides = {}) {
  const advisors = createSuccessfulAdvisors(5);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-POLICY-001",
    advisors,
  });
  const metadata = createTestDecisionMetadata({
    executionId: "EXEC-POLICY-001",
    requestId: sampleDecision.id,
    consensusPackageId: `cp:EXEC-POLICY-001:v${consensus.schemaVersion}`,
    parentConsensusReference: `cp:EXEC-POLICY-001:v${consensus.schemaVersion}`,
  });
  const decisionConfidence = createTestDecisionConfidence({
    consensusConfidence: Math.round(consensus.confidence.overall * 1000) / 1000,
    evidenceConfidence: 0.7,
    reasoningConfidence: 0.65,
    recommendationConfidence: 0.65,
  });
  const uncertainty = createTestDecisionUncertainty({ material: false });

  return {
    metadata: "metadata" in overrides ? overrides.metadata : metadata,
    decisionConfidence:
      "decisionConfidence" in overrides
        ? overrides.decisionConfidence
        : decisionConfidence,
    uncertainty:
      "uncertainty" in overrides ? overrides.uncertainty : uncertainty,
    consensus: "consensus" in overrides ? overrides.consensus : consensus,
    publishedConfidenceAlias:
      "publishedConfidenceAlias" in overrides
        ? overrides.publishedConfidenceAlias
        : decisionConfidence.recommendationConfidence,
    priorValidationFailed:
      "priorValidationFailed" in overrides
        ? overrides.priorValidationFailed
        : false,
    candidateKind:
      "candidateKind" in overrides
        ? overrides.candidateKind
        : "success_candidate",
    reducedConfidenceSynthesis:
      "reducedConfidenceSynthesis" in overrides
        ? overrides.reducedConfidenceSynthesis
        : false,
  };
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

test("evaluateDecisionPolicy approves a complete success candidate", async () => {
  const { evaluateDecisionPolicy, DECISION_POLICY_EVALUATOR } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate();
  const result = evaluateDecisionPolicy({
    candidate,
    clock: { now: () => "2026-07-28T20:10:00.000Z" },
  });

  assert.equal(result.status, "Approved");
  assert.equal(result.evaluator, DECISION_POLICY_EVALUATOR);
  assert.equal(result.evaluationTimestamp, "2026-07-28T20:10:00.000Z");
  assert.equal(result.violations.length, 0);
  assert.ok(result.rulesEvaluated.length >= 6);
  assert.ok(result.rulesEvaluated.every((rule) => rule.outcome === "Pass"));
});

test("DP-R01 rejects missing metadata/confidence/uncertainty", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({ metadata: null });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.rulesEvaluated.some((rule) => rule.ruleId === "DP-R01"));
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R01"));
});

test("DP-R02 rejects recommendation confidence above evidence confidence", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const base = await buildApprovedCandidate();
  const candidate = await buildApprovedCandidate({
    decisionConfidence: createTestDecisionConfidence({
      consensusConfidence: base.decisionConfidence.consensusConfidence,
      evidenceConfidence: 0.5,
      reasoningConfidence: 0.5,
      recommendationConfidence: 0.8,
    }),
    publishedConfidenceAlias: 0.8,
  });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R02"));
});

test("DP-R03 rejects missing Consensus Package reference", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({ consensus: null });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R03"));
});

test("DP-R04 rejects when prior mandatory validation failed", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({
    priorValidationFailed: true,
  });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R04"));
});

test("DP-R05 rejects failure-shaped candidates", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({
    candidateKind: "failure_candidate",
  });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R05"));
});

test("DP-R06 rejects inconsistent confidence alias", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({
    publishedConfidenceAlias: 0.99,
  });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "Rejected");
  assert.ok(result.violations.some((item) => item.ruleId === "DP-R06"));
});

test("DP-R07 requires escalation for reduced-confidence synthesis", async () => {
  const { evaluateDecisionPolicy } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const candidate = await buildApprovedCandidate({
    reducedConfidenceSynthesis: true,
  });
  const result = evaluateDecisionPolicy({ candidate });

  assert.equal(result.status, "EscalationRequired");
  assert.ok(
    result.rulesEvaluated.some(
      (rule) =>
        rule.ruleId === "DP-R07" && rule.outcome === "EscalationRequired",
    ),
  );
  assert.ok(result.violations.some((item) => item.severity === "escalation"));
});

test("runDecisionPolicyGate blocks Rejected and allows EscalationRequired", async () => {
  const { runDecisionPolicyGate } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const approved = runDecisionPolicyGate({
    candidate: await buildApprovedCandidate(),
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.policyEvaluation.status, "Approved");

  const escalated = runDecisionPolicyGate({
    candidate: await buildApprovedCandidate({
      reducedConfidenceSynthesis: true,
    }),
  });
  assert.equal(escalated.ok, true);
  assert.equal(escalated.policyEvaluation.status, "EscalationRequired");

  const rejected = runDecisionPolicyGate({
    candidate: await buildApprovedCandidate({ metadata: null }),
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.policyEvaluation.status, "Rejected");
});

test("DecisionPolicyResult survives JSON round-trip", async () => {
  const { evaluateDecisionPolicy, validateDecisionPolicyResult } =
    await import("../src/lib/council/chairman-decision-policy.ts");

  const built = evaluateDecisionPolicy({
    candidate: await buildApprovedCandidate(),
    clock: { now: () => "2026-07-28T20:11:00.000Z" },
  });
  const revived = JSON.parse(JSON.stringify(built));

  assert.equal(revived.evaluator, "chairman-decision-policy-engine");
  assert.equal(revived.status, "Approved");
  assert.ok(Array.isArray(revived.rulesEvaluated));

  const validation = validateDecisionPolicyResult(revived);
  assert.equal(validation.ok, true);
});

test("successful Chairman publication includes Policy Evaluation", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-POLICY-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-POLICY-001",
    advisors,
  });
  const result = await runChairman(decisionContext, advisors, { consensus });

  assert.equal(result.status, "success");
  assert.ok(result.policyEvaluation);
  assert.ok(
    result.policyEvaluation.status === "Approved" ||
      result.policyEvaluation.status === "EscalationRequired",
  );
  assert.equal(
    result.policyEvaluation.evaluator,
    "chairman-decision-policy-engine",
  );
  assert.ok(result.decisionConfidence);
  assert.ok(result.metadata);
});

test("ChairmanFailed remains recommendation-free when policy rejects", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(2);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-POLICY-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-POLICY-001",
    advisors,
    minimumEligibleAdvisors: 2,
  });
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INSUFFICIENT_COUNCIL");
});
