import type { EvidencePackage } from "@/types/pkos";

const RETRIEVAL_STATUS_LABELS: Record<EvidencePackage["retrievalStatus"], string> = {
  complete: "Complete",
  partial: "Partial",
  insufficient: "Insufficient",
  failed: "Failed",
};

interface PkosSourcesPanelProps {
  evidencePackage: EvidencePackage;
}

export function PkosSourcesPanel({ evidencePackage }: PkosSourcesPanelProps) {
  return (
    <section
      aria-label="Canonical PKOS sources"
      className="rounded-lg border border-neutral-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Canonical PKOS sources
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Evidence retrieved before Council deliberation began.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
          {RETRIEVAL_STATUS_LABELS[evidencePackage.retrievalStatus]}
        </span>
      </div>

      {evidencePackage.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Retrieval warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {evidencePackage.warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.artifactId ?? index}`}>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evidencePackage.sources.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {evidencePackage.sources.map((source) => (
            <li
              key={`${source.artifactId}-${source.path}`}
              className="rounded-md border border-neutral-200 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-neutral-900">{source.artifactId}</span>
                <span className="text-neutral-500">{source.family}</span>
                {source.status ? (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {source.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-medium text-neutral-800">{source.title}</p>
              <p className="mt-1 text-neutral-600">{source.path}</p>
              <p className="mt-2 text-neutral-700">
                Relevance: {source.relevanceScore} — {source.relevanceReasons.join("; ")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-neutral-700">
          No canonical PKOS sources were selected for this session.
        </p>
      )}
    </section>
  );
}
