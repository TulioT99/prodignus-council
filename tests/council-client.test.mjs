import assert from "node:assert/strict";
import test from "node:test";

import {
  CouncilClientError,
  fetchCouncilResult,
} from "../src/lib/council/council-client.ts";

const decision = {
  id: "DEC-TEST-001",
  title: "Test decision",
  question: "Should we proceed with the pilot?",
  context: "Context",
  constraints: "Constraints",
  createdAt: "2026-07-22T00:00:00.000Z",
  status: "under_review",
};

function createAdvisor(id) {
  return {
    persona: { id, displayName: id, model: "test-model" },
    status: "success",
    summary: "Summary",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "proceed",
    confidence: 0.8,
    durationMs: 1000,
    totalTokens: 10,
  };
}

function createSuccessfulPayload(status = "complete") {
  const sessionSeverity =
    status === "complete"
      ? "success"
      : status === "partial"
        ? "warning"
        : "error";
  const terminalReasonCode =
    status === "complete"
      ? "SESSION_COMPLETE"
      : status === "partial"
        ? "PARTIAL_ADVISOR_FAILURE"
        : "CHAIRMAN_SYNTHESIS_FAILURE";

  return {
    ok: true,
    sessionStatus: status,
    sessionSeverity,
    terminalReasonCode,
    result: {
      status,
      decision,
      advisors: [
        createAdvisor("ADV-001"),
        createAdvisor("ADV-002"),
        createAdvisor("ADV-003"),
        createAdvisor("ADV-004"),
        createAdvisor("ADV-005"),
      ],
      chairman: {
        status: "success",
        metadata: {
          schemaVersion: "1.0",
          decisionId: "decpkg:exec-test",
          decisionTimestamp: "2026-07-28T18:00:00.000Z",
          chairmanSpecificationVersion: "1.0",
          governingEngineeringSpecification: "ENG-0007",
          governingEngineeringSpecificationVersion: "1.0",
          implementationBaseline: "9ae4974941bb253c8b7977a1fa18f63236e8cdb7",
          consensusPackageId: "cp:exec-test:v1.0",
          consensusSchemaVersion: "1.0",
          executionId: "exec-test",
          requestId: "DEC-TEST-001",
          sessionId: "exec-test",
          traceabilityId: "trace:exec-test",
          parentConsensusReference: "cp:exec-test:v1.0",
          executionMetadataReference: "execmeta:exec-test:cfg:test",
        },
        recommendationType: "run_bounded_experiment",
        decisionStatement: "Run a bounded validation.",
        executiveSummary: "Validate before committing.",
        rationale: "Evidence is insufficient.",
        consensus: [],
        disagreements: [],
        structuredDisagreements: [],
        decisiveTradeoffs: [],
        assumptions: [],
        conditions: [],
        risks: [],
        unknowns: [],
        minimumAdditionalEvidence: [],
        nextActions: [],
        reversalCriteria: [],
        keyArguments: [],
        nextSteps: [],
        confidence: 0.7,
        decisionConfidence: {
          schemaVersion: "1.0",
          method: "wp05c_structural_min_v1",
          consensusConfidence: 0.72,
          evidenceConfidence: 0.7,
          reasoningConfidence: 0.7,
          recommendationConfidence: 0.7,
          notes: ["API payload Confidence Triad fixture."],
        },
        uncertainty: {
          schemaVersion: "1.0",
          material: false,
          evidenceGaps: [],
          unresolvedDisagreement: [],
          conflictingAdvisors: [],
          assumptionsMade: [],
          informationLimitations: [],
          whatIsKnown: ["Scoped pilot is preferred."],
          whatIsDisputed: [],
          whatIsMissing: [],
          howItConstrainsRecommendation: [
            "No material uncertainty indicators were detected from consensus structure and synthesis fields.",
          ],
          nextStepsToReduceUncertainty: [],
        },
        policyEvaluation: {
          schemaVersion: "1.0",
          status: "Approved",
          rulesEvaluated: [
            {
              ruleId: "DP-R01",
              ruleName: "Required decision artifacts present",
              outcome: "Pass",
              explanation: "API payload policy fixture.",
            },
          ],
          violations: [],
          evaluationTimestamp: "2026-07-28T18:00:00.000Z",
          policyVersion: "1.0",
          evaluator: "chairman-decision-policy-engine",
        },
        model: "chairman-model",
        durationMs: 1000,
        totalTokens: 20,
        decision: "test_first",
        finalRecommendation: "Run a bounded validation.",
      },
      advisorStageDurationMs: 5000,
      chairmanDurationMs: 2000,
      totalDurationMs: 7000,
      decisionContext: {},
      integrity: {
        executionId: "exec-test",
        language: "en",
      },
    },
  };
}

test("fetchCouncilResult returns parsed council result on success", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(JSON.stringify(createSuccessfulPayload("partial")), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const result = await fetchCouncilResult(decision);

  assert.equal(result.status, "partial");
  assert.equal(result.chairman.recommendationType, "run_bounded_experiment");
  assert.equal(result.advisors.length, 5);
});

test("fetchCouncilResult remains compatible when additive session fields are present", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = createSuccessfulPayload("failed");
  assert.equal(payload.ok, true);
  assert.equal(payload.sessionSeverity, "error");
  assert.equal(payload.terminalReasonCode, "CHAIRMAN_SYNTHESIS_FAILURE");

  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const result = await fetchCouncilResult(decision);
  assert.equal(result.status, "failed");
});

test("fetchCouncilResult throws retryable error on network failure", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  await assert.rejects(
    () => fetchCouncilResult(decision),
    (error) => {
      assert.ok(error instanceof CouncilClientError);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test("fetchCouncilResult throws retryable error on non-JSON response", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response("not json", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });

  await assert.rejects(
    () => fetchCouncilResult(decision),
    (error) => {
      assert.ok(error instanceof CouncilClientError);
      assert.match(error.message, /unreadable response/i);
      return true;
    },
  );
});

test("fetchCouncilResult surfaces API validation errors", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: {
          message: "Decision question is required.",
          retryable: false,
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );

  await assert.rejects(
    () => fetchCouncilResult(decision),
    (error) => {
      assert.ok(error instanceof CouncilClientError);
      assert.equal(error.message, "Decision question is required.");
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test("fetchCouncilResult rejects malformed success payloads safely", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        result: {
          status: "failed",
          decision,
          advisors: [],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

  await assert.rejects(
    () => fetchCouncilResult(decision),
    (error) => {
      assert.ok(error instanceof CouncilClientError);
      assert.match(error.message, /incomplete result/i);
      return true;
    },
  );
});
