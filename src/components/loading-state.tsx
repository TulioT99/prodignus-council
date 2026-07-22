"use client";

import { useEffect, useState } from "react";

const DELIBERATION_STAGES = [
  "Preparing the decision",
  "Consulting the Council",
  "Synthesizing the recommendation",
] as const;

const STAGE_INTERVAL_MS = 20_000;

export function LoadingState() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((current) =>
        current < DELIBERATION_STAGES.length - 1 ? current + 1 : current,
      );
    }, STAGE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="rounded-lg border border-neutral-200 bg-white p-8"
    >
      <h2 className="text-lg font-semibold text-neutral-900">
        The Council is deliberating
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        Your decision remains on screen while the Council reviews it. A full
        deliberation typically takes about one to two minutes in this MVP.
      </p>

      <ol className="mt-6 space-y-3" aria-label="Deliberation progress">
        {DELIBERATION_STAGES.map((stage, index) => {
          const isCurrent = index === stageIndex;
          const isComplete = index < stageIndex;

          return (
            <li
              key={stage}
              className="flex items-start gap-3 rounded-md border border-neutral-100 px-4 py-3"
            >
              <span
                aria-hidden="true"
                className={
                  isComplete
                    ? "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                    : isCurrent
                      ? "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-400 bg-white text-xs font-semibold text-neutral-700 motion-safe:animate-pulse"
                      : "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-400"
                }
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <div>
                <p className="font-medium text-neutral-900">{stage}</p>
                {isCurrent ? (
                  <p className="mt-1 text-sm text-neutral-600">In progress</p>
                ) : isComplete ? (
                  <p className="mt-1 text-sm text-neutral-600">Complete</p>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500">Pending</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-sm text-neutral-500">
        Individual advisor completion is not shown because the Council returns one
        final response after all perspectives are gathered.
      </p>
    </section>
  );
}
