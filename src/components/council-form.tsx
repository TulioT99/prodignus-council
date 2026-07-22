"use client";

import { useState, type FormEvent } from "react";
import { demoDecisionRequest } from "@/data/example-decision";
import {
  EMPTY_COUNCIL_REQUEST,
  QUESTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  normalizeCouncilRequest,
  validateCouncilForm,
} from "@/lib/council/council-form-validation";
import type { CouncilFormErrors, CouncilRequest } from "@/types/council";

interface CouncilFormProps {
  values: CouncilRequest;
  onChange: (values: CouncilRequest) => void;
  isSubmitting: boolean;
  onSubmit: (values: CouncilRequest) => void;
  onClear?: () => void;
}

export function CouncilForm({
  values,
  onChange,
  isSubmitting,
  onSubmit,
  onClear,
}: CouncilFormProps) {
  const [errors, setErrors] = useState<CouncilFormErrors>({});

  function handleChange(field: keyof CouncilRequest, value: string) {
    onChange({ ...values, [field]: value });

    if (field === "title" && errors.title) {
      setErrors((current) => ({ ...current, title: undefined }));
    }

    if (field === "question" && errors.question) {
      setErrors((current) => ({ ...current, question: undefined }));
    }
  }

  function handleLoadDemo() {
    onChange(demoDecisionRequest);
    setErrors({});
  }

  function handleClear() {
    onChange(EMPTY_COUNCIL_REQUEST);
    setErrors({});
    onClear?.();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateCouncilForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit(normalizeCouncilRequest(values));
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
            Decision title <span className="text-red-700">*</span>
          </label>
          <p className="mt-1 text-sm text-neutral-600">
            A short name that identifies the decision under review.
          </p>
          <input
            id="decision-title"
            name="title"
            type="text"
            value={values.title}
            onChange={(event) => handleChange("title", event.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "decision-title-error" : "decision-title-help"}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            maxLength={TITLE_MAX_LENGTH}
            disabled={isSubmitting}
          />
          <p id="decision-title-help" className="sr-only">
            Required field.
          </p>
          {errors.title ? (
            <p id="decision-title-error" className="mt-2 text-sm text-red-700">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="question" className="block text-sm font-medium text-neutral-900">
            Decision question <span className="text-red-700">*</span>
          </label>
          <p className="mt-1 text-sm text-neutral-600">
            State the question the Council should answer.
          </p>
          <textarea
            id="question"
            name="question"
            value={values.question}
            onChange={(event) => handleChange("question", event.target.value)}
            aria-invalid={Boolean(errors.question)}
            aria-describedby={errors.question ? "question-error" : "question-help"}
            rows={4}
            maxLength={QUESTION_MAX_LENGTH}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
          <p id="question-help" className="sr-only">
            Required field.
          </p>
          {errors.question ? (
            <p id="question-error" className="mt-2 text-sm text-red-700">
              {errors.question}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-neutral-900">
            Context and known facts
          </label>
          <p className="mt-1 text-sm text-neutral-600">
            Background, supporting information, and facts the Council should consider.
          </p>
          <textarea
            id="context"
            name="context"
            value={values.context}
            onChange={(event) => handleChange("context", event.target.value)}
            rows={5}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
        </div>

        <div>
          <label
            htmlFor="expected-outcome"
            className="block text-sm font-medium text-neutral-900"
          >
            Objectives
          </label>
          <p className="mt-1 text-sm text-neutral-600">
            What outcome or success criteria should guide the recommendation?
          </p>
          <textarea
            id="expected-outcome"
            name="expectedOutcome"
            value={values.expectedOutcome ?? ""}
            onChange={(event) => handleChange("expectedOutcome", event.target.value)}
            rows={3}
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
          <p className="mt-1 text-sm text-neutral-600">
            Limits, deadlines, budget, policy, or non-negotiable requirements.
          </p>
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

        <div>
          <label
            htmlFor="alternatives"
            className="block text-sm font-medium text-neutral-900"
          >
            Alternatives
          </label>
          <p className="mt-1 text-sm text-neutral-600">
            Options or paths the Council should compare, if applicable.
          </p>
          <textarea
            id="alternatives"
            name="alternatives"
            value={values.alternatives ?? ""}
            onChange={(event) => handleChange("alternatives", event.target.value)}
            rows={3}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isSubmitting ? "Council deliberating..." : "Convene Council"}
        </button>
        <button
          type="button"
          onClick={handleLoadDemo}
          disabled={isSubmitting}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          Load demo decision
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isSubmitting}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          Clear form
        </button>
      </div>
    </form>
  );
}
