import { advisorPersonas } from "@/data/advisor-personas";
import { councilConfig } from "@/config/council";

const LOADING_MESSAGES: Record<string, string> = {
  "ADV-001": "Analyzing risks...",
  "ADV-002": "Challenging assumptions...",
  "ADV-003": "Looking for opportunities...",
  "ADV-004": "Bringing a fresh perspective...",
  "ADV-005": "Preparing an execution plan...",
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
        {advisorPersonas.map((advisor) => (
          <li
            key={advisor.id}
            className="border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0"
          >
            <p className="font-medium text-neutral-900">{advisor.displayName}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {LOADING_MESSAGES[advisor.id]}
            </p>
          </li>
        ))}
      </ul>

      {councilConfig.prototypeMode ? (
        <p className="mt-8 text-sm text-neutral-500">
          Prototype mode. No external AI models are being executed.
        </p>
      ) : null}
    </section>
  );
}
