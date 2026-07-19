import { advisorPersonas } from "@/data/advisor-personas";
import { councilConfig } from "@/config/council";

const LOADING_MESSAGES: Record<string, string> = {
  "ADV-001": "Consulting OpenRouter for risk analysis...",
  "ADV-002": "Challenging assumptions (prototype mock)...",
  "ADV-003": "Looking for opportunities (prototype mock)...",
  "ADV-004": "Bringing a fresh perspective (prototype mock)...",
  "ADV-005": "Preparing an execution plan (prototype mock)...",
};

export function LoadingState() {
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="rounded-lg border border-neutral-200 bg-white p-8"
    >
      <h2 className="text-lg font-semibold text-neutral-900">
        The Council is reviewing the decision.
      </h2>

      <ul className="mt-6 space-y-4" role="list">
        {advisorPersonas.map((advisor) => {
          const isLive = councilConfig.liveAdvisorIds.includes(
            advisor.id as (typeof councilConfig.liveAdvisorIds)[number],
          );

          return (
            <li
              key={advisor.id}
              className="border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-neutral-900">{advisor.displayName}</p>
                <span
                  className={
                    isLive
                      ? "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800"
                      : "rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-600"
                  }
                >
                  {isLive ? "Live AI" : "Prototype Mock"}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {LOADING_MESSAGES[advisor.id]}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm text-neutral-500">
        The Contrarian uses OpenRouter. Other advisors and the Chairman remain
        static prototype responses.
      </p>
    </section>
  );
}
