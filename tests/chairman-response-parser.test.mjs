import assert from "node:assert/strict";
import test from "node:test";

import { parseChairmanResponseContent } from "../src/lib/council/chairman-response-parser.ts";
import { validChairmanPayload } from "./chairman-fixtures.mjs";

test("parseChairmanResponseContent parses valid JSON", () => {
  const result = parseChairmanResponseContent(JSON.stringify(validChairmanPayload));

  assert.equal(result.recommendationType, "run_bounded_experiment");
  assert.equal(result.decision, "test_first");
  assert.equal(result.executiveSummary, validChairmanPayload.executiveSummary);
  assert.equal(result.decisionStatement, validChairmanPayload.decisionStatement);
  assert.equal(result.nextActions.length, 1);
  assert.equal(result.reversalCriteria.length, 1);
  assert.equal(result.disagreements[0].topic, validChairmanPayload.disagreements[0].topic);
  assert.equal(result.minorityView?.advisorId, "ADV-001");
  assert.equal(result.confidence, 78);
});

test("parseChairmanResponseContent normalizes confidence from 0-1", () => {
  const result = parseChairmanResponseContent(
    JSON.stringify({ ...validChairmanPayload, confidence: 0.78 }),
  );

  assert.equal(result.confidence, 78);
});

test("parseChairmanResponseContent strips markdown fences", () => {
  const fenced = "```json\n" + JSON.stringify(validChairmanPayload) + "\n```";
  const result = parseChairmanResponseContent(fenced);

  assert.equal(result.recommendationType, "run_bounded_experiment");
});

test("parseChairmanResponseContent accepts legacy decision and nextSteps fields", () => {
  const legacyPayload = {
    executiveSummary: validChairmanPayload.executiveSummary,
    finalRecommendation: validChairmanPayload.finalRecommendation,
    decision: "test_first",
    consensus: validChairmanPayload.consensus,
    disagreements: ["Scope of the initial pilot."],
    keyArguments: validChairmanPayload.keyArguments,
    risks: validChairmanPayload.risks,
    conditions: validChairmanPayload.conditions,
    nextSteps: ["Define pilot metrics."],
    reversalCriteria: validChairmanPayload.reversalCriteria,
    confidence: 72,
  };

  const result = parseChairmanResponseContent(JSON.stringify(legacyPayload));

  assert.equal(result.recommendationType, "run_bounded_experiment");
  assert.equal(result.nextActions.length, 1);
});

test("parseChairmanResponseContent rejects invalid recommendation type", () => {
  assert.throws(
    () =>
      parseChairmanResponseContent(
        JSON.stringify({ ...validChairmanPayload, recommendationType: "maybe_proceed" }),
      ),
    /recommendationType must be a valid chairman recommendation type/,
  );
});

test("parseChairmanResponseContent rejects missing next actions", () => {
  const payload = { ...validChairmanPayload };
  delete payload.nextActions;

  assert.throws(
    () => parseChairmanResponseContent(JSON.stringify({ ...payload, nextActions: [] })),
    /nextActions must contain at least one action/,
  );
});

test("parseChairmanResponseContent rejects missing reversal criteria", () => {
  assert.throws(
    () =>
      parseChairmanResponseContent(
        JSON.stringify({ ...validChairmanPayload, reversalCriteria: [] }),
      ),
    /reversalCriteria must contain at least one item/,
  );
});

test("parseChairmanResponseContent rejects malformed JSON", () => {
  assert.throws(() => parseChairmanResponseContent("{not-json"), /not valid JSON/);
});

test("parseChairmanResponseContent renumbers duplicate next action sequences", () => {
  const result = parseChairmanResponseContent(
    JSON.stringify({
      ...validChairmanPayload,
      nextActions: [
        {
          action: "Second action",
          sequence: 2,
          expectedOutcome: "Outcome B",
        },
        {
          action: "First action",
          sequence: 2,
          expectedOutcome: "Outcome A",
        },
      ],
    }),
  );

  assert.deepEqual(
    result.nextActions.map((action) => action.sequence),
    [1, 2],
  );
});
