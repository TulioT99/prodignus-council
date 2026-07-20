import type { CouncilResult, CouncilSessionStatus, DecisionStatus } from "@/types/council";
import { AdvisorCard } from "@/components/advisor-card";
import { ChairmanCard } from "@/components/chairman-card";

const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  decided: "Decided",
  archived: "Archived",
};

const SESSION_STATUS_LABELS: Record<CouncilSessionStatus, string> = {
  complete: "Complete",
  partial: "Partial",
  failed: "Failed",
};

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

interface CouncilResultsProps {
  result: CouncilResult;
}

export function CouncilResults({ result }: CouncilResultsProps) {
  const { decision } = result;

  return (
    <section aria-label="Council results" className="space-y-8">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Session Summary</h2>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Decision ID</dt>
            <dd className="mt-1 font-medium text-neutral-900">{decision.id}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Created</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {formatDateTime(decision.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Decision Status</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {DECISION_STATUS_LABELS[decision.status]}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Council Session</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {SESSION_STATUS_LABELS[result.status]}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Decision Title</dt>
            <dd className="mt-1 font-medium text-neutral-900">{decision.title}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Question</dt>
            <dd className="mt-1 leading-6 text-neutral-800">{decision.question}</dd>
          </div>
          {decision.context ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Context</dt>
              <dd className="mt-1 leading-6 text-neutral-800">{decision.context}</dd>
            </div>
          ) : null}
          {decision.constraints ? (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Constraints</dt>
              <dd className="mt-1 leading-6 text-neutral-800">
                {decision.constraints}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-neutral-500">Total Duration</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {formatDuration(result.totalDurationMs)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Execution ID</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {result.integrity.executionId}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Language</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {result.integrity.language}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Advisors</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {result.advisors.length} live
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-neutral-500">Chairman</dt>
            <dd className="mt-1 font-medium text-neutral-900">
              {result.chairman?.status === "success"
                ? "Live Chairman (synthesized from advisor outputs)"
                : result.chairman?.status === "failed"
                  ? "Chairman synthesis failed"
                  : "Not enabled"}
            </dd>
          </div>
        </dl>
      </div>

      {result.chairman ? <ChairmanCard chairman={result.chairman} /> : null}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Advisor Perspectives
        </h2>
        <div className="grid gap-6 xl:grid-cols-2">
          {result.advisors.map((advisor) => (
            <AdvisorCard key={advisor.persona.id} advisor={advisor} />
          ))}
        </div>
      </div>
    </section>
  );
}
