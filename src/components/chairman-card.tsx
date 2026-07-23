import type { ReactNode } from "react";
import type { ChairmanResult } from "@/types/council";
import {
  buildExecutiveCouncilRecommendationPresentation,
  type ConditionGroupPresentation,
  type NextStepPresentation,
  type RationalePresentation,
  type RiskPresentation,
} from "@/lib/council/council-recommendation-presentation";
import { COUNCIL_RECOMMENDATION_UI } from "@/lib/council/council-display";
import { DisclosureSection } from "@/components/disclosure-section";

function BriefingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <div className="max-w-3xl text-base leading-7 text-neutral-800">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ExpandableBlock({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group mt-4 rounded-md border border-neutral-200 bg-neutral-50">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-900 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-neutral-500 transition-transform group-open:rotate-90">
            ▸
          </span>
          {summary}
        </span>
      </summary>
      <div className="border-t border-neutral-200 px-4 py-4">{children}</div>
    </details>
  );
}

function RationaleSection({ presentation }: { presentation: RationalePresentation }) {
  return (
    <BriefingSection title={COUNCIL_RECOMMENDATION_UI.whyRecommendation}>
      <div className="space-y-4">
        <p className="break-words whitespace-pre-wrap">
          {presentation.isExpandable ? presentation.collapsedIntro : presentation.fullText}
        </p>

        {presentation.keyReasoningPoints.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">
              {COUNCIL_RECOMMENDATION_UI.keyReasoning}
            </h4>
            <BulletList items={presentation.keyReasoningPoints} />
          </div>
        ) : null}

        {presentation.isExpandable ? (
          <ExpandableBlock summary={COUNCIL_RECOMMENDATION_UI.showFullRationale}>
            <p className="break-words whitespace-pre-wrap">{presentation.fullText}</p>
          </ExpandableBlock>
        ) : null}
      </div>
    </BriefingSection>
  );
}

function RisksSection({ presentation }: { presentation: RiskPresentation }) {
  return (
    <BriefingSection title={COUNCIL_RECOMMENDATION_UI.keyRisks}>
      {presentation.priorityRisks.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">
              {COUNCIL_RECOMMENDATION_UI.priorityRisks}
            </h4>
            <div className="mt-3">
              <BulletList items={presentation.priorityRisks} />
            </div>
          </div>

          {presentation.showExpander ? (
            <ExpandableBlock
              summary={COUNCIL_RECOMMENDATION_UI.viewAdditionalRisks(
                presentation.additionalRisks.length,
              )}
            >
              <BulletList items={presentation.additionalRisks} />
            </ExpandableBlock>
          ) : null}
        </div>
      ) : (
        <p className="text-neutral-700">{COUNCIL_RECOMMENDATION_UI.noRisks}</p>
      )}
    </BriefingSection>
  );
}

function ConditionGroupBlock({ group }: { group: ConditionGroupPresentation }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-neutral-900">{group.label}</h4>
      <div className="mt-3">
        <BulletList items={group.items} />
      </div>
    </div>
  );
}

function ConditionsSection({
  groups,
}: {
  groups: ConditionGroupPresentation[];
}) {
  return (
    <BriefingSection title={COUNCIL_RECOMMENDATION_UI.conditionsForSuccess}>
      {groups.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <ConditionGroupBlock key={group.label} group={group} />
          ))}
        </div>
      ) : (
        <p className="text-neutral-700">{COUNCIL_RECOMMENDATION_UI.noConditions}</p>
      )}
    </BriefingSection>
  );
}

function NextStepCard({ step }: { step: NextStepPresentation }) {
  return (
    <li className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <p className="font-medium break-words text-neutral-900">{step.action}</p>
      <dl className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
        {step.owner ? (
          <div>
            <dt className="font-semibold text-neutral-900">
              {COUNCIL_RECOMMENDATION_UI.owner}
            </dt>
            <dd className="break-words">{step.owner}</dd>
          </div>
        ) : null}
        {step.expectedOutcome ? (
          <div>
            <dt className="font-semibold text-neutral-900">
              {COUNCIL_RECOMMENDATION_UI.expectedOutcome}
            </dt>
            <dd className="break-words">{step.expectedOutcome}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

function NextStepsSection({ steps }: { steps: NextStepPresentation[] }) {
  if (steps.length === 0) {
    return (
      <BriefingSection title={COUNCIL_RECOMMENDATION_UI.suggestedNextSteps}>
        <p className="text-neutral-700">{COUNCIL_RECOMMENDATION_UI.noNextSteps}</p>
      </BriefingSection>
    );
  }

  return (
    <BriefingSection title={COUNCIL_RECOMMENDATION_UI.suggestedNextSteps}>
      <ol className="space-y-4">
        {steps.map((step) => (
          <NextStepCard key={`${step.sequence}-${step.action}`} step={step} />
        ))}
      </ol>
    </BriefingSection>
  );
}

interface ChairmanCardProps {
  chairman: ChairmanResult;
}

export function ChairmanCard({ chairman }: ChairmanCardProps) {
  if (chairman.status === "failed") {
    return (
      <article
        aria-label="Council recommendation unavailable"
        className="rounded-lg border border-red-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {chairman.errorMessage ??
            "The Chairman could not produce a final decision for this Council session."}
        </div>
      </article>
    );
  }

  const presentation = buildExecutiveCouncilRecommendationPresentation(chairman);
  const { briefing } = presentation;

  return (
    <article
      aria-labelledby="council-recommendation-title"
      className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="border-b border-neutral-200 pb-6">
        <h2
          id="council-recommendation-title"
          className="text-sm font-semibold uppercase tracking-wide text-neutral-600"
        >
          {COUNCIL_RECOMMENDATION_UI.title}
        </h2>
        <p className="mt-4 text-2xl font-semibold leading-snug break-words text-neutral-900 sm:text-3xl">
          {briefing.headline}
        </p>
        <p className="mt-3 text-base text-neutral-800">
          {COUNCIL_RECOMMENDATION_UI.overallConfidence}:{" "}
          <span className="font-semibold text-neutral-900">
            {briefing.overallConfidenceLabel}
          </span>
        </p>
      </header>

      <div className="mt-6 space-y-10">
        {chairman.reducedConfidenceSynthesis ? (
          <div
            role="status"
            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            This synthesis was produced with reduced council coverage. Missing
            perspectives:{" "}
            {(chairman.missingPerspectives ?? []).join(", ") || "unknown"}.
          </div>
        ) : null}

        {briefing.decisionSummary ? (
          <BriefingSection title={COUNCIL_RECOMMENDATION_UI.decisionSummary}>
            <p className="break-words">{briefing.decisionSummary}</p>
          </BriefingSection>
        ) : null}

        {presentation.rationale ? (
          <RationaleSection presentation={presentation.rationale} />
        ) : null}

        <RisksSection presentation={presentation.risks} />

        <ConditionsSection groups={presentation.conditions.groups} />

        <NextStepsSection steps={presentation.nextSteps} />

        <DisclosureSection title={COUNCIL_RECOMMENDATION_UI.supplementaryAnalysis}>
          <div className="space-y-6">
            {chairman.executiveSummary &&
            briefing.decisionSummary &&
            chairman.executiveSummary.trim() !== briefing.decisionSummary &&
            chairman.executiveSummary.trim() !== presentation.rationale?.fullText ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Executive summary
                </h4>
                <p className="mt-3 break-words text-sm leading-6 text-neutral-800">
                  {chairman.executiveSummary}
                </p>
              </section>
            ) : null}

            {chairman.consensus.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Consensus
                </h4>
                <BulletList items={chairman.consensus} />
              </section>
            ) : null}

            {chairman.disagreements.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Disagreements
                </h4>
                <BulletList items={chairman.disagreements} />
              </section>
            ) : null}

            {chairman.structuredDisagreements.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Disagreements and resolution
                </h4>
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
                        <span className="font-medium">Resolution:</span> {item.resolution}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {chairman.assumptions.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Assumptions
                </h4>
                <BulletList items={chairman.assumptions} />
              </section>
            ) : null}

            {chairman.unknowns.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Unknowns
                </h4>
                <BulletList items={chairman.unknowns} />
              </section>
            ) : null}

            {chairman.decisiveTradeoffs.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Decisive trade-offs
                </h4>
                <ul className="space-y-4 text-sm leading-6 text-neutral-800">
                  {chairman.decisiveTradeoffs.map((item) => (
                    <li
                      key={`${item.tradeoff}-${item.preferredSide}`}
                      className="rounded-md border border-neutral-200 bg-white p-4"
                    >
                      <p className="font-medium text-neutral-900">{item.tradeoff}</p>
                      <p className="mt-2">Preferred side: {item.preferredSide}</p>
                      <p className="mt-2 text-neutral-600">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {chairman.reversalCriteria.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Reversal criteria
                </h4>
                <BulletList items={chairman.reversalCriteria} />
              </section>
            ) : null}

            {chairman.minimumAdditionalEvidence.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Minimum additional evidence
                </h4>
                <ul className="space-y-3 text-sm leading-6 text-neutral-800">
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
              <section className="rounded-md border border-neutral-200 bg-white p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                  Minority view
                </h4>
                <p className="mt-3 text-sm leading-6 text-neutral-800">
                  {chairman.minorityView.position}
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Why it matters: {chairman.minorityView.whyItMatters}
                </p>
              </section>
            ) : null}
          </div>
        </DisclosureSection>
      </div>
    </article>
  );
}
