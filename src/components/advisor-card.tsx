import type { AdvisorResult } from "@/types/council";
import {
  ADVISOR_RECOMMENDATION_LABELS,
  formatDurationReadable,
  getAdvisorDisplayName,
  isContrarianAdvisor,
} from "@/lib/council/council-display";
import { DisclosureSection } from "@/components/disclosure-section";

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h4 className="font-semibold text-neutral-900">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

interface AdvisorCardProps {
  advisor: AdvisorResult;
}

export function AdvisorCard({ advisor }: AdvisorCardProps) {
  const isFailed = advisor.status === "failed";
  const isContrarian = isContrarianAdvisor(advisor);
  const displayName = getAdvisorDisplayName(advisor);

  const cardClassName = isFailed
    ? "rounded-lg border border-red-200 bg-white p-6"
    : isContrarian
      ? "rounded-lg border border-amber-300 bg-amber-50/40 p-6 shadow-sm"
      : "rounded-lg border border-emerald-200 bg-white p-6 shadow-sm";

  const badgeClassName = isFailed
    ? "rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-800"
    : isContrarian
      ? "rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900"
      : "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800";

  return (
    <article className={cardClassName}>
      <header className="border-b border-neutral-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">{displayName}</h3>
            {isContrarian && !isFailed ? (
              <p className="mt-1 text-sm text-amber-900">
                Deliberate challenge perspective — questions assumptions and hidden
                risks.
              </p>
            ) : null}
          </div>
          <span className={badgeClassName}>
            {isFailed ? "Unavailable" : isContrarian ? "Challenge view" : "Available"}
          </span>
        </div>
      </header>

      {isFailed ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-medium text-red-900">{displayName} is unavailable.</p>
          <p className="mt-2">
            {advisor.errorMessage ??
              "This perspective could not be completed. The Council may still proceed with the remaining advisors."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              Recommendation
            </h4>
            <p className="mt-2 text-base font-semibold text-neutral-900">
              {ADVISOR_RECOMMENDATION_LABELS[advisor.recommendation]}
            </p>
          </section>

          <section>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              Summary
            </h4>
            <p className="mt-2 text-sm leading-6 text-neutral-800">{advisor.summary}</p>
          </section>

          <p className="text-sm font-medium text-neutral-900">
            {formatConfidence(advisor.confidence)}
          </p>

          <DisclosureSection title="Analysis details">
            <div className="space-y-5 text-sm">
              {advisor.analysis.length > 0 ? (
                <section>
                  <h4 className="font-semibold text-neutral-900">Reasoning</h4>
                  <div className="mt-2 space-y-4">
                    {advisor.analysis.map((item) => (
                      <div key={item.title}>
                        <h5 className="font-medium text-neutral-900">{item.title}</h5>
                        <p className="mt-1 leading-6 text-neutral-700">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <ListBlock title="Assumptions" items={advisor.assumptions} />
              <ListBlock title="Risks" items={advisor.risks} />
              <ListBlock title="Unknowns" items={advisor.unknowns ?? []} />
              <ListBlock title="Key arguments" items={advisor.keyArguments ?? []} />

              <ListBlock
                title="Accessibility concerns"
                items={advisor.accessibilityConcerns ?? []}
              />
              <ListBlock title="Human impact" items={advisor.humanImpact ?? []} />
              <ListBlock
                title="Engineering concerns"
                items={advisor.engineeringConcerns ?? []}
              />
              <ListBlock
                title="Operational concerns"
                items={advisor.operationalConcerns ?? []}
              />

              <div className="rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
                <p>Duration: {formatDurationReadable(advisor.durationMs)}</p>
                {advisor.totalTokens > 0 ? (
                  <p className="mt-1">
                    Tokens: {advisor.totalTokens.toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
          </DisclosureSection>
        </div>
      )}
    </article>
  );
}
