import type { CouncilResult } from "@/types/council";
import {
  aggregateCouncilMetrics,
  formatCostUsd,
  formatDurationReadable,
} from "@/lib/council/council-display";
import { DisclosureSection } from "@/components/disclosure-section";

interface CouncilMetricsProps {
  result: CouncilResult;
}

export function CouncilMetrics({ result }: CouncilMetricsProps) {
  const metrics = aggregateCouncilMetrics(result);

  return (
    <DisclosureSection title="Technical details and execution metrics">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500">Total Council duration</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {formatDurationReadable(result.totalDurationMs)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Advisor stage duration</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {formatDurationReadable(result.advisorStageDurationMs)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Chairman duration</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {formatDurationReadable(result.chairmanDurationMs)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Total tokens</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {metrics.totalTokens > 0
              ? metrics.totalTokens.toLocaleString()
              : "Not provided"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Advisor tokens</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {metrics.advisorTokens > 0
              ? metrics.advisorTokens.toLocaleString()
              : "Not provided"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Chairman tokens</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {metrics.chairmanTokens > 0
              ? metrics.chairmanTokens.toLocaleString()
              : "Not provided"}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Estimated cost</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {formatCostUsd(metrics.totalCost)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-neutral-500">Models</dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {metrics.models.length > 0 ? metrics.models.join(", ") : "Not provided"}
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
      </dl>
    </DisclosureSection>
  );
}
