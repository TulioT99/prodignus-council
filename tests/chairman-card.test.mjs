import assert from "node:assert/strict";
import test from "node:test";

import { validChairmanPayload } from "./chairman-fixtures.mjs";
import {
  buildCouncilRecommendationBriefing,
  CHAIRMAN_RECOMMENDATION_HEADLINES,
  CHAIRMAN_RECOMMENDATION_LABELS,
  COUNCIL_RECOMMENDATION_UI,
  shouldRenderCouncilRecommendation,
} from "../src/lib/council/council-display.ts";
import {
  buildConditionPresentation,
  buildCouncilRecommendationRenderSnapshot,
  buildExecutiveCouncilRecommendationPresentation,
  buildNextStepPresentation,
  buildRationalePresentation,
  buildRiskPresentation,
  excerptAtSentenceBoundary,
  RATIONALE_COLLAPSE_THRESHOLD,
  validateCouncilRecommendationContentPreservation,
} from "../src/lib/council/council-recommendation-presentation.ts";

function createSuccessfulChairman(overrides = {}) {
  return {
    status: "success",
    executionId: "EXEC-UI-001",
    decision: "test_first",
    decisionStatement: validChairmanPayload.decisionStatement,
    executiveSummary: validChairmanPayload.executiveSummary,
    finalRecommendation: validChairmanPayload.finalRecommendation,
    rationale: validChairmanPayload.finalRecommendation,
    recommendationType: "run_bounded_experiment",
    consensus: validChairmanPayload.consensus,
    disagreements: ["Contrarian warns about hidden operational costs."],
    structuredDisagreements: validChairmanPayload.disagreements,
    decisiveTradeoffs: validChairmanPayload.decisiveTradeoffs,
    assumptions: validChairmanPayload.assumptions,
    conditions: validChairmanPayload.conditions,
    risks: validChairmanPayload.risks,
    unknowns: validChairmanPayload.unknowns,
    minorityView: validChairmanPayload.minorityView,
    minimumAdditionalEvidence: validChairmanPayload.minimumAdditionalEvidence,
    nextActions: validChairmanPayload.nextActions,
    reversalCriteria: validChairmanPayload.reversalCriteria,
    keyArguments: validChairmanPayload.keyArguments,
    nextSteps: validChairmanPayload.nextActions.map((action) => action.action),
    confidence: 0.78,
    model: "test/chairman",
    durationMs: 1200,
    totalTokens: 300,
    ...overrides,
  };
}

function createLongText(prefix, count = 120) {
  return Array.from({ length: count }, (_, index) => `${prefix} sentence ${index + 1}.`).join(
    " ",
  );
}

test("Council Recommendation title is defined for the executive layout", () => {
  assert.equal(COUNCIL_RECOMMENDATION_UI.title, "Council Recommendation");
});

test("legacy system labels are not used in the executive UI copy", () => {
  const uiCopy = [
    COUNCIL_RECOMMENDATION_UI.title,
    COUNCIL_RECOMMENDATION_UI.overallConfidence,
    COUNCIL_RECOMMENDATION_UI.decisionSummary,
    COUNCIL_RECOMMENDATION_UI.whyRecommendation,
    COUNCIL_RECOMMENDATION_UI.keyRisks,
    COUNCIL_RECOMMENDATION_UI.conditionsForSuccess,
    COUNCIL_RECOMMENDATION_UI.suggestedNextSteps,
  ].join(" ");

  assert.doesNotMatch(uiCopy, /Chairman decision/i);
  assert.doesNotMatch(uiCopy, /Primary recommendation/i);
  assert.doesNotMatch(uiCopy, /Recommendation type/i);
});

test("executive section labels match the required hierarchy", () => {
  assert.equal(COUNCIL_RECOMMENDATION_UI.overallConfidence, "Overall confidence");
  assert.equal(COUNCIL_RECOMMENDATION_UI.decisionSummary, "Decision summary");
  assert.equal(COUNCIL_RECOMMENDATION_UI.whyRecommendation, "Why this recommendation?");
  assert.equal(COUNCIL_RECOMMENDATION_UI.keyRisks, "Key risks");
  assert.equal(COUNCIL_RECOMMENDATION_UI.conditionsForSuccess, "Conditions for success");
  assert.equal(COUNCIL_RECOMMENDATION_UI.suggestedNextSteps, "Suggested next steps");
  assert.equal(
    COUNCIL_RECOMMENDATION_UI.noRisks,
    "No specific risks were included in the Council synthesis.",
  );
});

test("buildCouncilRecommendationBriefing maps fields to executive sections", () => {
  const briefing = buildCouncilRecommendationBriefing(createSuccessfulChairman());

  assert.equal(
    briefing.headline,
    CHAIRMAN_RECOMMENDATION_HEADLINES.run_bounded_experiment,
  );
  assert.equal(briefing.overallConfidenceLabel, "78%");
  assert.equal(briefing.decisionSummary, validChairmanPayload.decisionStatement);
  assert.equal(briefing.whyRecommendation, validChairmanPayload.finalRecommendation);
});

test("long rationale is collapsed by default without rewriting content", () => {
  const fullText = createLongText("Advisor evidence supports a bounded pilot");
  const presentation = buildRationalePresentation(fullText, [
    "Citizen safety requires bounded rollout.",
    "Operational risk is manageable in one journey.",
  ]);

  assert.equal(presentation.fullText, fullText);
  assert.equal(presentation.isExpandable, true);
  assert.ok(presentation.collapsedIntro.length < fullText.length);
  assert.ok(presentation.collapsedIntro.length <= RATIONALE_COLLAPSE_THRESHOLD + 100);
  assert.ok(fullText.startsWith(presentation.collapsedIntro.split(".")[0].slice(0, 20)));
  assert.deepEqual(presentation.keyReasoningPoints, [
    "Citizen safety requires bounded rollout.",
    "Operational risk is manageable in one journey.",
  ]);
});

test("short rationale is fully visible without an expander", () => {
  const fullText = "Evidence supports a bounded pilot with safeguards.";
  const presentation = buildRationalePresentation(fullText, []);

  assert.equal(presentation.isExpandable, false);
  assert.equal(presentation.collapsedIntro, fullText);
});

test("excerptAtSentenceBoundary avoids cutting mid-word", () => {
  const text =
    "First sentence about pilot scope. Second sentence about operational safeguards and citizen safety.";
  const excerpt = excerptAtSentenceBoundary(text, 45);

  assert.equal(excerpt, "First sentence about pilot scope.");
  assert.doesNotMatch(excerpt, /scope\. Second/);
});

test("first three risks are visible and additional risks are separated", () => {
  const risks = [
    "Risk one about pilot scope.",
    "Risk two about operational load.",
    "Risk three about citizen trust.",
    "Risk four about vendor dependency.",
    "Risk five about data quality.",
  ];
  const presentation = buildRiskPresentation(risks);

  assert.deepEqual(presentation.priorityRisks, risks.slice(0, 3));
  assert.deepEqual(presentation.additionalRisks, risks.slice(3));
  assert.equal(presentation.showExpander, true);
});

test("three or fewer risks do not require an expander", () => {
  const presentation = buildRiskPresentation(["Risk one.", "Risk two."]);

  assert.equal(presentation.showExpander, false);
  assert.deepEqual(presentation.additionalRisks, []);
});

test("conditions are grouped without loss or duplication", () => {
  const conditions = [
    "Launch as a pilot in one journey only.",
    "Provide staff training before rollout.",
    "Ensure offline accessibility for vulnerable citizens.",
    "Collect completion rate metrics before expansion.",
    "Maintain a general governance checkpoint.",
  ];
  const presentation = buildConditionPresentation(conditions);

  const rendered = presentation.groups.flatMap((group) => group.items);
  assert.deepEqual(rendered, conditions);
  assert.ok(presentation.groups.some((group) => group.label === "Controlled scope"));
  assert.ok(presentation.groups.some((group) => group.label === "Additional conditions"));
});

test("unclassified conditions appear under Additional conditions", () => {
  const presentation = buildConditionPresentation([
    "Maintain a general governance checkpoint.",
  ]);

  assert.equal(presentation.groups.length, 1);
  assert.equal(presentation.groups[0].label, "Additional conditions");
});

test("next steps preserve order and optional fields", () => {
  const steps = buildNextStepPresentation([
    {
      action: "Select the pilot journey",
      owner: "Product Strategy Lead",
      sequence: 1,
      expectedOutcome: "Documented workflow and capacity assessment.",
    },
    {
      action: "Publish monitoring dashboard",
      sequence: 2,
      expectedOutcome: "Operational visibility for the pilot.",
    },
  ]);

  assert.equal(steps.length, 2);
  assert.equal(steps[0].owner, "Product Strategy Lead");
  assert.equal(steps[0].expectedOutcome, "Documented workflow and capacity assessment.");
  assert.equal(steps[1].owner, undefined);
});

test("content preservation validation confirms each risk, condition, and next step renders once", () => {
  const chairman = createSuccessfulChairman({
    risks: ["Risk A.", "Risk B.", "Risk C.", "Risk D."],
    conditions: [
      "Pilot in one journey only.",
      "Provide staff training.",
      "Maintain governance checkpoint.",
    ],
    nextActions: [
      {
        action: "Select the pilot journey",
        owner: "Product Strategy Lead",
        sequence: 1,
        expectedOutcome: "Documented workflow.",
      },
      {
        action: "Publish monitoring dashboard",
        sequence: 2,
        expectedOutcome: "Operational visibility.",
      },
    ],
  });

  const presentation = buildExecutiveCouncilRecommendationPresentation(chairman);
  const snapshot = buildCouncilRecommendationRenderSnapshot(presentation);
  const validation = validateCouncilRecommendationContentPreservation(chairman, snapshot);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.missingRisks, []);
  assert.deepEqual(validation.duplicateRisks, []);
  assert.deepEqual(validation.missingConditions, []);
  assert.deepEqual(validation.duplicateConditions, []);
  assert.deepEqual(validation.missingNextSteps, []);
  assert.deepEqual(validation.duplicateNextSteps, []);
});

test("shouldRenderCouncilRecommendation is true only for successful Chairman results", () => {
  assert.equal(shouldRenderCouncilRecommendation(createSuccessfulChairman()), true);
  assert.equal(
    shouldRenderCouncilRecommendation({
      ...createSuccessfulChairman(),
      status: "failed",
    }),
    false,
  );
});

test("recommendation taxonomy remains available on the data model", () => {
  const chairman = createSuccessfulChairman();
  assert.equal(chairman.recommendationType, "run_bounded_experiment");
  assert.equal(CHAIRMAN_RECOMMENDATION_LABELS.run_bounded_experiment, "Run a bounded experiment");
});

test("executive presentation keeps the top hierarchy fields intact", () => {
  const presentation = buildExecutiveCouncilRecommendationPresentation(
    createSuccessfulChairman(),
  );

  assert.equal(presentation.briefing.headline, "Proceed with a bounded pilot");
  assert.equal(presentation.briefing.overallConfidenceLabel, "78%");
  assert.ok(presentation.briefing.decisionSummary);
  assert.ok(presentation.rationale);
  assert.ok(presentation.nextSteps.length > 0);
});

test("neutral empty-state wording is used for optional sections", () => {
  const presentation = buildExecutiveCouncilRecommendationPresentation(
    createSuccessfulChairman({ risks: [], conditions: [], nextActions: [] }),
  );

  assert.deepEqual(presentation.risks.priorityRisks, []);
  assert.deepEqual(presentation.conditions.groups, []);
  assert.deepEqual(presentation.nextSteps, []);
});
