import type { ChairmanRecommendationType, ChairmanResult, CouncilDecision } from "@/types/council";

const DECISION_LABELS: Record<CouncilDecision, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with Conditions",
  test_first: "Test First",
  do_not_proceed: "Do Not Proceed",
  insufficient_information: "Insufficient Information",
};

const RECOMMENDATION_TYPE_LABELS: Record<ChairmanRecommendationType, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with Conditions",
  defer: "Defer Pending Evidence",
  do_not_proceed: "Do Not Proceed",
  run_bounded_experiment: "Run Bounded Experiment",
};

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

interface ChairmanCardProps {
  chairman: ChairmanResult;
}

function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
        {title}
      </h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function ChairmanCard({ chairman }: ChairmanCardProps) {
  const isFailed = chairman.status === "failed";

  return (
    <article className="rounded-lg border-2 border-neutral-900 bg-white p-8 shadow-sm">
      <header className="border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Chairman
          </p>
          <span
            className={
              isFailed
                ? "rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-800"
                : "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800"
            }
          >
            {isFailed ? "Synthesis Failed" : "Live AI"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">
              Council Decision
            </h2>
            <p className="mt-2 text-lg font-medium text-neutral-900">
              {RECOMMENDATION_TYPE_LABELS[chairman.recommendationType] ??
                DECISION_LABELS[chairman.decision]}
            </p>
            {!isFailed ? (
              <p className="mt-2 text-base leading-6 text-neutral-800">
                {chairman.decisionStatement}
              </p>
            ) : null}
          </div>
          <div className="rounded-md border border-neutral-200 px-4 py-2 text-sm">
            <span className="text-neutral-500">Confidence</span>
            <p className="font-semibold text-neutral-900">
              {formatConfidence(chairman.confidence)}
            </p>
          </div>
        </div>
      </header>

      {isFailed ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {chairman.errorMessage ??
            "The Chairman could not complete the council synthesis."}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {chairman.reducedConfidenceSynthesis ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This synthesis was produced with reduced council coverage. Missing
              perspectives:{" "}
              {(chairman.missingPerspectives ?? []).join(", ") || "unknown"}.
            </div>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
              Executive Summary
            </h3>
            <p className="mt-3 text-base leading-7 text-neutral-800">
              {chairman.executiveSummary}
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <ListSection title="Consensus" items={chairman.consensus} />
            <ListSection title="Disagreements" items={chairman.disagreements} />
            <ListSection title="Key Arguments" items={chairman.keyArguments} />
            <ListSection title="Risks" items={chairman.risks} />
            <ListSection title="Conditions" items={chairman.conditions} />
            <ListSection
              title="Reversal Criteria"
              items={chairman.reversalCriteria}
            />
          </div>

          {chairman.minorityView ? (
            <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                Minority View
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-800">
                {chairman.minorityView.position}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Why it matters: {chairman.minorityView.whyItMatters}
              </p>
            </section>
          ) : null}

          {chairman.nextActions.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                Next Actions
              </h3>
              <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-neutral-800">
                {chairman.nextActions.map((action) => (
                  <li key={`${action.sequence}-${action.action}`}>
                    <span className="font-medium text-neutral-900">
                      {action.action}
                    </span>
                    {action.owner ? (
                      <span className="text-neutral-600"> — Owner: {action.owner}</span>
                    ) : null}
                    <p className="mt-1 text-neutral-600">
                      Expected outcome: {action.expectedOutcome}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
              Rationale
            </h3>
            <p className="mt-3 text-base leading-7 text-neutral-900">
              {chairman.rationale}
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
