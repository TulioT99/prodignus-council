import assert from "node:assert/strict";
import test from "node:test";

import { buildConsensusPackage } from "../src/lib/council/consensus/engine.ts";
import { partitionAdvisorEligibility } from "../src/lib/council/consensus/eligibility.ts";
import { analyzeStructuralRelationships } from "../src/lib/council/consensus/analysis.ts";
import {
  synthesizeConsensusConfidence,
  synthesizeEvidenceCoverage,
} from "../src/lib/council/consensus/confidence.ts";
import { selectValidatedAdvisorOpinions } from "../src/lib/council/validated-advisor-opinions.ts";

function persona(id, displayName = id) {
  return {
    id,
    displayName,
    thinkingLens: "contrarian",
    expertise: "Test",
    background: "Test",
    yearsExperience: 10,
    mission: "Test",
    decisionStyle: "Test",
    coreBeliefs: ["Test"],
    model: "test/model",
  };
}

function successAdvisor(overrides = {}) {
  return {
    persona: persona(overrides.advisorId ?? "ADV-001", overrides.displayName),
    source: "live",
    status: "success",
    executionId: "EXEC-1",
    summary: overrides.summary ?? "Summary",
    analysis: overrides.analysis ?? [{ title: "A", description: "B" }],
    assumptions: overrides.assumptions ?? ["Assumption A"],
    risks: overrides.risks ?? ["Risk A"],
    recommendation: overrides.recommendation ?? "proceed_with_conditions",
    confidence: overrides.confidence ?? 0.7,
    keyArguments: overrides.keyArguments ?? ["Argument A"],
    unknowns: overrides.unknowns ?? [],
    durationMs: 100,
    totalTokens: 50,
    ...overrides.resultOverrides,
  };
}

function failedAdvisor(overrides = {}) {
  return {
    persona: persona(overrides.advisorId ?? "ADV-002", overrides.displayName),
    source: "live",
    status: "failed",
    executionId: "EXEC-1",
    summary: "The advisor could not complete this review.",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "insufficient_information",
    confidence: 0,
    durationMs: 0,
    totalTokens: 0,
    errorMessage:
      overrides.errorMessage ?? "The advisor could not complete this review.",
  };
}

const EXPECTED_IDS = ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"];

function buildPackage(advisors, options = {}) {
  return buildConsensusPackage({
    executionId: options.executionId ?? "EXEC-CONSENSUS-1",
    advisors,
    expectedAdvisorIds: options.expectedAdvisorIds ?? EXPECTED_IDS,
    minimumEligibleAdvisors: options.minimumEligibleAdvisors ?? 3,
  });
}

test("eligibility: successful advisors are eligible; failures classified and excluded", () => {
  const advisors = [
    successAdvisor({ advisorId: "ADV-001" }),
    failedAdvisor({
      advisorId: "ADV-002",
      errorMessage:
        "The model provider did not respond within the allowed time.",
    }),
    failedAdvisor({
      advisorId: "ADV-003",
      errorMessage: "The advisor review was cancelled.",
    }),
    failedAdvisor({
      advisorId: "ADV-004",
      errorMessage: "The advisor response could not be validated.",
    }),
    failedAdvisor({
      advisorId: "ADV-005",
      errorMessage: "The advisor could not complete this review.",
    }),
  ];

  const partition = partitionAdvisorEligibility(advisors);

  assert.equal(partition.eligible.length, 1);
  assert.equal(partition.participatingAdvisors[0].advisorId, "ADV-001");
  assert.deepEqual(
    partition.excludedAdvisors.map((entry) => [entry.advisorId, entry.reason]),
    [
      ["ADV-002", "timed_out"],
      ["ADV-003", "cancelled"],
      ["ADV-004", "malformed"],
      ["ADV-005", "failed"],
    ],
  );
});

test("eligibility: ordering is stable by advisorId regardless of input order", () => {
  const advisors = [
    successAdvisor({ advisorId: "ADV-005", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-003", recommendation: "proceed" }),
  ];

  const partition = partitionAdvisorEligibility(advisors);
  assert.deepEqual(
    partition.eligible.map((o) => o.advisorId),
    ["ADV-001", "ADV-003", "ADV-005"],
  );
});

test("agreement: full agreement when all eligible share recommendation", () => {
  const advisors = [
    successAdvisor({
      advisorId: "ADV-001",
      recommendation: "proceed_with_conditions",
    }),
    successAdvisor({
      advisorId: "ADV-002",
      recommendation: "proceed_with_conditions",
      risks: ["Different risk"],
      keyArguments: ["Different argument"],
    }),
    successAdvisor({
      advisorId: "ADV-003",
      recommendation: "proceed_with_conditions",
      assumptions: ["Different assumption"],
    }),
  ];

  const analysis = analyzeStructuralRelationships(
    selectValidatedAdvisorOpinions(advisors),
  );

  assert.ok(
    analysis.agreementMap.some((entry) => entry.kind === "full_agreement"),
  );
  assert.ok(
    analysis.agreementMap.some((entry) => entry.kind === "complementary"),
  );
  assert.equal(analysis.disagreementMap.length, 0);
  assert.equal(analysis.minorityPositions.length, 0);
});

test("agreement: partial agreement across advance-family recommendations", () => {
  const advisors = [
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({
      advisorId: "ADV-002",
      recommendation: "proceed_with_conditions",
    }),
    successAdvisor({ advisorId: "ADV-003", recommendation: "test_first" }),
  ];

  const analysis = analyzeStructuralRelationships(
    selectValidatedAdvisorOpinions(advisors),
  );

  assert.ok(
    analysis.agreementMap.some((entry) => entry.kind === "partial_agreement"),
  );
  assert.equal(analysis.hasRecommendationConflict, false);
  assert.equal(analysis.minorityPositions.length, 2);
});

test("disagreement: conflicting recommendations preserve competing positions", () => {
  const advisors = [
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({
      advisorId: "ADV-002",
      recommendation: "proceed_with_conditions",
    }),
    successAdvisor({ advisorId: "ADV-003", recommendation: "do_not_proceed" }),
  ];

  const analysis = analyzeStructuralRelationships(
    selectValidatedAdvisorOpinions(advisors),
  );

  assert.equal(analysis.hasRecommendationConflict, true);
  const conflict = analysis.disagreementMap.find(
    (entry) => entry.kind === "conflicting_recommendations",
  );
  assert.ok(conflict);
  assert.ok(conflict.positions.length >= 2);
  assert.ok(
    analysis.minorityPositions.some(
      (entry) => entry.recommendation === "do_not_proceed",
    ) || analysis.dominantRecommendation === "do_not_proceed",
  );
});

test("disagreement: contradictory evidence when opposing camps share support tokens", () => {
  const shared = "Shared privacy exposure concern";
  const advisors = [
    successAdvisor({
      advisorId: "ADV-001",
      recommendation: "proceed",
      risks: [shared],
    }),
    successAdvisor({
      advisorId: "ADV-002",
      recommendation: "do_not_proceed",
      risks: [shared],
    }),
  ];

  const analysis = analyzeStructuralRelationships(
    selectValidatedAdvisorOpinions(advisors),
  );

  assert.equal(analysis.hasContradictoryEvidence, true);
  assert.ok(
    analysis.disagreementMap.some(
      (entry) => entry.kind === "contradictory_evidence",
    ),
  );
});

test("confidence: advisor and consensus confidence remain distinct", () => {
  const opinions = selectValidatedAdvisorOpinions([
    successAdvisor({
      advisorId: "ADV-001",
      confidence: 0.9,
      recommendation: "proceed",
    }),
    successAdvisor({
      advisorId: "ADV-002",
      confidence: 0.8,
      recommendation: "proceed",
    }),
    successAdvisor({
      advisorId: "ADV-003",
      confidence: 0.7,
      recommendation: "proceed",
    }),
  ]);
  const analysis = analyzeStructuralRelationships(opinions);
  const evidence = synthesizeEvidenceCoverage(opinions, analysis);
  const confidence = synthesizeConsensusConfidence({
    opinions,
    analysis,
    evidence,
    expectedAdvisorCount: 5,
    belowMinimum: false,
  });

  assert.equal(confidence.method, "wp04_structural_product_v1");
  assert.ok(
    confidence.overall < Math.max(...opinions.map((o) => o.confidence)),
  );
  assert.equal(confidence.advisorConfidenceMean, 0.8);
  assert.ok(confidence.participationFactor < 1);
});

test("package: minority positions preserved with lineage", () => {
  const pkg = buildPackage([
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-002", recommendation: "proceed" }),
    successAdvisor({
      advisorId: "ADV-003",
      recommendation: "test_first",
      summary: "Pilot first",
      keyArguments: ["Bound the experiment"],
    }),
  ]);

  assert.ok(pkg.minorityPositions.length >= 1);
  const minority = pkg.minorityPositions.find((entry) =>
    entry.advisorIds.includes("ADV-003"),
  );
  assert.ok(minority);
  assert.equal(minority.recommendation, "test_first");
  assert.match(minority.whyItDiffers, /Non-dominant/);
});

test("package: zero eligible advisors yields insufficient package without throwing", () => {
  const pkg = buildPackage([
    failedAdvisor({ advisorId: "ADV-001" }),
    failedAdvisor({ advisorId: "ADV-002" }),
  ]);

  assert.equal(pkg.status, "insufficient");
  assert.equal(pkg.participatingAdvisors.length, 0);
  assert.equal(pkg.confidence.overall, 0);
  assert.ok(pkg.metadata.degradationFlags.includes("zero_eligible"));
});

test("package: single advisor is degraded and does not invent agreement", () => {
  const pkg = buildPackage(
    [successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" })],
    { minimumEligibleAdvisors: 1 },
  );

  assert.equal(pkg.status, "degraded");
  assert.equal(pkg.agreementMap.length, 0);
  assert.ok(
    pkg.unresolvedConflicts.some(
      (entry) => entry.kind === "insufficient_evidence",
    ),
  );
});

test("package: below-minimum participation triggers insufficient path", () => {
  const pkg = buildPackage(
    [
      successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
      successAdvisor({ advisorId: "ADV-002", recommendation: "proceed" }),
    ],
    { minimumEligibleAdvisors: 3 },
  );

  assert.equal(pkg.status, "insufficient");
  assert.ok(pkg.metadata.degradationFlags.includes("below_minimum_eligible"));
  assert.ok(
    pkg.openQuestions.some((q) => /below the configured minimum/i.test(q)),
  );
});

test("package: cancelled advisors are not reinterpreted as dissent", () => {
  const pkg = buildPackage([
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-002", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-003", recommendation: "proceed" }),
    failedAdvisor({
      advisorId: "ADV-004",
      errorMessage: "The advisor review was cancelled.",
    }),
  ]);

  const cancelled = pkg.excludedAdvisors.find(
    (entry) => entry.advisorId === "ADV-004",
  );
  assert.equal(cancelled.reason, "cancelled");
  assert.equal(
    pkg.disagreementMap.some((entry) =>
      entry.positions.some((position) =>
        position.advisorIds.includes("ADV-004"),
      ),
    ),
    false,
  );
});

test("package: immutable and freezes nested collections", () => {
  const pkg = buildPackage([
    successAdvisor({ advisorId: "ADV-001", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-002", recommendation: "proceed" }),
    successAdvisor({ advisorId: "ADV-003", recommendation: "proceed" }),
  ]);

  assert.ok(Object.isFrozen(pkg));
  assert.ok(Object.isFrozen(pkg.participatingAdvisors));
  assert.ok(Object.isFrozen(pkg.agreementMap));
  assert.throws(() => {
    pkg.status = "no_consensus";
  });
});

test("package: malformed advisors input degrades explicitly", () => {
  const pkg = buildConsensusPackage({
    executionId: "EXEC-BAD",
    advisors: null,
    expectedAdvisorIds: EXPECTED_IDS,
    minimumEligibleAdvisors: 3,
  });

  assert.equal(pkg.status, "insufficient");
  assert.ok(pkg.metadata.degradationFlags.includes("malformed_input"));
});
