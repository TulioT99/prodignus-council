import assert from "node:assert/strict";
import test from "node:test";

import { buildConsensusPackage } from "../src/lib/council/consensus/engine.ts";

function persona(id) {
  return {
    id,
    displayName: id,
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

function successAdvisor(advisorId, recommendation, extras = {}) {
  return {
    persona: persona(advisorId),
    source: "live",
    status: "success",
    executionId: "EXEC-REPLAY",
    summary: extras.summary ?? `${advisorId} summary`,
    analysis: [{ title: "A", description: "B" }],
    assumptions: extras.assumptions ?? [`${advisorId} assumption`],
    risks: extras.risks ?? [`${advisorId} risk`],
    recommendation,
    confidence: extras.confidence ?? 0.7,
    keyArguments: extras.keyArguments ?? [`${advisorId} argument`],
    unknowns: extras.unknowns ?? [],
    durationMs: 100,
    totalTokens: 50,
  };
}

const baseInput = {
  executionId: "EXEC-REPLAY",
  expectedAdvisorIds: ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"],
  minimumEligibleAdvisors: 3,
};

test("deterministic replay: identical inputs yield identical packages across runs", () => {
  const advisors = [
    successAdvisor("ADV-003", "test_first"),
    successAdvisor("ADV-001", "proceed"),
    successAdvisor("ADV-005", "do_not_proceed", {
      risks: ["Shared privacy exposure concern"],
    }),
    successAdvisor("ADV-002", "proceed_with_conditions", {
      risks: ["Shared privacy exposure concern"],
    }),
    successAdvisor("ADV-004", "proceed"),
  ];

  const runs = Array.from({ length: 5 }, () =>
    buildConsensusPackage({ ...baseInput, advisors }),
  );

  for (let i = 1; i < runs.length; i += 1) {
    assert.deepEqual(runs[i], runs[0]);
  }
});

test("deterministic replay: advisor completion order does not change semantic identity", () => {
  const advisorsA = [
    successAdvisor("ADV-001", "proceed"),
    successAdvisor("ADV-002", "proceed_with_conditions"),
    successAdvisor("ADV-003", "do_not_proceed"),
  ];
  const advisorsB = [
    successAdvisor("ADV-003", "do_not_proceed"),
    successAdvisor("ADV-001", "proceed"),
    successAdvisor("ADV-002", "proceed_with_conditions"),
  ];

  const packageA = buildConsensusPackage({ ...baseInput, advisors: advisorsA });
  const packageB = buildConsensusPackage({ ...baseInput, advisors: advisorsB });

  assert.deepEqual(packageA, packageB);
  assert.deepEqual(
    packageA.participatingAdvisors.map((entry) => entry.advisorId),
    ["ADV-001", "ADV-002", "ADV-003"],
  );
});

test("deterministic replay: JSON serialization is byte-stable", () => {
  const advisors = [
    successAdvisor("ADV-001", "proceed"),
    successAdvisor("ADV-002", "proceed"),
    successAdvisor("ADV-003", "test_first"),
  ];

  const first = JSON.stringify(
    buildConsensusPackage({ ...baseInput, advisors }),
  );
  const second = JSON.stringify(
    buildConsensusPackage({ ...baseInput, advisors: [...advisors].reverse() }),
  );

  assert.equal(first, second);
});
