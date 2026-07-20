import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVISOR_CALIBRATION_LIMITS,
  ADVISOR_CALIBRATION_MARKERS,
} from "../src/lib/council/advisor-calibration.ts";
import { buildAdvisorPrompts } from "../src/lib/council/advisor-prompt.ts";
import { buildDeliveryEngineeringPrompts } from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
import { parseDeliveryEngineeringResponseContent } from "../src/lib/council/advisors/delivery-engineering-response-parser.ts";
import { buildHumanImpactPrompts } from "../src/lib/council/advisors/human-impact-prompt.ts";
import { parseHumanImpactResponseContent } from "../src/lib/council/advisors/human-impact-response-parser.ts";
import { buildProductStrategyPrompts } from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { parseProductStrategyResponseContent } from "../src/lib/council/advisors/product-strategy-response-parser.ts";
import { buildUxAccessibilityPrompts } from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
import { parseUxAccessibilityResponseContent } from "../src/lib/council/advisors/ux-accessibility-response-parser.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
import { parseAdvisorResponseContent } from "../src/lib/council/response-parser.ts";
import { getAdvisorPersonaById } from "../src/data/advisor-personas.ts";

const decision = {
  id: "DEC-A-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const VALID_RECOMMENDATIONS = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

const promptBuilders = [
  ["ADV-001 Contrarian", () => buildAdvisorPrompts(createDecisionContext(decision, { executionId: "EXEC-001" }), getAdvisorPersonaById("ADV-001"))],
  ["ADV-002 Product Strategy", () => buildProductStrategyPrompts(createDecisionContext(decision, { executionId: "EXEC-002" }))],
  ["ADV-003 UX Accessibility", () => buildUxAccessibilityPrompts(createDecisionContext(decision, { executionId: "EXEC-003" }))],
  ["ADV-004 Delivery Engineering", () => buildDeliveryEngineeringPrompts(createDecisionContext(decision, { executionId: "EXEC-004" }))],
  ["ADV-005 Human Impact", () => buildHumanImpactPrompts(createDecisionContext(decision, { executionId: "EXEC-005" }))],
];

for (const [label, buildPrompts] of promptBuilders) {
  test(`${label} prompt includes decision-first calibration`, () => {
    const { systemPrompt, userPrompt } = buildPrompts();

    assert.match(systemPrompt, new RegExp(ADVISOR_CALIBRATION_MARKERS.decisionMindset));
    assert.match(
      systemPrompt,
      new RegExp(
        ADVISOR_CALIBRATION_MARKERS.insufficientInformationRare.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    );
    assert.match(systemPrompt, new RegExp(ADVISOR_CALIBRATION_MARKERS.factsAssumptionsUnknowns));
    assert.match(userPrompt, /avoid insufficient_information unless unavoidable/i);
  });

  test(`${label} prompt enforces output limits`, () => {
    const { systemPrompt, userPrompt } = buildPrompts();

    assert.match(systemPrompt, /target 3/i);
    assert.match(systemPrompt, /maximum 5/i);
    assert.match(userPrompt, /target 3/i);
    assert.match(userPrompt, /maximum 5/i);
  });
}

test("calibration limits are applied consistently", () => {
  assert.equal(ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS, 3);
  assert.equal(ADVISOR_CALIBRATION_LIMITS.MAX_KEY_ARGUMENTS, 5);
  assert.equal(ADVISOR_CALIBRATION_LIMITS.MAX_UNKNOWNS, 5);
  assert.equal(ADVISOR_CALIBRATION_LIMITS.MAX_RISKS, 5);
  assert.equal(ADVISOR_CALIBRATION_LIMITS.MAX_ANALYSIS_ITEMS, 5);
});

const productStrategyPayload = {
  summary: "Scoped upload aligns with citizen value if validated incrementally.",
  analysis: [{ title: "User problem", description: "Citizens need evidence submission without abandoning journeys." }],
  recommendation: "test_first",
  keyArguments: ["Scoped uploads can reduce clarification loops."],
  risks: ["Privacy exposure if uploads are not bounded."],
  assumptions: ["Low-end devices can capture required evidence."],
  unknowns: ["Upload success rate on target devices is unknown."],
  confidence: 68,
};

test("parseProductStrategyResponseContent rejects excessive unknowns", () => {
  assert.throws(
    () =>
      parseProductStrategyResponseContent(
        JSON.stringify({
          ...productStrategyPayload,
          unknowns: Array.from({ length: 6 }, (_, index) => `Unknown ${index + 1}`),
        }),
      ),
    /unknowns must contain at most 5 items/,
  );
});

test("parseProductStrategyResponseContent rejects excessive keyArguments", () => {
  assert.throws(
    () =>
      parseProductStrategyResponseContent(
        JSON.stringify({
          ...productStrategyPayload,
          keyArguments: Array.from({ length: 6 }, (_, index) => `Argument ${index + 1}`),
        }),
      ),
    /keyArguments must contain at most 5 items/,
  );
});

test("parseProductStrategyResponseContent accepts all recommendation categories", () => {
  for (const recommendation of VALID_RECOMMENDATIONS) {
    const result = parseProductStrategyResponseContent(
      JSON.stringify({ ...productStrategyPayload, recommendation }),
    );
    assert.equal(result.recommendation, recommendation);
  }
});

test("parseAdvisorResponseContent rejects excessive risks for Contrarian", () => {
  const contrarianPayload = {
    summary: "Proceed only with strict safeguards.",
    analysis: [{ title: "Hidden costs", description: "Operational burden may exceed estimates." }],
    assumptions: ["Storage can be bounded per journey."],
    risks: Array.from({ length: 6 }, (_, index) => `Risk ${index + 1}`),
    recommendation: "proceed_with_conditions",
    confidence: 60,
  };

  assert.throws(
    () => parseAdvisorResponseContent(JSON.stringify(contrarianPayload)),
    /risks must contain at most 5 items/,
  );
});

test("parseUxAccessibilityResponseContent rejects excessive analysis sections", () => {
  const uxPayload = {
    summary: "Upload may work with guided capture.",
    analysis: Array.from({ length: 6 }, (_, index) => ({
      title: `Section ${index + 1}`,
      description: "Cognitive load remains manageable with one task at a time.",
    })),
    recommendation: "test_first",
    keyArguments: ["Guided capture reduces abandonment."],
    risks: ["Repeated failures erode trust."],
    unknowns: ["Device profile is unspecified."],
    accessibilityConcerns: ["Color-only errors exclude low-vision users."],
    journeyBarriers: ["Poor connectivity interrupts uploads."],
    confidence: 65,
  };

  assert.throws(
    () => parseUxAccessibilityResponseContent(JSON.stringify(uxPayload)),
    /analysis must contain at most 5 items/,
  );
});

test("parseDeliveryEngineeringResponseContent rejects excessive technicalAlternatives", () => {
  const engineeringPayload = {
    summary: "Feasible with phased rollout.",
    analysis: [{ title: "Deployment", description: "Feature flag reduces rollout risk." }],
    recommendation: "proceed_with_conditions",
    keyArguments: ["Existing storage patterns can be reused."],
    risks: ["Cost overrun — mitigation: retention limits."],
    unknowns: ["Storage quota is unspecified."],
    engineeringConcerns: ["Auth integration required."],
    operationalConcerns: ["Failure metrics must be observable."],
    technicalAlternatives: Array.from({ length: 6 }, (_, index) => `Alternative ${index + 1}`),
    confidence: 70,
  };

  assert.throws(
    () => parseDeliveryEngineeringResponseContent(JSON.stringify(engineeringPayload)),
    /technicalAlternatives must contain at most 5 items/,
  );
});

test("parseHumanImpactResponseContent separates facts assumptions and unknowns via required fields", () => {
  const result = parseHumanImpactResponseContent(
    JSON.stringify({
      summary: "Mixed outcomes depending on access pathways.",
      analysis: [{ title: "Autonomy", description: "Offline alternatives preserve dignity." }],
      recommendation: "proceed_with_conditions",
      keyArguments: ["Progressive eligibility guidance improves outcomes."],
      risks: ["Digital-only access may exclude vulnerable citizens."],
      unknowns: ["Assisted submission rate today is unknown."],
      humanImpact: ["Short-term stress for citizens fearing mistakes."],
      ethicalConcerns: ["Power imbalance if upload becomes mandatory."],
      inclusionConcerns: ["Citizens without smartphones may be excluded."],
      longTermEffects: ["May normalize digital-only service pathways."],
      confidence: 64,
    }),
  );

  assert.equal(result.unknowns.length, 1);
  assert.equal(result.humanImpact.length, 1);
});
