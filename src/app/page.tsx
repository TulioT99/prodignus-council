"use client";

import { useRef, useState } from "react";
import { CouncilForm } from "@/components/council-form";
import { CouncilResults } from "@/components/council-results";
import { LoadingState } from "@/components/loading-state";
import { councilConfig } from "@/config/council";
import {
  CouncilClientError,
  fetchCouncilResult,
} from "@/lib/council/council-client";
import { buildDecisionFromRequest } from "@/lib/council/council-display";
import { EMPTY_COUNCIL_REQUEST } from "@/lib/council/council-form-validation";
import type { CouncilRequest, CouncilResult } from "@/types/council";

export default function Home() {
  const [formValues, setFormValues] = useState<CouncilRequest>(EMPTY_COUNCIL_REQUEST);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const decisionSequenceRef = useRef(0);
  const activeRequestRef = useRef(0);

  async function handleConveneCouncil(values: CouncilRequest) {
    if (isLoading) {
      return;
    }

    activeRequestRef.current += 1;
    const requestId = activeRequestRef.current;
    decisionSequenceRef.current += 1;
    const decision = buildDecisionFromRequest(values, decisionSequenceRef.current);

    setFormValues(values);
    setIsLoading(true);
    setSubmitError(null);
    setCanRetry(false);

    try {
      const councilResult = await fetchCouncilResult(decision);

      if (requestId !== activeRequestRef.current) {
        return;
      }

      setResult(councilResult);
    } catch (error) {
      if (requestId !== activeRequestRef.current) {
        return;
      }

      if (error instanceof CouncilClientError) {
        setSubmitError(error.message);
        setCanRetry(error.retryable);
      } else {
        setSubmitError(
          "The Council session could not be completed. Please try again.",
        );
        setCanRetry(true);
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setIsLoading(false);
      }
    }
  }

  function handleRetry() {
    void handleConveneCouncil(formValues);
  }

  function handleStartNewDeliberation() {
    setResult(null);
    setSubmitError(null);
    setCanRetry(false);
  }

  function handleClearForm() {
    setResult(null);
    setSubmitError(null);
    setCanRetry(false);
  }

  return (
    <div className="min-h-full bg-neutral-100">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 border-b border-neutral-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-600">
                Prodignus
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                {councilConfig.applicationName}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-700">
                Five independent perspectives challenge a decision before the
                Chairman consolidates the recommendation.
              </p>
            </div>
            <span className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700">
              Sprint 1 — Council MVP
            </span>
          </div>
        </header>

        <div className="space-y-8">
          <CouncilForm
            values={formValues}
            onChange={setFormValues}
            isSubmitting={isLoading}
            onSubmit={handleConveneCouncil}
            onClear={handleClearForm}
          />

          {submitError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <p>{submitError}</p>
              {canRetry ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Retry Council deliberation
                </button>
              ) : null}
            </div>
          ) : null}

          {isLoading ? <LoadingState /> : null}

          {!isLoading && result ? (
            <CouncilResults
              result={result}
              onStartNewDeliberation={handleStartNewDeliberation}
            />
          ) : null}
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-sm leading-6 text-neutral-600">{councilConfig.disclaimer}</p>
          <p className="mt-2 text-xs text-neutral-500">Version {councilConfig.version}</p>
        </div>
      </footer>
    </div>
  );
}
