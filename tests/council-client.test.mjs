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
  return {
    ok: true,
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
