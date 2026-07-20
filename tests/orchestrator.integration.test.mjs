import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

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
  summary: "Image upload can deliver citizen value if scoped to required evidence.",
  analysis: [
    {
      title: "User problem",
      description: "Citizens need to submit evidence without abandoning guided journeys.",
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
  summary: "Citizens may struggle to complete upload without clear guidance and error recovery.",
  analysis: [
    {
      title: "Comprehension and cognitive load",
      description: "Upload steps may exceed the reading level of stressed citizens.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Guided capture inside one flow can reduce abandonment."],
  risks: ["Citizens may abandon after repeated upload failures."],
  unknowns: ["Upload success rate on entry-level Android devices is unknown."],
  accessibilityConcerns: ["Color-only error states may exclude low-vision users."],
  journeyBarriers: ["Poor connectivity can interrupt uploads without recovery guidance."],
  confidence: 70,
};

const validDeliveryEngineeringPayload = {
  summary: "Image upload is feasible with bounded scope but requires operational safeguards.",
  analysis: [
    {
      title: "Deployment readiness",
      description: "Phased rollout with feature flag reduces production deployment risk.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Existing storage patterns can be reused with minimal new infrastructure."],
  risks: ["Storage cost overrun — mitigation: enforce retention limits."],
  unknowns: ["Platform storage quota is not specified in the decision context."],
  engineeringConcerns: ["Upload service must integrate with existing auth layers."],
  operationalConcerns: ["Upload failure metrics must be observable before rollout."],
  technicalAlternatives: ["Pilot with feature flag in one journey before platform-wide enablement."],
  confidence: 70,
};

const validHumanImpactPayload = {
  summary: "Image upload may empower some citizens but exclude others without offline alternatives.",
  analysis: [
    {
      title: "Autonomy and inclusion",
      description: "Mandatory upload may reduce autonomy for citizens without digital access.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Progressive eligibility guidance preserves dignity better than immediate denial."],
  risks: ["Repeated failures may erode trust in institutions."],
  unknowns: ["Vulnerable group profiles are not specified in the decision context."],
  humanImpact: ["Short-term anxiety for citizens fearing upload mistakes."],
  ethicalConcerns: ["Mandatory digital submission may widen equity gaps."],
  inclusionConcerns: ["Citizens without smartphones may be excluded."],
  longTermEffects: ["May shift support burden to digital channels permanently."],
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

const validChairmanPayload = {
  executiveSummary: "The council supports scoped image upload with safeguards.",
  finalRecommendation: "Proceed with image upload only for required document evidence.",
  decision: "proceed_with_conditions",
  consensus: ["Uploads must remain scoped and privacy-preserving."],
  disagreements: ["Timing of rollout."],
  keyArguments: ["Document evidence can improve journey completion."],
  risks: ["Privacy exposure if uploads are not scoped."],
  conditions: ["Encrypt stored uploads and limit retention."],
  nextSteps: ["Pilot upload in one journey."],
  confidence: 75,
};

const sampleDecision = {
  id: "DEC-20260720-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
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
      choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    }),
  };
}

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ...Object.fromEntries(
      Object.keys(advisorModels).map((key) => [key, process.env[key]]),
    ),
  };

  process.env.OPENROUTER_API_KEY = "test-key";
  for (const [key, value] of Object.entries(advisorModels)) {
    process.env[key] = value;
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  for (const key of Object.keys(advisorModels)) {
    process.env[key] = originalEnv[key];
  }
  mock.restoreAll();
});

test("runCouncil shares one Decision Context across all advisors and Chairman", async () => {
  const promptBodies = [];

  globalThis.fetch = mock.fn(async (_url, options) => {
    promptBodies.push(JSON.parse(options.body));
    const model = promptBodies.at(-1).model;

    if (model === "test/chairman") {
      return createOpenRouterResponse(validChairmanPayload, model);
    }

    return createOpenRouterResponse(createAdvisorResponse(model), model);
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");
  const result = await runCouncil(sampleDecision);

  assert.equal(result.advisors.length, 5);
  assert.equal(result.integrity.question, sampleDecision.question);
  assert.equal(result.decisionContext.question, sampleDecision.question);

  for (const advisor of result.advisors) {
    assert.equal(advisor.executionId, result.integrity.executionId);
    assert.equal(advisor.source, "live");
  }

  assert.ok(result.chairman);
  assert.equal(result.chairman.executionId, result.integrity.executionId);
  assert.equal(promptBodies.length, 6);

  for (const body of promptBodies.slice(0, 5)) {
    const userMessage = body.messages.find((message) => message.role === "user").content;
    assert.match(userMessage, /Should Prodignus implement image upload\?/);
    assert.match(userMessage, new RegExp(result.integrity.executionId));
  }

  const chairmanUserMessage = promptBodies[5].messages.find(
    (message) => message.role === "user",
  ).content;
  assert.match(chairmanUserMessage, /Should Prodignus implement image upload\?/);
  assert.match(chairmanUserMessage, /Image upload can deliver citizen value if scoped to required evidence/);
});

test("runCouncil returns failed Chairman without throwing when synthesis fails", async () => {
  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);

    if (body.model === "test/chairman") {
      return createOpenRouterResponse({ invalid: true }, body.model);
    }

    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model);
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");
  const result = await runCouncil(sampleDecision);

  assert.ok(result.chairman);
  assert.equal(result.chairman.status, "failed");
  assert.ok(result.chairman.errorMessage);
  assert.equal(
    result.advisors.filter((advisor) => advisor.status === "success").length,
    5,
  );
});

test("different decisions produce different advisor prompts across the council", async () => {
  const capturedQuestions = [];

  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    const userMessage = body.messages.find((message) => message.role === "user").content;
    capturedQuestions.push(userMessage);

    if (body.model === "test/chairman") {
      return createOpenRouterResponse(validChairmanPayload, body.model);
    }

    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model);
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");

  await runCouncil(sampleDecision);
  await runCouncil({
    ...sampleDecision,
    id: "DEC-20260720-002",
    question: "Should Prodignus implement push notifications?",
  });

  const imageUploadPrompts = capturedQuestions.slice(0, 5);
  const pushPrompts = capturedQuestions.slice(6, 11);

  for (const prompt of imageUploadPrompts) {
    assert.match(prompt, /image upload/i);
  }

  for (const prompt of pushPrompts) {
    assert.match(prompt, /push notifications/i);
  }
});
