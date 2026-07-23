import assert from "node:assert/strict";
import { test } from "node:test";

import { retrieveEvidenceForCouncil } from "../src/lib/pkos/context-retrieval-engine.ts";

const PKOS_PATH = "C:/Projects/Hercules/hercules-knowledge";

const baseContext = Object.freeze({
  executionId: "smoke-001",
  decisionId: "dec-001",
  title: "Smoke test",
  language: "en-US",
  context: "",
  constraints: "",
  attachments: Object.freeze([]),
  timestamp: "2026-07-23T12:00:00.000Z",
  status: "under_review",
});

test("Scenario A prioritizes ADR-0007 and ENG-0004 for direct access question", () => {
  process.env.PKOS_REPOSITORY_PATH = PKOS_PATH;
  const pkg = retrieveEvidenceForCouncil({
    ...baseContext,
    question: "Why must the Decision Council not access the PKOS directly?",
    context: "ADR-0007 and ENG-0004 apply.",
  });

  assert.ok(["complete", "partial"].includes(pkg.retrievalStatus));
  assert.ok(pkg.sources.some((source) => source.artifactId === "ADR-0007"));
  assert.ok(pkg.sources.some((source) => source.artifactId === "ENG-0004"));
});

test("Scenario B prioritizes product principles", () => {
  process.env.PKOS_REPOSITORY_PATH = PKOS_PATH;
  const pkg = retrieveEvidenceForCouncil({
    ...baseContext,
    question: "Which Prodignus product principles should guide this decision?",
  });

  assert.ok(pkg.sources.some((source) => source.artifactId === "PK-0005"));
});

test("Scenario C returns insufficient for unknown subject", () => {
  process.env.PKOS_REPOSITORY_PATH = PKOS_PATH;
  const pkg = retrieveEvidenceForCouncil({
    ...baseContext,
    question: "What is the canonical Prodignus policy for orbital satellite procurement?",
  });

  assert.equal(pkg.retrievalStatus, "insufficient");
  assert.equal(pkg.sources.length, 0);
});

test("Scenario D prioritizes ENG-0004 for explicit summary request", () => {
  process.env.PKOS_REPOSITORY_PATH = PKOS_PATH;
  const pkg = retrieveEvidenceForCouncil({
    ...baseContext,
    question: "Summarize ENG-0004 for an executive audience.",
  });

  assert.equal(pkg.sources[0]?.artifactId, "ENG-0004");
});
