import type { ChairmanResult } from "@/types/council";
import {
  CHAIRMAN_RECOMMENDATION_LABELS,
  shouldShowBoundedExperimentClarity,
} from "@/lib/council/council-display";
import { DisclosureSection } from "@/components/disclosure-section";

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
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

interface ChairmanCardProps {
  chairman: ChairmanResult;
}

export function ChairmanCard({ chairman }: ChairmanCardProps) {
  const isFailed = chairman.status === "failed";
  const recommendationLabel =
    CHAIRMAN_RECOMMENDATION_LABELS[chairman.recommendationType];

  return (
    <article className="rounded-lg border-2 border-neutral-900 bg-white p-6 shadow-sm sm:p-8">
      <header className="border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Chairman decision
          </p>
          <span
            className={
              isFailed
                ? "rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-800"
                : "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800"
            }
          >
            {isFailed ? "Unavailable" : "Primary recommendation"}
          </span>
        </div>

        {!isFailed ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                Recommendation type
              </p>
              <p className="mt-2 text-xl font-semibold text-neutral-900">
                {recommendationLabel}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                Final decision
              </p>
              <p className="mt-2 text-lg leading-7 text-neutral-900">
                {chairman.decisionStatement}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="rounded-md border border-neutral-200 px-4 py-2 text-sm">
                <span className="text-neutral-500">Confidence</span>
                <p className="font-semibold text-neutral-900">
                  {formatConfidence(chairman.confidence)}
                </p>
              </div>
              {chairman.conditions.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
                  <span className="font-medium">Conditions or caveats apply</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {isFailed ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {chairman.errorMessage ??
            "The Chairman could not produce a final decision for this Council session."}
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

          {shouldShowBoundedExperimentClarity(chairman) ? (
            <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                Decision clarity
              </h3>
              <dl className="mt-4 space-y-4 text-sm leading-6 text-neutral-800">
                <div>
                  <dt className="font-semibold text-neutral-900">Immediate decision</dt>
                  <dd className="mt-1">{chairman.decisionStatement}</dd>
                </div>
                {chairman.unknowns.length > 0 ? (
                  <div>
                    <dt className="font-semibold text-neutral-900">Not yet decided</dt>
                    <dd className="mt-1">
                      <ul className="list-disc space-y-1 pl-5">
                        {chairman.unknowns.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
                {chairman.conditions.length > 0 ? (
                  <div>
                    <dt className="font-semibold text-neutral-900">
                      What the experiment will test
                    </dt>
                    <dd className="mt-1">
                      <ul className="list-disc space-y-1 pl-5">
                        {chairman.conditions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
                {chairman.nextActions.length > 0 ? (
                  <div>
                    <dt className="font-semibold text-neutral-900">
                      Decision after validation
                    </dt>
                    <dd className="mt-1">
                      <ul className="list-disc space-y-1 pl-5">
                        {chairman.nextActions.map((action) => (
                          <li key={`${action.sequence}-${action.action}`}>
                            {action.action}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
              Executive summary
            </h3>
            <p className="mt-3 text-base leading-7 text-neutral-800">
              {chairman.executiveSummary}
            </p>
          </section>

          <DisclosureSection title="Full Council rationale and analysis">
            <div className="space-y-6">
              <section className="rounded-md border border-neutral-200 bg-white p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Rationale
                </h3>
                <p className="mt-3 text-base leading-7 text-neutral-900">
                  {chairman.rationale}
                </p>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <ListSection title="Consensus" items={chairman.consensus} />
                <ListSection title="Disagreements" items={chairman.disagreements} />
                <ListSection title="Assumptions" items={chairman.assumptions} />
                <ListSection title="Unknowns" items={chairman.unknowns} />
                <ListSection title="Risks" items={chairman.risks} />
                <ListSection title="Conditions" items={chairman.conditions} />
                <ListSection
                  title="Reversal criteria"
                  items={chairman.reversalCriteria}
                />
              </div>

              {chairman.structuredDisagreements.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Disagreements and resolution
                  </h3>
                  <ul className="mt-3 space-y-4 text-sm leading-6 text-neutral-800">
                    {chairman.structuredDisagreements.map((item) => (
                      <li
                        key={`${item.topic}-${item.resolution}`}
                        className="rounded-md border border-neutral-200 bg-white p-4"
                      >
                        <p className="font-medium text-neutral-900">{item.topic}</p>
                        {item.positions.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {item.positions.map((position) => (
                              <li key={position}>{position}</li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-2">
                          <span className="font-medium">Resolution:</span>{" "}
                          {item.resolution}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {chairman.decisiveTradeoffs.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Decisive trade-offs
                  </h3>
                  <ul className="mt-3 space-y-4 text-sm leading-6 text-neutral-800">
                    {chairman.decisiveTradeoffs.map((item) => (
                      <li
                        key={`${item.tradeoff}-${item.preferredSide}`}
                        className="rounded-md border border-neutral-200 bg-white p-4"
                      >
                        <p className="font-medium text-neutral-900">{item.tradeoff}</p>
                        <p className="mt-2">
                          Preferred side: {item.preferredSide}
                        </p>
                        <p className="mt-2 text-neutral-600">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {chairman.minimumAdditionalEvidence.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Minimum additional evidence
                  </h3>
                  <ul className="mt-3 space-y-3 text-sm leading-6 text-neutral-800">
                    {chairman.minimumAdditionalEvidence.map((item) => (
                      <li
                        key={`${item.evidence}-${item.whyNeeded}`}
                        className="rounded-md border border-neutral-200 bg-white p-4"
                      >
                        <p className="font-medium text-neutral-900">{item.evidence}</p>
                        <p className="mt-2 text-neutral-600">{item.whyNeeded}</p>
                        {item.owner ? (
                          <p className="mt-2 text-neutral-600">Owner: {item.owner}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {chairman.minorityView ? (
                <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Minority view
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
                    Next actions
                  </h3>
                  <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-neutral-800">
                    {chairman.nextActions.map((action) => (
                      <li key={`${action.sequence}-${action.action}`}>
                        <span className="font-medium text-neutral-900">
                          {action.action}
                        </span>
                        {action.owner ? (
                          <span className="text-neutral-600">
                            {" "}
                            — Owner: {action.owner}
                          </span>
                        ) : null}
                        <p className="mt-1 text-neutral-600">
                          Expected outcome: {action.expectedOutcome}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>
          </DisclosureSection>
        </div>
      )}
    </article>
  );
}
