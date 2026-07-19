import type { AdvisorResult, CouncilDecision } from "@/types/council";

const THINKING_LENS_LABELS: Record<AdvisorResult["persona"]["thinkingLens"], string> = {
  contrarian: "Contrarian",
  "first-principles": "First Principles",
  expansionist: "Expansionist",
  outsider: "Outsider",
  executor: "Executor",
};

const DECISION_LABELS: Record<CouncilDecision, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with Conditions",
  test_first: "Test First",
  do_not_proceed: "Do Not Proceed",
  insufficient_information: "Insufficient Information",
};

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

interface AdvisorCardProps {
  advisor: AdvisorResult;
}

export function AdvisorCard({ advisor }: AdvisorCardProps) {
  const { persona } = advisor;

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-6">
      <header className="border-b border-neutral-100 pb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          {persona.displayName}
        </h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Thinking Lens</dt>
            <dd className="font-medium text-neutral-900">
              {THINKING_LENS_LABELS[persona.thinkingLens]}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Expertise</dt>
            <dd className="font-medium text-neutral-900">{persona.expertise}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Background</dt>
            <dd className="font-medium text-neutral-900">{persona.background}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Model</dt>
            <dd className="font-medium text-neutral-900">{persona.model}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Confidence</span>
          <p className="font-medium text-neutral-900">
            {formatConfidence(advisor.confidence)}
          </p>
        </div>
        <div>
          <span className="text-neutral-500">Duration</span>
          <p className="font-medium text-neutral-900">
            {formatDuration(advisor.durationMs)}
          </p>
        </div>
        <div>
          <span className="text-neutral-500">Tokens</span>
          <p className="font-medium text-neutral-900">
            {advisor.totalTokens.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5 text-sm">
        <section>
          <h4 className="font-semibold text-neutral-900">Core Beliefs</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
            {persona.coreBeliefs.map((belief) => (
              <li key={belief}>{belief}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-neutral-900">Summary</h4>
          <p className="mt-2 leading-6 text-neutral-700">{advisor.summary}</p>
        </section>

        <section>
          <h4 className="font-semibold text-neutral-900">Analysis</h4>
          <p className="mt-2 leading-6 text-neutral-700">{advisor.analysis}</p>
        </section>

        <section>
          <h4 className="font-semibold text-neutral-900">Assumptions</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
            {advisor.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-neutral-900">Risks</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
            {advisor.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="font-semibold text-neutral-900">Recommendation</h4>
          <p className="mt-2 font-medium text-neutral-900">
            {DECISION_LABELS[advisor.recommendation]}
          </p>
        </section>
      </div>
    </article>
  );
}
