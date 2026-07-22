import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_COUNCIL_REQUEST,
  QUESTION_MIN_LENGTH,
  TITLE_MIN_LENGTH,
  normalizeCouncilRequest,
  validateCouncilForm,
} from "../src/lib/council/council-form-validation.ts";

test("validateCouncilForm requires title and question", () => {
  const errors = validateCouncilForm(EMPTY_COUNCIL_REQUEST);

  assert.equal(errors.title, "Decision title is required.");
  assert.equal(errors.question, "Question is required.");
});

test("validateCouncilForm enforces minimum lengths", () => {
  const errors = validateCouncilForm({
    ...EMPTY_COUNCIL_REQUEST,
    title: "ab",
    question: "short",
  });

  assert.match(errors.title, new RegExp(`${TITLE_MIN_LENGTH}`));
  assert.match(errors.question, new RegExp(`${QUESTION_MIN_LENGTH}`));
});

test("validateCouncilForm accepts valid input", () => {
  const errors = validateCouncilForm({
    ...EMPTY_COUNCIL_REQUEST,
    title: "Territorial pilot selection",
    question: "Should Prodignus prioritize Goiânia or Palmas for the first pilot?",
  });

  assert.deepEqual(errors, {});
});

test("normalizeCouncilRequest trims optional fields", () => {
  const normalized = normalizeCouncilRequest({
    title: "  Pilot  ",
    question: "  Which city?  ",
    context: "  Context  ",
    constraints: "  Constraints  ",
    expectedOutcome: "  Objectives  ",
    alternatives: "  Goiânia or Palmas  ",
  });

  assert.equal(normalized.title, "Pilot");
  assert.equal(normalized.expectedOutcome, "Objectives");
  assert.equal(normalized.alternatives, "Goiânia or Palmas");
});
