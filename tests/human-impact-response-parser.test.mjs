import assert from "node:assert/strict";
import test from "node:test";

import { parseHumanImpactResponseContent } from "../src/lib/council/advisors/human-impact-response-parser.ts";

const validPayload = {
  summary: "Image upload may empower citizens but risks anxiety for those fearing mistakes.",
  analysis: [
    {
      title: "Autonomy and dignity",
      description:
        "Citizens who cannot upload may feel excluded; guided onboarding preserves dignity.",
    },
    {
      title: "Human outcome alternative",
      description:
        "Instead of requiring documents immediately, provide progressive eligibility guidance.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: [
    "Document submission can reduce caseworker dependency if citizens retain control over what they share.",
  ],
  risks: ["Citizens with low digital literacy may experience shame after repeated upload failures."],
  unknowns: ["Percentage of citizens who lack devices capable of camera capture is unknown."],
  humanImpact: [
    "Short-term: faster verification for citizens who can upload successfully.",
    "Long-term: potential dependency on digital submission channels.",
  ],
  ethicalConcerns: [
    "Power imbalance may increase if upload becomes mandatory without offline alternatives.",
  ],
  inclusionConcerns: [
    "Citizens without smartphones or stable connectivity may be excluded.",
  ],
  longTermEffects: [
    "May normalize digital-only access, reducing face-to-face support pathways over time.",
  ],
  confidence: 66,
};

test("parseHumanImpactResponseContent parses valid JSON", () => {
  const result = parseHumanImpactResponseContent(JSON.stringify(validPayload));

  assert.equal(result.summary, validPayload.summary);
  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.deepEqual(result.keyArguments, validPayload.keyArguments);
  assert.deepEqual(result.unknowns, validPayload.unknowns);
  assert.deepEqual(result.humanImpact, validPayload.humanImpact);
  assert.deepEqual(result.ethicalConcerns, validPayload.ethicalConcerns);
  assert.deepEqual(result.inclusionConcerns, validPayload.inclusionConcerns);
  assert.deepEqual(result.longTermEffects, validPayload.longTermEffects);
  assert.equal(result.confidence, 66);
});

test("parseHumanImpactResponseContent accepts insufficient_information with unknowns", () => {
  const payload = {
    ...validPayload,
    recommendation: "insufficient_information",
    unknowns: [
      "Target vulnerable groups are not identified in the decision context.",
      "Unknown user assumptions: literacy levels and device access patterns.",
      "Question: what percentage of citizens rely on assisted submission today?",
    ],
  };

  const result = parseHumanImpactResponseContent(JSON.stringify(payload));

  assert.equal(result.recommendation, "insufficient_information");
  assert.equal(result.unknowns.length, 3);
});

test("parseHumanImpactResponseContent rejects missing keyArguments", () => {
  assert.throws(
    () =>
      parseHumanImpactResponseContent(JSON.stringify({ ...validPayload, keyArguments: [] })),
    /keyArguments must not be empty/,
  );
});

test("parseHumanImpactResponseContent rejects missing humanImpact", () => {
  assert.throws(
    () =>
      parseHumanImpactResponseContent(JSON.stringify({ ...validPayload, humanImpact: [] })),
    /humanImpact must not be empty/,
  );
});

test("parseHumanImpactResponseContent rejects malformed JSON", () => {
  assert.throws(
    () => parseHumanImpactResponseContent("{not-json"),
    /not valid JSON/,
  );
});

test("parseHumanImpactResponseContent strips markdown fences", () => {
  const fenced = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
  const result = parseHumanImpactResponseContent(fenced);

  assert.equal(result.summary, validPayload.summary);
});
