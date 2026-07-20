import assert from "node:assert/strict";
import test from "node:test";

import { parseChairmanResponseContent } from "../src/lib/council/chairman-response-parser.ts";

const validPayload = {
  executiveSummary: "The council supports a bounded pilot with safeguards.",
  finalRecommendation:
    "Proceed with a tightly scoped test-first pilot embedded within guided journeys.",
  decision: "test_first",
  consensus: ["Guided journeys remain the primary interaction model."],
  disagreements: ["Whether any open-ended AI entry point should exist."],
  keyArguments: [
    "Vulnerable citizens need verifiable, bounded assistance rather than open chat.",
  ],
  risks: ["Pilot results may not generalize across municipalities."],
  conditions: ["Human escalation must be mandatory for eligibility decisions."],
  nextSteps: ["Run a 12-week pilot in two high-volume journeys."],
  confidence: 78,
};

test("parseChairmanResponseContent parses valid JSON", () => {
  const result = parseChairmanResponseContent(JSON.stringify(validPayload));

  assert.equal(result.decision, "test_first");
  assert.equal(result.executiveSummary, validPayload.executiveSummary);
  assert.equal(result.finalRecommendation, validPayload.finalRecommendation);
  assert.deepEqual(result.consensus, validPayload.consensus);
  assert.deepEqual(result.disagreements, validPayload.disagreements);
  assert.deepEqual(result.keyArguments, validPayload.keyArguments);
  assert.deepEqual(result.risks, validPayload.risks);
  assert.deepEqual(result.conditions, validPayload.conditions);
  assert.deepEqual(result.nextSteps, validPayload.nextSteps);
  assert.equal(result.confidence, 78);
});

test("parseChairmanResponseContent strips markdown fences", () => {
  const fenced = "```json\n" + JSON.stringify(validPayload) + "\n```";
  const result = parseChairmanResponseContent(fenced);

  assert.equal(result.decision, "test_first");
});

test("parseChairmanResponseContent rejects invalid decision enum", () => {
  assert.throws(
    () =>
      parseChairmanResponseContent(
        JSON.stringify({ ...validPayload, decision: "maybe_proceed" }),
      ),
    /decision must be a valid council decision/,
  );
});

test("parseChairmanResponseContent rejects confidence outside 0-100", () => {
  assert.throws(
    () =>
      parseChairmanResponseContent(JSON.stringify({ ...validPayload, confidence: 150 })),
    /confidence must be between 0 and 100/,
  );
});

test("parseChairmanResponseContent rejects malformed JSON", () => {
  assert.throws(() => parseChairmanResponseContent("{not-json"), /not valid JSON/);
});
