"use client";

import { useRef, useState } from "react";
import { CouncilForm } from "@/components/council-form";
import { CouncilResults } from "@/components/council-results";
import { LoadingState } from "@/components/loading-state";
import { councilConfig } from "@/config/council";
import { createMockCouncilResult } from "@/data/mock-council-result";
import type { CouncilRequest, CouncilResult, Decision } from "@/types/council";

function createDecisionFromRequest(request: CouncilRequest, sequence: number): Decision {
  const createdAt = new Date();
  const datePart = createdAt.toISOString().slice(0, 10).replace(/-/g, "");

  return {
    id: `DEC-${datePart}-${String(sequence).padStart(3, "0")}`,
    title: request.title,
    question: request.question,
    context: request.context,
    constraints: request.constraints,
    createdAt: createdAt.toISOString(),
    status: "under_review",
  };
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CouncilResult | null>(null);
  const decisionSequenceRef = useRef(0);

  function handleConveneCouncil(values: CouncilRequest) {
    decisionSequenceRef.current += 1;
    const decision = createDecisionFromRequest(values, decisionSequenceRef.current);

    setIsLoading(true);
    setResult(null);

    window.setTimeout(() => {
      setResult(createMockCouncilResult(decision));
      setIsLoading(false);
    }, councilConfig.loadingDelayMs);
  }

  return (
    <div className="min-h-full bg-neutral-100">
      <main className="mx-auto max-w-6xl px-6 py-10">
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
              MVP 1 — Interface Prototype
            </span>
          </div>
        </header>

        <div className="space-y-8">
          <CouncilForm isSubmitting={isLoading} onSubmit={handleConveneCouncil} />

          {isLoading ? <LoadingState /> : null}

          {!isLoading && result ? <CouncilResults result={result} /> : null}
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-sm leading-6 text-neutral-600">{councilConfig.disclaimer}</p>
          <p className="mt-2 text-xs text-neutral-500">Version {councilConfig.version}</p>
        </div>
      </footer>
    </div>
  );
}
