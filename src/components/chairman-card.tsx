import type { ChairmanResult, CouncilDecision } from "@/types/council";

const DECISION_LABELS: Record<CouncilDecision, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with Conditions",
  test_first: "Test First",
  do_not_proceed: "Do Not Proceed",
  insufficient_information: "Insufficient Information",
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
  return (
    <article className="rounded-lg border-2 border-neutral-900 bg-white p-8 shadow-sm">
      <header className="border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Chairman
          </p>
          <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            Prototype Mock
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900">
              Council Decision
            </h2>
            <p className="mt-2 text-lg font-medium text-neutral-900">
              {DECISION_LABELS[chairman.decision]}
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 px-4 py-2 text-sm">
            <span className="text-neutral-500">Confidence</span>
            <p className="font-semibold text-neutral-900">
              {formatConfidence(chairman.confidence)}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
            Executive Summary
          </h3>
          <p className="mt-3 text-base leading-7 text-neutral-800">
            {chairman.executiveSummary}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <ListSection title="Areas of Agreement" items={chairman.areasOfAgreement} />
          <ListSection
            title="Areas of Disagreement"
            items={chairman.areasOfDisagreement}
          />
          <ListSection
            title="Critical Assumptions"
            items={chairman.criticalAssumptions}
          />
          <ListSection title="Principal Risks" items={chairman.principalRisks} />
          <ListSection title="Upside" items={chairman.upside} />
          <ListSection
            title="Recommended Actions"
            items={chairman.recommendedActions}
          />
        </div>

        <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
            Final Recommendation
          </h3>
          <p className="mt-3 text-base leading-7 text-neutral-900">
            {chairman.finalRecommendation}
          </p>
        </section>
      </div>
    </article>
  );
}
