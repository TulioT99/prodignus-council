import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";

const validAdvisorPayload = {
  summary: "Image upload should proceed with strict privacy controls.",
  analysis: [
    {
      title: "Privacy",
      description: "Uploads must remain scoped to required document evidence.",
    },
  ],
  assumptions: ["Storage can be bounded per journey."],
  risks: ["Over-collection of citizen media."],
  recommendation: "proceed_with_conditions",
  confidence: 70,
};

const validProductStrategyPayload = {
  summary:
    "Image upload can deliver citizen value if scoped to required evidence.",
  analysis: [
    {
      title: "User problem",
      description:
        "Citizens need to submit evidence without abandoning guided journeys.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Scoped uploads can reduce caseworker clarification loops."],
  assumptions: ["Storage can be bounded per journey."],
  risks: ["Over-collection of citizen media."],
  unknowns: ["Upload success rate on low-end devices is unknown."],
  confidence: 70,
};

const validUxAccessibilityPayload = {
  summary:
    "Citizens may struggle to complete upload without clear guidance and error recovery.",
  analysis: [
    {
      title: "Comprehension and cognitive load",
      description:
        "Upload steps may exceed the reading level of stressed citizens.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Guided capture inside one flow can reduce abandonment."],
  risks: ["Citizens may abandon after repeated upload failures."],
  unknowns: ["Upload success rate on entry-level Android devices is unknown."],
  accessibilityConcerns: [
    "Color-only error states may exclude low-vision users.",
  ],
  journeyBarriers: [
    "Poor connectivity can interrupt uploads without recovery guidance.",
  ],
  confidence: 70,
};

const validDeliveryEngineeringPayload = {
  summary:
    "Image upload is feasible with bounded scope but requires operational safeguards.",
  analysis: [
    {
      title: "Deployment readiness",
      description:
        "Phased rollout with feature flag reduces production deployment risk.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: [
    "Existing storage patterns can be reused with minimal new infrastructure.",
  ],
  risks: ["Storage cost overrun — mitigation: enforce retention limits."],
  unknowns: [
    "Platform storage quota is not specified in the decision context.",
  ],
  engineeringConcerns: [
    "Upload service must integrate with existing auth layers.",
  ],
  operationalConcerns: [
    "Upload failure metrics must be observable before rollout.",
  ],
  technicalAlternatives: [
    "Pilot with feature flag in one journey before platform-wide enablement.",
  ],
  confidence: 70,
};

const validHumanImpactPayload = {
  summary:
    "Image upload may empower some citizens but exclude others without offline alternatives.",
  analysis: [
    {
      title: "Autonomy and inclusion",
      description:
        "Mandatory upload may reduce autonomy for citizens without digital access.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: [
    "Progressive eligibility guidance preserves dignity better than immediate denial.",
  ],
  risks: ["Repeated failures may erode trust in institutions."],
  unknowns: [
    "Vulnerable group profiles are not specified in the decision context.",
  ],
  humanImpact: ["Short-term anxiety for citizens fearing upload mistakes."],
  ethicalConcerns: ["Mandatory digital submission may widen equity gaps."],
  inclusionConcerns: ["Citizens without smartphones may be excluded."],
  longTermEffects: [
    "May shift support burden to digital channels permanently.",
  ],
  confidence: 70,
};

function createAdvisorResponse(model) {
  if (model === "test/product-strategy") {
    return validProductStrategyPayload;
  }
  if (model === "test/ux-accessibility") {
    return validUxAccessibilityPayload;
  }
  if (model === "test/delivery-engineering") {
    return validDeliveryEngineeringPayload;
  }
  if (model === "test/human-impact") {
    return validHumanImpactPayload;
  }
  return validAdvisorPayload;
}

const sampleDecision = {
  id: "DEC-20260727-WP04-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-27T10:00:00.000Z",
  status: "under_review",
};

const advisorModels = {
  OPENROUTER_MODEL_CONTRARIAN: "test/contrarian",
  OPENROUTER_MODEL_PRODUCT_STRATEGY: "test/product-strategy",
  OPENROUTER_MODEL_UX_ACCESSIBILITY: "test/ux-accessibility",
  OPENROUTER_MODEL_DELIVERY_ENGINEERING: "test/delivery-engineering",
  OPENROUTER_MODEL_HUMAN_IMPACT: "test/human-impact",
  OPENROUTER_MODEL_CHAIRMAN: "test/chairman",
};

function createOpenRouterResponse(content, model) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      model,
      choices: [
        { message: { role: "assistant", content: JSON.stringify(content) } },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    }),
  };
}

let originalFetch;
let originalEnv;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  originalEnv = { ...process.env };
  process.env.OPENROUTER_API_KEY = "test-key";
  for (const [key, value] of Object.entries(advisorModels)) {
    process.env[key] = value;
  }
  const { resetRuntimeConfigForTests } =
    await import("../src/config/runtime.ts");
  resetRuntimeConfigForTests();
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  const { resetRuntimeConfigForTests } =
    await import("../src/config/runtime.ts");
  resetRuntimeConfigForTests();
  mock.restoreAll();
});

test("integration: advisors → validated opinions → consensus → chairman consumes package", async () => {
  const promptBodies = [];

  globalThis.fetch = mock.fn(async (_url, options) => {
    promptBodies.push(JSON.parse(options.body));
    const model = promptBodies.at(-1).model;

    if (model === "test/chairman") {
      return createOpenRouterChairmanResponse(validChairmanPayload, model);
    }

    return createOpenRouterResponse(createAdvisorResponse(model), model);
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");
  const result = await runCouncil(sampleDecision);

  assert.equal(result.advisors.length, 5);
  assert.ok(result.consensus);
  assert.equal(result.consensus.schemaVersion, "1.0");
  assert.equal(
    result.consensus.executionId,
    result.decisionContext.executionId,
  );
  assert.equal(result.consensus.participatingAdvisors.length, 5);
  assert.ok(result.consensus.agreementMap.length >= 1);
  assert.equal(typeof result.consensusDurationMs, "number");

  assert.ok(result.chairman);
  assert.equal(result.chairman.status, "success");
  assert.equal(promptBodies.length, 6);

  const chairmanUserMessage = promptBodies[5].messages.find(
    (message) => message.role === "user",
  ).content;

  assert.match(chairmanUserMessage, /SYSTEM BOUNDARY: CONSENSUS PACKAGE/);
  assert.match(chairmanUserMessage, /Agreement map/);
  assert.match(chairmanUserMessage, /proceed_with_conditions/);
  assert.match(chairmanUserMessage, /Eligible advisors: 5/);
});

test("integration: consensus remains non-generative (no extra provider calls)", async () => {
  let providerCalls = 0;

  globalThis.fetch = mock.fn(async (_url, options) => {
    providerCalls += 1;
    const body = JSON.parse(options.body);

    if (body.model === "test/chairman") {
      return createOpenRouterChairmanResponse(validChairmanPayload, body.model);
    }

    return createOpenRouterResponse(
      createAdvisorResponse(body.model),
      body.model,
    );
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");
  await runCouncil(sampleDecision);

  // 5 advisors + 1 chairman only — consensus must not call providers.
  assert.equal(providerCalls, 6);
});

test("integration: context builder embeds consensus into collectiveIntelligence", async () => {
  const { DefaultChairmanContextBuilder } =
    await import("../src/lib/council/chairman-context-builder.ts");
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { buildConsensusPackage } =
    await import("../src/lib/council/consensus/engine.ts");

  const advisors = [
    {
      persona: {
        id: "ADV-001",
        displayName: "A1",
        thinkingLens: "contrarian",
        expertise: "x",
        background: "x",
        yearsExperience: 1,
        mission: "x",
        decisionStyle: "x",
        coreBeliefs: ["x"],
        model: "m",
      },
      source: "live",
      status: "success",
      executionId: "E1",
      summary: "s1",
      analysis: [],
      assumptions: ["a"],
      risks: ["r"],
      recommendation: "proceed",
      confidence: 0.7,
      keyArguments: ["k"],
      unknowns: [],
      durationMs: 1,
      totalTokens: 1,
    },
    {
      persona: {
        id: "ADV-002",
        displayName: "A2",
        thinkingLens: "product-strategy",
        expertise: "x",
        background: "x",
        yearsExperience: 1,
        mission: "x",
        decisionStyle: "x",
        coreBeliefs: ["x"],
        model: "m",
      },
      source: "live",
      status: "success",
      executionId: "E1",
      summary: "s2",
      analysis: [],
      assumptions: ["a2"],
      risks: ["r2"],
      recommendation: "proceed",
      confidence: 0.8,
      keyArguments: ["k2"],
      unknowns: [],
      durationMs: 1,
      totalTokens: 1,
    },
    {
      persona: {
        id: "ADV-003",
        displayName: "A3",
        thinkingLens: "ux-accessibility",
        expertise: "x",
        background: "x",
        yearsExperience: 1,
        mission: "x",
        decisionStyle: "x",
        coreBeliefs: ["x"],
        model: "m",
      },
      source: "live",
      status: "success",
      executionId: "E1",
      summary: "s3",
      analysis: [],
      assumptions: ["a3"],
      risks: ["r3"],
      recommendation: "test_first",
      confidence: 0.6,
      keyArguments: ["k3"],
      unknowns: [],
      durationMs: 1,
      totalTokens: 1,
    },
  ];

  const consensus = buildConsensusPackage({
    executionId: "E1",
    advisors,
    expectedAdvisorIds: ["ADV-001", "ADV-002", "ADV-003"],
    minimumEligibleAdvisors: 3,
  });

  const builder = new DefaultChairmanContextBuilder({
    now: () => "2026-07-27T12:00:00.000Z",
  });
  const context = builder.build({
    decisionContext: createDecisionContext(sampleDecision, {
      executionId: "E1",
    }),
    advisors,
    consensus,
  });

  assert.equal(context.collectiveIntelligence.consensus, consensus);
  assert.equal(
    context.collectiveIntelligence.extensions.minorityPositions.length,
    consensus.minorityPositions.length,
  );
  assert.ok(context.collectiveIntelligence.openQuestions);
});

test("regression: WP-03 validation gate still selects only successful opinions", async () => {
  const { selectValidatedAdvisorOpinions } =
    await import("../src/lib/council/validated-advisor-opinions.ts");

  const opinions = selectValidatedAdvisorOpinions([
    {
      persona: {
        id: "ADV-001",
        displayName: "A1",
        thinkingLens: "contrarian",
        expertise: "x",
        background: "x",
        yearsExperience: 1,
        mission: "x",
        decisionStyle: "x",
        coreBeliefs: ["x"],
        model: "m",
      },
      source: "live",
      status: "success",
      executionId: "E1",
      summary: "ok",
      analysis: [],
      assumptions: [],
      risks: [],
      recommendation: "proceed",
      confidence: 0.5,
      durationMs: 1,
      totalTokens: 1,
    },
    {
      persona: {
        id: "ADV-002",
        displayName: "A2",
        thinkingLens: "contrarian",
        expertise: "x",
        background: "x",
        yearsExperience: 1,
        mission: "x",
        decisionStyle: "x",
        coreBeliefs: ["x"],
        model: "m",
      },
      source: "live",
      status: "failed",
      executionId: "E1",
      summary: "fail",
      analysis: [],
      assumptions: [],
      risks: [],
      recommendation: "insufficient_information",
      confidence: 0,
      durationMs: 0,
      totalTokens: 0,
      errorMessage: "timeout",
    },
  ]);

  assert.equal(opinions.length, 1);
  assert.equal(opinions[0].advisorId, "ADV-001");
});
