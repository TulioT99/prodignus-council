import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvisorPrompts,
  ADVISOR_PROMPT_MARKERS,
} from "../src/lib/council/advisor-prompt.ts";
import { parseAdvisorResponseContent } from "../src/lib/council/response-parser.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
import { getAdvisorPersonaById } from "../src/data/advisor-personas.ts";

const decision = {
  id: "DEC-CON-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  expectedOutcome: "Faster document verification during guided journeys.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const validPayload = {
  summary: "Proceed only with strict safeguards on storage and retention.",
  analysis: [
    {
      title: "Hidden operational costs",
      description: "Upload infrastructure adds ongoing storage and support burden.",
    },
  ],
  assumptions: ["Per-journey storage can be bounded with retention policies."],
  risks: ["Cost overrun without lifecycle limits — mitigation: enforce per-journey caps."],
  recommendation: "proceed_with_conditions",
  confidence: 62,
};

test("ENG-0010: valid Contrarian response passes parser validation", () => {
  const result = parseAdvisorResponseContent(JSON.stringify(validPayload));

  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.equal(result.assumptions.length, 1);
  assert.equal(result.confidence, 62);
});

test("ENG-0010: Contrarian prompt maps schema to assumptions and risks", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-CON-001" });
  const { systemPrompt, userPrompt } = buildAdvisorPrompts(
    context,
    getAdvisorPersonaById("ADV-001"),
  );

  for (const marker of ADVISOR_PROMPT_MARKERS.schemaMappingMarkers) {
    assert.match(
      `${systemPrompt}\n${userPrompt}`,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(userPrompt, /Do NOT include keyArguments or unknowns/i);
  assert.doesNotMatch(userPrompt, /- keyArguments: target/i);
  assert.match(userPrompt, /"assumptions"/);
  assert.doesNotMatch(userPrompt, /"keyArguments"/);
});

test("ENG-0010: Contrarian prompt includes JSON field discipline", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-CON-001" });
  const { systemPrompt, userPrompt } = buildAdvisorPrompts(
    context,
    getAdvisorPersonaById("ADV-001"),
  );

  for (const marker of ADVISOR_PROMPT_MARKERS.jsonFieldDisciplineMarkers) {
    assert.match(
      `${systemPrompt}\n${userPrompt}`,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("ENG-0010: parser maps keyArguments to assumptions when assumptions are omitted", () => {
  const result = parseAdvisorResponseContent(
    JSON.stringify({
      summary: validPayload.summary,
      analysis: validPayload.analysis,
      keyArguments: ["Strongest case against proceeding as proposed."],
      risks: validPayload.risks,
      recommendation: validPayload.recommendation,
      confidence: validPayload.confidence,
    }),
  );

  assert.equal(result.assumptions.length, 1);
  assert.match(result.assumptions[0], /Strongest case against proceeding/);
});

test("ENG-0010: parser rejects unknowns without assumptions or keyArguments", () => {
  assert.throws(
    () =>
      parseAdvisorResponseContent(
        JSON.stringify({
          summary: validPayload.summary,
          analysis: validPayload.analysis,
          unknowns: ["Storage quota is unspecified."],
          risks: validPayload.risks,
          recommendation: validPayload.recommendation,
          confidence: validPayload.confidence,
        }),
      ),
    /assumptions must be an array/,
  );
});

test("ENG-0010: parser rejects omitted assumptions field", () => {
  const payload = { ...validPayload };
  delete payload.assumptions;

  assert.throws(
    () => parseAdvisorResponseContent(JSON.stringify(payload)),
    /assumptions must be an array/,
  );
});

test("ENG-0010: parser rejects omitted risks field", () => {
  const payload = { ...validPayload };
  delete payload.risks;

  assert.throws(
    () => parseAdvisorResponseContent(JSON.stringify(payload)),
    /risks must be an array/,
  );
});

test("ENG-0010: parser rejects invalid recommendation enum", () => {
  assert.throws(
    () =>
      parseAdvisorResponseContent(
        JSON.stringify({ ...validPayload, recommendation: "Proceed with Conditions" }),
      ),
    /recommendation must be a valid council decision/,
  );
});

test("ENG-0010: parser rejects string confidence", () => {
  assert.throws(
    () =>
      parseAdvisorResponseContent(JSON.stringify({ ...validPayload, confidence: "62" })),
    /confidence must be a finite number/,
  );
});

test("ENG-0010: parser rejects malformed JSON", () => {
  assert.throws(
    () => parseAdvisorResponseContent("{not-json"),
    /not valid JSON/,
  );
});

test("ENG-0010: parser accepts structured risk objects", () => {
  const result = parseAdvisorResponseContent(
    JSON.stringify({
      ...validPayload,
      risks: [
        {
          title: "Partner readiness",
          description: "Palmas partner capacity may be overstated.",
        },
      ],
    }),
  );

  assert.match(result.risks[0], /Partner readiness/);
});

test("ENG-0010: parser rejects empty analysis", () => {
  assert.throws(
    () =>
      parseAdvisorResponseContent(JSON.stringify({ ...validPayload, analysis: [] })),
    /analysis must be a non-empty array/,
  );
});
