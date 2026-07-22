import type { CouncilFormErrors, CouncilRequest } from "@/types/council";

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 150;
export const QUESTION_MIN_LENGTH = 10;
export const QUESTION_MAX_LENGTH = 4000;

export const EMPTY_COUNCIL_REQUEST: CouncilRequest = {
  title: "",
  question: "",
  context: "",
  constraints: "",
  expectedOutcome: "",
  alternatives: "",
};

export function validateCouncilForm(values: CouncilRequest): CouncilFormErrors {
  const errors: CouncilFormErrors = {};
  const trimmedTitle = values.title.trim();
  const trimmedQuestion = values.question.trim();

  if (!trimmedTitle) {
    errors.title = "Decision title is required.";
  } else if (trimmedTitle.length < TITLE_MIN_LENGTH) {
    errors.title = `Decision title must be at least ${TITLE_MIN_LENGTH} characters.`;
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `Decision title must be at most ${TITLE_MAX_LENGTH} characters.`;
  }

  if (!trimmedQuestion) {
    errors.question = "Question is required.";
  } else if (trimmedQuestion.length < QUESTION_MIN_LENGTH) {
    errors.question = `Question must be at least ${QUESTION_MIN_LENGTH} characters.`;
  } else if (trimmedQuestion.length > QUESTION_MAX_LENGTH) {
    errors.question = `Question must be at most ${QUESTION_MAX_LENGTH} characters.`;
  }

  return errors;
}

export function normalizeCouncilRequest(values: CouncilRequest): CouncilRequest {
  return {
    title: values.title.trim(),
    question: values.question.trim(),
    context: values.context.trim(),
    constraints: values.constraints.trim(),
    expectedOutcome: values.expectedOutcome?.trim() ?? "",
    alternatives: values.alternatives?.trim() ?? "",
  };
}
