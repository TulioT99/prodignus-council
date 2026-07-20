import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVISOR_CALIBRATION_LIMITS,
  ADVISOR_CALIBRATION_MARKERS,
  buildExecutiveOutputRequirements,
} from "../src/lib/council/advisor-calibration.ts";
import { buildAdvisorPrompts } from "../src/lib/council/advisor-prompt.ts";
import { buildDeliveryEngineeringPrompts } from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
import { DELIVERY_ENGINEERING_PROMPT_MARKERS } from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
import { buildHumanImpactPrompts } from "../src/lib/council/advisors/human-impact-prompt.ts";
import { HUMAN_IMPACT_PROMPT_MARKERS } from "../src/lib/council/advisors/human-impact-prompt.ts";
import { buildProductStrategyPrompts } from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { PRODUCT_STRATEGY_PROMPT_MARKERS } from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { buildUxAccessibilityPrompts } from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
import { UX_ACCESSIBILITY_PROMPT_MARKERS } from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
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

const INTELLIGENCE_MARKERS = [
  ADVISOR_CALIBRATION_MARKERS.decisionUnderUncertainty,
  ADVISOR_CALIBRATION_MARKERS.executiveArguments,
  ADVISOR_CALIBRATION_MARKERS.evidenceVsRecommendation,
  ADVISOR_CALIBRATION_MARKERS.recommendationDiscipline,
  ADVISOR_CALIBRATION_MARKERS.uniqueContribution,
  ADVISOR_CALIBRATION_MARKERS.decisionBlockingUnknowns,
  ADVISOR_CALIBRATION_MARKERS.executiveLanguage,
  ADVISOR_CALIBRATION_MARKERS.alternativeQuality,
  ADVISOR_CALIBRATION_MARKERS.targetThree,
];

const promptBuilders = [
  ["ADV-001", () => buildAdvisorPrompts(createDecisionContext(decision, { executionId: "EXEC-001" }), getAdvisorPersonaById("ADV-001"))],
  ["ADV-002", () => buildProductStrategyPrompts(createDecisionContext(decision, { executionId: "EXEC-002" }))],
  ["ADV-003", () => buildUxAccessibilityPrompts(createDecisionContext(decision, { executionId: "EXEC-003" }))],
  ["ADV-004", () => buildDeliveryEngineeringPrompts(createDecisionContext(decision, { executionId: "EXEC-004" }))],
  ["ADV-005", () => buildHumanImpactPrompts(createDecisionContext(decision, { executionId: "EXEC-005" }))],
];

for (const [advisorId, buildPrompts] of promptBuilders) {
  test(`${advisorId} prompt includes decision intelligence refinement`, () => {
    const { systemPrompt, userPrompt } = buildPrompts();

    for (const marker of INTELLIGENCE_MARKERS) {
      assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    assert.match(userPrompt, /target 3/i);
    assert.match(userPrompt, /Recommendation Confidence/i);
    assert.match(userPrompt, /decision-blocking/i);
    assert.match(userPrompt, /direct executive language/i);
  });
}

test("buildExecutiveOutputRequirements encodes target vs maximum philosophy", () => {
  const requirements = buildExecutiveOutputRequirements();

  assert.match(requirements, /target 3/i);
  assert.match(requirements, /maximum 5/i);
  assert.match(requirements, /Executive Arguments/i);
  assert.match(requirements, /Recommendation Confidence/i);
});

test("calibration limits define target three and maximum five", () => {
  assert.equal(ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS, 3);
  assert.equal(ADVISOR_CALIBRATION_LIMITS.MAX_KEY_ARGUMENTS, 5);
});

test("dedicated advisors expose decision intelligence markers", () => {
  for (const markers of [
    PRODUCT_STRATEGY_PROMPT_MARKERS.calibrationMarkers,
    UX_ACCESSIBILITY_PROMPT_MARKERS.decisionIntelligenceMarkers,
    DELIVERY_ENGINEERING_PROMPT_MARKERS.decisionIntelligenceMarkers,
    HUMAN_IMPACT_PROMPT_MARKERS.decisionIntelligenceMarkers,
  ]) {
    assert.ok(markers.length >= 3);
    assert.ok(markers.some((marker) => marker.includes("Executive Committee") || marker.includes("Recommendation Confidence") || marker.includes("decision-blocking")));
  }
});

test("prompts do not require new JSON fields for evidence confidence", () => {
  const { systemPrompt } = buildProductStrategyPrompts(
    createDecisionContext(decision, { executionId: "EXEC-002" }),
  );

  assert.match(systemPrompt, /do NOT add fields to JSON/i);
  assert.match(systemPrompt, /single public confidence field/i);
});
