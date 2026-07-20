import { advisorPersonas } from "@/data/advisor-personas";

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
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-neutral-900">{advisor.displayName}</p>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Live AI
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              Analyzing the shared decision context...
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-neutral-500">
        Every advisor and the Chairman analyze the same decision context for this
        execution. Only the advisor perspective differs.
      </p>
    </section>
  );
}
