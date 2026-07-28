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
  createTestDecisionUncertainty,
} from "./chairman-test-helpers.mjs";

const sampleDecision = {
  id: "DEC-20260728-CONF",
  title: "Confidence triad enforcement",
  question:
    "Should Prodignus publish Confidence Triad with every Chairman success?",
  context: "WP-05C transparency requirements.",
  constraints: "Do not invent confidence on failures.",
  createdAt: "2026-07-28T12:00:00.000Z",
  status: "under_review",
};

function createSuccessfulAdvisors(count = 3) {
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
    executionId: "EXEC-CONF-001",
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

function createContentStub(overrides = {}) {
  return {
    consensus: ["Scoped pilots reduce irreversible harm."],
    disagreements: [
      {
        topic: "Rollout pace",
        positions: ["Faster", "Slower"],
        resolution: "Bound the pilot.",
      },
    ],
    assumptions: ["Instrumentation detects early failure."],
    unknowns: ["Peak device performance under load."],
    keyArguments: ["Citizen safety outweighs speed."],
    minimumAdditionalEvidence: [
      {
        evidence: "Pilot completion rates",
        whyNeeded: "Confirm transferability",
      },
    ],
    nextActions: [
      {
        action: "Instrument the pilot",
        sequence: 1,
        expectedOutcome: "Early failure signals",
      },
    ],
    ...overrides,
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

test("buildDecisionConfidence produces triad within [0,1] and derives recommendation", async () => {
  const { buildDecisionConfidence, DECISION_CONFIDENCE_METHOD } =
    await import("../src/lib/council/chairman-decision-confidence.ts");

  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONF-001",
    advisors,
  });

  const { decisionConfidence, uncertainty } = buildDecisionConfidence({
    consensus,
    chairmanNumericConfidence: 0.95,
    content: createContentStub(),
    advisors,
  });

  assert.equal(decisionConfidence.schemaVersion, "1.0");
  assert.equal(decisionConfidence.method, DECISION_CONFIDENCE_METHOD);
  assert.equal(
    decisionConfidence.consensusConfidence,
    Math.round(consensus.confidence.overall * 1000) / 1000,
  );

  for (const key of [
    "consensusConfidence",
    "evidenceConfidence",
    "reasoningConfidence",
    "recommendationConfidence",
  ]) {
    const value = decisionConfidence[key];
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0 && value <= 1, `${key}=${value}`);
  }

  assert.ok(
    decisionConfidence.reasoningConfidence <=
      decisionConfidence.evidenceConfidence + 1e-6,
  );
  assert.ok(
    decisionConfidence.recommendationConfidence <=
      Math.min(
        decisionConfidence.evidenceConfidence,
        decisionConfidence.reasoningConfidence,
      ) +
        1e-6,
  );
  assert.ok(
    decisionConfidence.reasoningConfidence <= 0.95 + 1e-6,
    "reasoning must not invent certainty above chairman signal after capping",
  );
  assert.equal(typeof uncertainty.material, "boolean");
  assert.ok(Array.isArray(uncertainty.evidenceGaps));
});

test("uncertainty surfaces evidence gaps, conflicts, and missing evidence", async () => {
  const { buildDecisionUncertainty } =
    await import("../src/lib/council/chairman-decision-confidence.ts");

  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONF-001",
    advisors,
  });

  const uncertainty = buildDecisionUncertainty({
    consensus,
    chairmanNumericConfidence: 0.7,
    content: createContentStub({
      unknowns: ["Missing peak-load evidence"],
      assumptions: ["Assumed early detection works"],
      minimumAdditionalEvidence: [
        {
          evidence: "Device telemetry under peak load",
          whyNeeded: "Close evidence gap",
        },
      ],
      disagreements: [
        {
          topic: "Whether open-ended entry is safe",
          positions: ["Yes with guards", "No"],
          resolution: "Keep journeys bounded.",
        },
      ],
    }),
    advisors,
    missingPerspectives: ["ADV-005"],
    reducedConfidenceSynthesis: true,
  });

  assert.equal(uncertainty.material, true);
  assert.ok(
    uncertainty.evidenceGaps.some((item) =>
      /telemetry|completion|open question|gap/i.test(item),
    ) || uncertainty.evidenceGaps.length > 0,
  );
  assert.ok(uncertainty.unresolvedDisagreement.length > 0);
  assert.ok(
    uncertainty.assumptionsMade.includes("Assumed early detection works"),
  );
  assert.ok(
    uncertainty.informationLimitations.some((item) =>
      /ADV-005|Missing peak-load|Reduced-confidence/i.test(item),
    ),
  );
  assert.ok(uncertainty.whatIsMissing.length > 0);
  assert.ok(uncertainty.howItConstrainsRecommendation.length > 0);
});

test("validateDecisionConfidence rejects invalid ranges and impossible combinations", async () => {
  const { validateDecisionConfidence } =
    await import("../src/lib/council/chairman-decision-confidence.ts");

  const base = createTestDecisionConfidence({
    consensusConfidence: 0.7,
    evidenceConfidence: 0.7,
    reasoningConfidence: 0.6,
    recommendationConfidence: 0.6,
  });
  const uncertainty = createTestDecisionUncertainty({ material: false });

  assert.equal(validateDecisionConfidence(base, uncertainty, 0.7).ok, true);

  assert.equal(validateDecisionConfidence(null, uncertainty, 0.7).ok, false);
  assert.equal(validateDecisionConfidence(base, null, 0.7).ok, false);

  assert.match(
    validateDecisionConfidence(
      { ...base, evidenceConfidence: 1.5 },
      uncertainty,
      0.7,
    ).message,
    /evidenceConfidence/,
  );

  assert.match(
    validateDecisionConfidence(
      {
        ...base,
        evidenceConfidence: 0.5,
        reasoningConfidence: 0.9,
        recommendationConfidence: 0.5,
      },
      uncertainty,
      0.7,
    ).message,
    /reasoningConfidence cannot exceed evidenceConfidence/,
  );

  assert.match(
    validateDecisionConfidence(
      {
        ...base,
        evidenceConfidence: 0.8,
        reasoningConfidence: 0.7,
        recommendationConfidence: 0.85,
      },
      uncertainty,
      0.7,
    ).message,
    /recommendationConfidence cannot exceed/,
  );

  assert.match(
    validateDecisionConfidence(base, uncertainty, 0.55).message,
    /preserve the Consensus Package/,
  );

  assert.match(
    validateDecisionConfidence(base, { ...uncertainty, material: "yes" }, 0.7)
      .message,
    /material must be a boolean/,
  );

  assert.match(
    validateDecisionConfidence(
      base,
      { ...uncertainty, evidenceGaps: "not-an-array" },
      0.7,
    ).message,
    /evidenceGaps must be an array/,
  );
});

test("DecisionConfidence and DecisionUncertainty survive JSON round-trip", async () => {
  const { buildDecisionConfidence } =
    await import("../src/lib/council/chairman-decision-confidence.ts");
  const { validateDecisionConfidence } =
    await import("../src/lib/council/chairman-decision-confidence.ts");

  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONF-001",
    advisors,
  });
  const built = buildDecisionConfidence({
    consensus,
    chairmanNumericConfidence: 0.8,
    content: createContentStub(),
    advisors,
  });

  const payload = JSON.parse(
    JSON.stringify({
      decisionConfidence: built.decisionConfidence,
      uncertainty: built.uncertainty,
    }),
  );

  assert.equal(payload.decisionConfidence.method, "wp05c_structural_min_v1");
  assert.equal(
    payload.decisionConfidence.evidenceConfidence,
    built.decisionConfidence.evidenceConfidence,
  );
  assert.equal(payload.uncertainty.schemaVersion, "1.0");
  assert.ok(Array.isArray(payload.uncertainty.evidenceGaps));

  const validation = validateDecisionConfidence(
    payload.decisionConfidence,
    payload.uncertainty,
    consensus.confidence.overall,
  );
  assert.equal(validation.ok, true);
});

test("successful Chairman publication includes Confidence Triad and Uncertainty", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONF-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONF-001",
    advisors,
  });
  const result = await runChairman(decisionContext, advisors, { consensus });

  assert.equal(result.status, "success");
  assert.ok(result.decisionConfidence);
  assert.ok(result.uncertainty);
  assert.equal(
    result.confidence,
    result.decisionConfidence.recommendationConfidence,
  );
  assert.equal(
    result.decisionConfidence.consensusConfidence,
    Math.round(consensus.confidence.overall * 1000) / 1000,
  );
  assert.ok(result.decisionConfidence.evidenceConfidence >= 0);
  assert.ok(result.decisionConfidence.reasoningConfidence >= 0);
  assert.ok(result.decisionConfidence.recommendationConfidence >= 0);
  assert.equal(typeof result.uncertainty.material, "boolean");
});

test("ChairmanFailed remains confidence-free", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(2);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONF-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONF-001",
    advisors,
    minimumEligibleAdvisors: 2,
  });
  const result = await runChairman(decisionContext, advisors, { consensus });

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INSUFFICIENT_COUNCIL");
  assert.equal("decisionConfidence" in result, false);
  assert.equal("uncertainty" in result, false);
  assert.equal("confidence" in result, false);
});
