import type { AdvisorResult, CouncilDecision } from "@/types/council";

const THINKING_LENS_LABELS: Record<AdvisorResult["persona"]["thinkingLens"], string> = {
  contrarian: "Contrarian",
  "product-strategy": "Product Strategy",
  "ux-accessibility": "UX & Accessibility",
  "delivery-engineering": "Delivery Engineering",
  "human-impact": "Human Impact",
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
  const isFailed = advisor.status === "failed";

  return (
    <article
      className={
        isFailed
          ? "rounded-lg border border-red-200 bg-white p-6"
          : "rounded-lg border border-emerald-200 bg-white p-6 shadow-sm"
      }
    >
      <header className="border-b border-neutral-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-neutral-900">
            {persona.displayName}
          </h3>
          <span
            className={
              isFailed
                ? "rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-800"
                : "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800"
            }
          >
            {isFailed ? "Failed" : "Live AI"}
          </span>
        </div>
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

      {isFailed ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {advisor.errorMessage ?? "The advisor could not complete this review."}
        </div>
      ) : (
        <>
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
              <div className="mt-2 space-y-4">
                {advisor.analysis.map((item) => (
                  <div key={item.title}>
                    <h5 className="font-medium text-neutral-900">{item.title}</h5>
                    <p className="mt-1 leading-6 text-neutral-700">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Key Arguments</h4>
              {advisor.keyArguments && advisor.keyArguments.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.keyArguments.map((argument) => (
                    <li key={argument}>{argument}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Unknowns</h4>
              {advisor.unknowns && advisor.unknowns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.unknowns.map((unknown) => (
                    <li key={unknown}>{unknown}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Accessibility Concerns</h4>
              {advisor.accessibilityConcerns && advisor.accessibilityConcerns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.accessibilityConcerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Journey Barriers</h4>
              {advisor.journeyBarriers && advisor.journeyBarriers.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.journeyBarriers.map((barrier) => (
                    <li key={barrier}>{barrier}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Engineering Concerns</h4>
              {advisor.engineeringConcerns && advisor.engineeringConcerns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.engineeringConcerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Operational Concerns</h4>
              {advisor.operationalConcerns && advisor.operationalConcerns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.operationalConcerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Technical Alternatives</h4>
              {advisor.technicalAlternatives && advisor.technicalAlternatives.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.technicalAlternatives.map((alternative) => (
                    <li key={alternative}>{alternative}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Human Impact</h4>
              {advisor.humanImpact && advisor.humanImpact.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.humanImpact.map((impact) => (
                    <li key={impact}>{impact}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Ethical Concerns</h4>
              {advisor.ethicalConcerns && advisor.ethicalConcerns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.ethicalConcerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Inclusion Concerns</h4>
              {advisor.inclusionConcerns && advisor.inclusionConcerns.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.inclusionConcerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Long-Term Effects</h4>
              {advisor.longTermEffects && advisor.longTermEffects.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.longTermEffects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Assumptions</h4>
              {advisor.assumptions.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Risks</h4>
              {advisor.risks.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
                  {advisor.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-neutral-600">None identified.</p>
              )}
            </section>

            <section>
              <h4 className="font-semibold text-neutral-900">Recommendation</h4>
              <p className="mt-2 font-medium text-neutral-900">
                {DECISION_LABELS[advisor.recommendation]}
              </p>
            </section>
          </div>
        </>
      )}
    </article>
  );
}
