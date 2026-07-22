import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVISOR_DISPLAY_ORDER,
  ADVISOR_RECOMMENDATION_LABELS,
  CHAIRMAN_RECOMMENDATION_LABELS,
  aggregateCouncilMetrics,
  buildDecisionFromRequest,
  formatCostUsd,
  formatDurationReadable,
  getAdvisorDisplayName,
  getUnavailableAdvisorNames,
  shouldShowBoundedExperimentClarity,
  sortAdvisorsForDisplay,
} from "../src/lib/council/council-display.ts";

function createAdvisor(id, status = "success") {
  return {
    persona: {
      id,
      displayName: `Advisor ${id}`,
      thinkingLens: id === "ADV-001" ? "contrarian" : "product-strategy",
      expertise: "Test",
      background: "Test",
      yearsExperience: 1,
      mission: "Test",
      decisionStyle: "Test",
      coreBeliefs: [],
      model: "test-model",
    },
    source: "openrouter",
    status,
    executionId: "exec-1",
    summary: "Summary",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "proceed",
    confidence: 0.8,
    durationMs: 1200,
    totalTokens: 100,
  };
}

test("sortAdvisorsForDisplay returns Product Strategy through Contrarian order", () => {
  const advisors = ADVISOR_DISPLAY_ORDER.map((id) => createAdvisor(id)).reverse();
  const sorted = sortAdvisorsForDisplay(advisors);

  assert.deepEqual(
    sorted.map((advisor) => advisor.persona.id),
    [...ADVISOR_DISPLAY_ORDER],
  );
});

test("getAdvisorDisplayName uses user-facing labels", () => {
  const advisor = createAdvisor("ADV-003");
  assert.equal(getAdvisorDisplayName(advisor), "UX & Accessibility");
});

test("formatDurationReadable converts milliseconds to readable values", () => {
  assert.equal(formatDurationReadable(850), "850 ms");
  assert.equal(formatDurationReadable(2500), "2.5 s");
  assert.equal(formatDurationReadable(90_000), "1 min 30 s");
});

test("formatCostUsd returns Not provided for missing cost", () => {
  assert.equal(formatCostUsd(undefined), "Not provided");
  assert.equal(formatCostUsd(Number.NaN), "Not provided");
  assert.equal(formatCostUsd(0.0123), "$0.0123");
});

test("aggregateCouncilMetrics sums tokens and omits cost when unavailable", () => {
  const result = {
    advisors: [
      createAdvisor("ADV-002"),
      { ...createAdvisor("ADV-003", "failed"), totalTokens: 0 },
    ],
    chairman: {
      totalTokens: 50,
    },
    advisorStageDurationMs: 10_000,
    chairmanDurationMs: 5_000,
    totalDurationMs: 15_000,
  };

  const metrics = aggregateCouncilMetrics(result);

  assert.equal(metrics.advisorTokens, 100);
  assert.equal(metrics.chairmanTokens, 50);
  assert.equal(metrics.totalTokens, 150);
  assert.equal(metrics.totalCost, undefined);
});

test("aggregateCouncilMetrics sums available cost values", () => {
  const advisor = {
    ...createAdvisor("ADV-002"),
    estimatedCostUsd: 0.01,
  };
  const result = {
    advisors: [advisor],
    chairman: {
      totalTokens: 10,
      estimatedCostUsd: 0.02,
    },
    advisorStageDurationMs: 1000,
    chairmanDurationMs: 1000,
    totalDurationMs: 2000,
  };

  const metrics = aggregateCouncilMetrics(result);
  assert.equal(metrics.totalCost, 0.03);
});

test("getUnavailableAdvisorNames lists failed advisors in display order", () => {
  const result = {
    advisors: [
      createAdvisor("ADV-001", "failed"),
      createAdvisor("ADV-005", "failed"),
      createAdvisor("ADV-002", "success"),
    ],
  };

  assert.deepEqual(getUnavailableAdvisorNames(result), [
    "Human Impact",
    "Contrarian",
  ]);
});

test("buildDecisionFromRequest maps objectives and alternatives into Decision", () => {
  const decision = buildDecisionFromRequest(
    {
      title: "Pilot selection",
      question: "Which city should launch first?",
      context: "Citizen reach matters.",
      constraints: "Launch within one quarter.",
      expectedOutcome: "Reduce uncertainty before rollout.",
      alternatives: "Goiânia or Palmas",
    },
    1,
  );

  assert.equal(decision.expectedOutcome, "Reduce uncertainty before rollout.");
  assert.match(decision.context, /Alternatives under consideration:/);
  assert.match(decision.context, /Goiânia or Palmas/);
});

test("chairman recommendation labels match user-facing table", () => {
  assert.equal(CHAIRMAN_RECOMMENDATION_LABELS.defer, "Defer the decision");
  assert.equal(
    CHAIRMAN_RECOMMENDATION_LABELS.run_bounded_experiment,
    "Run a bounded experiment",
  );
});

test("advisor recommendation labels preserve bounded experiment wording", () => {
  assert.equal(ADVISOR_RECOMMENDATION_LABELS.test_first, "Run a bounded experiment");
});

test("shouldShowBoundedExperimentClarity is true only for successful bounded experiments", () => {
  assert.equal(
    shouldShowBoundedExperimentClarity({
      status: "success",
      recommendationType: "run_bounded_experiment",
    }),
    true,
  );
  assert.equal(
    shouldShowBoundedExperimentClarity({
      status: "success",
      recommendationType: "proceed",
    }),
    false,
  );
});
