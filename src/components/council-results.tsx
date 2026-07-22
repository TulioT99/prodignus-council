import type { CouncilResult, DecisionStatus } from "@/types/council";
import { AdvisorCard } from "@/components/advisor-card";
import { ChairmanCard } from "@/components/chairman-card";
import { CouncilMetrics } from "@/components/council-metrics";
import { CouncilStatusBanner } from "@/components/council-status-banner";
import {
  getUnavailableAdvisorNames,
  sortAdvisorsForDisplay,
} from "@/lib/council/council-display";

const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  decided: "Decided",
  archived: "Archived",
};

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

interface CouncilResultsProps {
  result: CouncilResult;
  onStartNewDeliberation: () => void;
}

export function CouncilResults({ result, onStartNewDeliberation }: CouncilResultsProps) {
  const { decision } = result;
  const sortedAdvisors = sortAdvisorsForDisplay(result.advisors);
  const unavailableAdvisors = getUnavailableAdvisorNames(result);
  const showChairman =
    result.chairman &&
    (result.chairman.status === "success" || result.status !== "failed");

  return (
    <section aria-label="Council results" className="space-y-8">
      <CouncilStatusBanner
        status={result.status}
        unavailableAdvisors={unavailableAdvisors}
      />

      {result.status === "failed" && result.chairman?.status === "failed" ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="font-medium text-red-900">
            The Council could not produce a usable final decision.
          </p>
          <p className="mt-2">
            Review any available advisor perspectives below, adjust your decision if
            needed, and try again.
          </p>
        </div>
      ) : null}

      {showChairman && result.chairman ? (
        <ChairmanCard chairman={result.chairman} />
      ) : null}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Advisor perspectives
        </h2>
        <div className="grid gap-6 xl:grid-cols-2">
          {sortedAdvisors.map((advisor) => (
            <AdvisorCard key={advisor.persona.id} advisor={advisor} />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Decision submitted</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Decision title</dt>
            <dd className="mt-1 font-medium text-neutral-900">{decision.title}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Created</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {formatDateTime(decision.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Decision status</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {DECISION_STATUS_LABELS[decision.status]}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Question</dt>
            <dd className="mt-1 leading-6 text-neutral-800">{decision.question}</dd>
          </div>
          {decision.context ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Context</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6 text-neutral-800">
                {decision.context}
              </dd>
            </div>
          ) : null}
          {decision.constraints ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Constraints</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6 text-neutral-800">
                {decision.constraints}
              </dd>
            </div>
          ) : null}
          {decision.expectedOutcome ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Objectives</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6 text-neutral-800">
                {decision.expectedOutcome}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <CouncilMetrics result={result} />

      <div>
        <button
          type="button"
          onClick={onStartNewDeliberation}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Start another deliberation
        </button>
      </div>
    </section>
  );
}
