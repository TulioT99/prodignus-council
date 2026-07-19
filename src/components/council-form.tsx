"use client";

import { useState, type FormEvent } from "react";
import { exampleDecisionRequest } from "@/data/example-decision";
import type { CouncilFormErrors, CouncilRequest } from "@/types/council";

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 150;
const QUESTION_MIN_LENGTH = 10;
const QUESTION_MAX_LENGTH = 4000;

const EMPTY_FORM: CouncilRequest = {
  title: "",
  question: "",
  context: "",
  constraints: "",
};

function validateForm(values: CouncilRequest): CouncilFormErrors {
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

interface CouncilFormProps {
  initialValues?: CouncilRequest;
  isSubmitting: boolean;
  onSubmit: (values: CouncilRequest) => void;
}

export function CouncilForm({
  initialValues = EMPTY_FORM,
  isSubmitting,
  onSubmit,
}: CouncilFormProps) {
  const [values, setValues] = useState<CouncilRequest>(initialValues);
  const [errors, setErrors] = useState<CouncilFormErrors>({});

  function handleChange(field: keyof CouncilRequest, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    if (field === "title" && errors.title) {
      setErrors((current) => ({ ...current, title: undefined }));
    }

    if (field === "question" && errors.question) {
      setErrors((current) => ({ ...current, question: undefined }));
    }
  }

  function handleLoadExample() {
    setValues(exampleDecisionRequest);
    setErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      title: values.title.trim(),
      question: values.question.trim(),
      context: values.context.trim(),
      constraints: values.constraints.trim(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg border border-neutral-200 bg-white p-6"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="decision-title" className="block text-sm font-medium text-neutral-900">
            Decision Title
          </label>
          <input
            id="decision-title"
            name="title"
            type="text"
            value={values.title}
            onChange={(event) => handleChange("title", event.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "decision-title-error" : undefined}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            maxLength={TITLE_MAX_LENGTH}
            disabled={isSubmitting}
          />
          {errors.title ? (
            <p id="decision-title-error" className="mt-2 text-sm text-red-700">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="question" className="block text-sm font-medium text-neutral-900">
            Question
          </label>
          <textarea
            id="question"
            name="question"
            value={values.question}
            onChange={(event) => handleChange("question", event.target.value)}
            aria-invalid={Boolean(errors.question)}
            aria-describedby={errors.question ? "question-error" : undefined}
            rows={4}
            maxLength={QUESTION_MAX_LENGTH}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
          {errors.question ? (
            <p id="question-error" className="mt-2 text-sm text-red-700">
              {errors.question}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-neutral-900">
            Context
          </label>
          <textarea
            id="context"
            name="context"
            value={values.context}
            onChange={(event) => handleChange("context", event.target.value)}
            rows={4}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="constraints"
            className="block text-sm font-medium text-neutral-900"
          >
            Constraints
          </label>
          <textarea
            id="constraints"
            name="constraints"
            value={values.constraints}
            onChange={(event) => handleChange("constraints", event.target.value)}
            rows={3}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          Convene Council
        </button>
        <button
          type="button"
          onClick={handleLoadExample}
          disabled={isSubmitting}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          Load Example
        </button>
      </div>
    </form>
  );
}
