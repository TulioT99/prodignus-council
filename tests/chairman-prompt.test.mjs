import assert from "node:assert/strict";
import test from "node:test";

import { defaultChairmanContextBuilder } from "../src/lib/council/chairman-context-builder.ts";
import { buildChairmanPrompts } from "../src/lib/council/chairman-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";

const decision = {
  id: "DEC-20260720-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const successfulAdvisor = {
  persona: {
    id: "ADV-002",
    displayName: "The First Principles Thinker",
    thinkingLens: "first-principles",
    expertise: "Public Policy",
    background: "Public Policy Researcher",
    yearsExperience: 18,
    mission: "Challenge assumptions.",
    decisionStyle: "Rebuild from first principles.",
    coreBeliefs: ["Every recommendation depends on explicit assumptions."],
    model: "OpenRouter (configured model)",
  },
  source: "live",
  status: "success",
  executionId: "EXEC-SHARED-001",
  summary: "Image upload should be scoped to document evidence needs.",
  analysis: [
    {
      title: "Citizen need",
      description: "Upload support must map to document verification, not general media sharing.",
    },
  ],
  assumptions: ["Storage can be bounded per journey."],
  risks: ["Privacy exposure if uploads are not scoped."],
  recommendation: "proceed_with_conditions",
  confidence: 0.81,
  keyArguments: ["Scope uploads to verification use cases only."],
  durationMs: 100,
  totalTokens: 200,
};

const failedAdvisor = {
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
    model: "OpenRouter (configured model)",
  },
  source: "live",
  status: "failed",
  executionId: "EXEC-SHARED-001",
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

function buildContext(advisors, decisionContextOptions = {}) {
  const decisionContext = createDecisionContext(decision, {
    executionId: "EXEC-SHARED-001",
    ...decisionContextOptions,
  });

  return defaultChairmanContextBuilder.build({ decisionContext, advisors });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("TC-015: user prompt superset equivalence preserves legacy Chairman payload", () => {
  const advisorWithEnrichment = {
    ...successfulAdvisor,
    technicalAlternatives: ["Manual document intake"],
    unknowns: ["Peak upload volume"],
  };
  const chairmanContext = buildContext([advisorWithEnrichment, failedAdvisor], {
    attachments: [{ id: "att-1", name: "policy.pdf", mimeType: "application/pdf" }],
  });
  const { userPrompt } = buildChairmanPrompts(chairmanContext);

  const legacyDecisionMaterial = [
    "Execution ID: EXEC-SHARED-001",
    "Language: en",
    `Decision ID: ${decision.id}`,
    `Title: ${decision.title}`,
    `Question: ${decision.question}`,
    `Context: ${decision.context}`,
    `Constraints: ${decision.constraints}`,
    "policy.pdf",
    `Status: ${decision.status}`,
    "Successful advisor responses (1)",
    "Advisor failures (1)",
  ];

  for (const material of legacyDecisionMaterial) {
    assert.match(userPrompt, new RegExp(escapeRegExp(material)));
  }

  const legacyAdvisorMaterial = [
    advisorWithEnrichment.summary,
    advisorWithEnrichment.persona.displayName,
    advisorWithEnrichment.persona.id,
    advisorWithEnrichment.persona.thinkingLens,
    advisorWithEnrichment.recommendation,
    "Confidence: 81%",
    advisorWithEnrichment.analysis[0].title,
    advisorWithEnrichment.analysis[0].description,
    advisorWithEnrichment.assumptions[0],
    advisorWithEnrichment.risks[0],
    failedAdvisor.persona.displayName,
    failedAdvisor.errorMessage,
  ];

  for (const material of legacyAdvisorMaterial) {
    assert.match(userPrompt, new RegExp(escapeRegExp(material)));
  }

  assert.match(userPrompt, /Technical Alternatives: Manual document intake/);
  assert.match(userPrompt, /Unknowns: Peak upload volume/);
});

test("TC-011: buildChairmanPrompts receives ChairmanContext", () => {
  const chairmanContext = buildContext([successfulAdvisor]);
  const { userPrompt } = buildChairmanPrompts(chairmanContext);

  assert.match(userPrompt, /Execution ID: EXEC-SHARED-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
});

test("buildChairmanPrompts includes successful advisor outputs with shared execution ID", () => {
  const { userPrompt } = buildChairmanPrompts(buildContext([successfulAdvisor]));

  assert.match(userPrompt, /Image upload should be scoped to document evidence needs/);
  assert.match(userPrompt, /Execution ID: EXEC-SHARED-001/);
});

test("TC-012: optional advisor fields reach serialization", () => {
  const advisorWithOptionalFields = {
    ...successfulAdvisor,
    technicalAlternatives: ["Manual document intake"],
    unknowns: ["Peak upload volume"],
  };
  const { userPrompt } = buildChairmanPrompts(buildContext([advisorWithOptionalFields]));

  assert.match(userPrompt, /Technical Alternatives: Manual document intake/);
  assert.match(userPrompt, /Key Arguments: Scope uploads to verification use cases only./);
  assert.match(userPrompt, /Unknowns: Peak upload volume/);
});

test("buildChairmanPrompts includes advisor failures", () => {
  const { userPrompt } = buildChairmanPrompts(buildContext([failedAdvisor]));

  assert.match(userPrompt, /Advisor failures \(1\)/);
  assert.match(userPrompt, /The Contrarian/);
  assert.match(userPrompt, /did not respond within the allowed time/);
});

test("TC-019: buildChairmanPrompts instructs against vote counting", () => {
  const { systemPrompt } = buildChairmanPrompts(buildContext([successfulAdvisor]));

  assert.match(systemPrompt, /not decide by counting votes/i);
});

test("TC-013: structured data does not serialize as [object Object]", () => {
  const advisorWithExtension = {
    ...successfulAdvisor,
    experimentalField: { enabled: true, version: 1 },
  };
  const { userPrompt } = buildChairmanPrompts(buildContext([advisorWithExtension]));

  assert.doesNotMatch(userPrompt, /\[object Object\]/);
  assert.match(userPrompt, /"enabled":true/);
});
