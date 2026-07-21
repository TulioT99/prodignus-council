import assert from "node:assert/strict";
import test from "node:test";

import {
  DefaultChairmanContextBuilder,
} from "../src/lib/council/chairman-context-builder.ts";
import { ChairmanContextBuildError } from "../src/lib/council/chairman-context.errors.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";

const fixedClock = {
  now: () => "2026-07-21T09:00:00.000Z",
};

const decision = {
  id: "DEC-20260721-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  expectedOutcome: "Faster document verification.",
  owner: "Council Ops",
  createdAt: "2026-07-21T08:00:00.000Z",
  status: "under_review",
};

const deliveryEngineeringAdvisorResult = {
  persona: {
    id: "ADV-004",
    displayName: "The Delivery Engineering Advisor",
    thinkingLens: "delivery-engineering",
    expertise: "Delivery and engineering",
    background: "Engineering leadership",
    yearsExperience: 15,
    mission: "Assess delivery risk",
    decisionStyle: "Pragmatic",
    coreBeliefs: ["Reliability matters"],
    model: "anthropic/claude-3.5-sonnet",
  },
  source: "live",
  status: "success",
  executionId: "exec-adv-004",
  summary: "Phased rollout reduces delivery risk.",
  analysis: [{ title: "Operational impact", description: "Requires monitoring." }],
  assumptions: ["Team capacity is stable"],
  risks: ["Integration complexity"],
  recommendation: "proceed_with_conditions",
  confidence: 0.72,
  keyArguments: ["Incremental delivery de-risks rollout"],
  unknowns: ["Production traffic profile"],
  engineeringConcerns: ["Service coupling"],
  operationalConcerns: ["On-call load"],
  technicalAlternatives: ["Batch import instead of live upload"],
  durationMs: 1200,
  totalTokens: 850,
};

const contrarianAdvisorResult = {
  persona: {
    id: "ADV-001",
    displayName: "The Contrarian",
    thinkingLens: "contrarian",
    expertise: "Risk",
    background: "Risk analyst",
    yearsExperience: 10,
    mission: "Challenge consensus",
    decisionStyle: "Skeptical",
    coreBeliefs: ["Assume failure modes first"],
    model: "anthropic/claude-3.5-sonnet",
  },
  source: "live",
  status: "success",
  executionId: "exec-adv-001",
  summary: "Scope should remain narrow.",
  analysis: [{ title: "Risk", description: "Upload expands attack surface." }],
  assumptions: ["Security review is available"],
  risks: ["Privacy exposure"],
  recommendation: "test_first",
  confidence: 0.65,
  durationMs: 900,
  totalTokens: 700,
};

const failedAdvisorResult = {
  persona: {
    id: "ADV-003",
    displayName: "The UX & Accessibility Advisor",
    thinkingLens: "ux-accessibility",
    expertise: "UX",
    background: "Accessibility lead",
    yearsExperience: 12,
    mission: "Protect inclusion",
    decisionStyle: "Human-centered",
    coreBeliefs: ["Accessibility is mandatory"],
    model: "anthropic/claude-3.5-sonnet",
  },
  source: "live",
  status: "failed",
  executionId: "exec-adv-003",
  summary: "The advisor could not complete this review.",
  analysis: [],
  assumptions: [],
  risks: [],
  recommendation: "insufficient_information",
  confidence: 0,
  durationMs: 0,
  totalTokens: 0,
  errorMessage: "The model provider did not respond within the allowed time.",
};

function createInput(advisors, options = {}) {
  return {
    decisionContext: createDecisionContext(decision, {
      executionId: "EXEC-SHARED-001",
      attachments: [{ id: "att-1", name: "policy.pdf", mimeType: "application/pdf" }],
      ...options,
    }),
    advisors,
  };
}

test("TC-001: builds valid Chairman context", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const input = createInput([contrarianAdvisorResult, deliveryEngineeringAdvisorResult]);
  const context = builder.build(input);

  assert.equal(context.schemaVersion, "1.0");
  assert.equal(context.request.question, decision.question);
  assert.equal(context.advisors.length, 2);
  assert.equal(context.metadata.advisorCount, 2);
  assert.deepEqual(context.collectiveIntelligence, {});
});

test("TC-002: preserves complete AdvisorResult", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const context = builder.build(createInput([deliveryEngineeringAdvisorResult]));
  const result = context.advisors[0].result;

  assert.equal(result.summary, deliveryEngineeringAdvisorResult.summary);
  assert.deepEqual(result.technicalAlternatives, ["Batch import instead of live upload"]);
  assert.deepEqual(result.engineeringConcerns, ["Service coupling"]);
  assert.deepEqual(result.keyArguments, ["Incremental delivery de-risks rollout"]);
});

test("TC-003: preserves unknown future fields", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const extendedResult = {
    ...deliveryEngineeringAdvisorResult,
    experimentalField: { enabled: true, version: 1 },
  };
  const context = builder.build(createInput([extendedResult]));

  assert.deepEqual(context.advisors[0].result.experimentalField, {
    enabled: true,
    version: 1,
  });
});

test("TC-004: preserves advisor ordering", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const context = builder.build(
    createInput([contrarianAdvisorResult, deliveryEngineeringAdvisorResult, failedAdvisorResult]),
  );

  assert.deepEqual(
    context.advisors.map((entry) => entry.advisorId),
    ["ADV-001", "ADV-004", "ADV-003"],
  );
});

test("TC-005: does not mutate input", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const input = createInput([deliveryEngineeringAdvisorResult]);
  const beforeContext = structuredClone(input.decisionContext);
  const beforeAdvisor = structuredClone(input.advisors[0]);

  builder.build(input);

  assert.deepEqual(input.decisionContext, beforeContext);
  assert.deepEqual(input.advisors[0], beforeAdvisor);
});

test("TC-006: deterministic output with fixed clock", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const input = createInput([deliveryEngineeringAdvisorResult]);
  const first = builder.build(input);
  const second = builder.build(input);

  assert.deepEqual(first, second);
});

test("TC-007: supports partial failure representation", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const context = builder.build(createInput([failedAdvisorResult]));
  const entry = context.advisors[0];

  assert.equal(entry.execution.status, "failed");
  assert.equal(entry.result.errorMessage, failedAdvisorResult.errorMessage);
});

test("TC-008: rejects missing decision context", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);

  assert.throws(
    () => builder.build({ advisors: [] }),
    (error) =>
      error instanceof ChairmanContextBuildError &&
      error.code === "MISSING_DECISION_CONTEXT",
  );
});

test("TC-009: rejects missing advisor identity", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const advisorWithoutId = {
    ...deliveryEngineeringAdvisorResult,
    persona: { ...deliveryEngineeringAdvisorResult.persona, id: "" },
  };

  assert.throws(
    () => builder.build(createInput([advisorWithoutId])),
    (error) =>
      error instanceof ChairmanContextBuildError && error.code === "MISSING_ADVISOR_ID",
  );
});

test("TC-010: supports unknown advisor identifier without special handling", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const unknownAdvisor = {
    ...deliveryEngineeringAdvisorResult,
    persona: { ...deliveryEngineeringAdvisorResult.persona, id: "ADV-999" },
  };
  const context = builder.build(createInput([unknownAdvisor]));

  assert.equal(context.advisors[0].advisorId, "ADV-999");
});

test("TC-020: preserves all DecisionContext fields", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);
  const input = createInput([deliveryEngineeringAdvisorResult]);
  const context = builder.build(input);

  assert.equal(context.request.executionId, "EXEC-SHARED-001");
  assert.equal(context.request.decisionId, decision.id);
  assert.equal(context.request.title, decision.title);
  assert.equal(context.request.language, "en");
  assert.equal(context.request.context, decision.context);
  assert.equal(context.request.constraints, decision.constraints);
  assert.equal(context.request.objectives, decision.expectedOutcome);
  assert.equal(context.request.owner, decision.owner);
  assert.equal(context.request.timestamp, decision.createdAt);
  assert.equal(context.request.status, decision.status);
  assert.equal(context.request.attachments[0].name, "policy.pdf");
  assert.equal(context.metadata.executionId, "EXEC-SHARED-001");
  assert.equal(context.metadata.decisionId, decision.id);
  assert.equal(context.metadata.createdAt, decision.createdAt);
  assert.equal(context.metadata.language, "en");
  assert.equal(context.metadata.contextBuiltAt, fixedClock.now());
});

test("TC-017: build failure exposes safe message", () => {
  const builder = new DefaultChairmanContextBuilder(fixedClock);

  assert.throws(
    () => builder.build({ decisionContext: createDecisionContext({ ...decision, question: "  " }), advisors: [] }),
    (error) =>
      error instanceof ChairmanContextBuildError &&
      error.code === "MISSING_QUESTION" &&
      typeof error.safeMessage === "string",
  );
});
