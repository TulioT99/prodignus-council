import type { CouncilSessionStatus } from "@/types/council";
import {
  SESSION_STATUS_DESCRIPTIONS,
  SESSION_STATUS_LABELS,
} from "@/lib/council/council-display";

interface CouncilStatusBannerProps {
  status: CouncilSessionStatus;
  unavailableAdvisors?: string[];
}

const STATUS_STYLES: Record<
  CouncilSessionStatus,
  { container: string; badge: string }
> = {
  complete: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-950",
    badge: "border-emerald-300 bg-white text-emerald-900",
  },
  partial: {
    container: "border-amber-200 bg-amber-50 text-amber-950",
    badge: "border-amber-300 bg-white text-amber-900",
  },
  failed: {
    container: "border-red-200 bg-red-50 text-red-950",
    badge: "border-red-300 bg-white text-red-900",
  },
};

export function CouncilStatusBanner({
  status,
  unavailableAdvisors = [],
}: CouncilStatusBannerProps) {
  const styles = STATUS_STYLES[status];

  return (
    <div
      role="status"
      className={`rounded-lg border p-5 ${styles.container}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles.badge}`}
        >
          Council status: {SESSION_STATUS_LABELS[status]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6">{SESSION_STATUS_DESCRIPTIONS[status]}</p>
      {status === "partial" && unavailableAdvisors.length > 0 ? (
        <p className="mt-2 text-sm leading-6">
          Unavailable perspectives: {unavailableAdvisors.join(", ")}. Confidence
          may be reduced, but the Council still produced a usable recommendation.
        </p>
      ) : null}
    </div>
  );
}
