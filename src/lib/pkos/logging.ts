import type { EvidencePackage } from "@/types/pkos";

export function logPKOSRetrievalEvent(
  event: string,
  payload: Record<string, unknown>,
): void {
  console.info("[PKOS Retrieval]", JSON.stringify({ event, ...payload }));
}

export function logPKOSRetrievalStarted(executionId: string): void {
  logPKOSRetrievalEvent("retrieval_started", { executionId });
}

export function logPKOSRetrievalCompleted(
  evidencePackage: EvidencePackage,
  metrics: {
    executionId: string;
    discoveredCount: number;
    eligibleCount: number;
    durationMs: number;
  },
): void {
  logPKOSRetrievalEvent("retrieval_completed", {
    executionId: metrics.executionId,
    discoveredCount: metrics.discoveredCount,
    eligibleCount: metrics.eligibleCount,
    selectedSourceIds: evidencePackage.sources.map((source) => source.artifactId),
    retrievalStatus: evidencePackage.retrievalStatus,
    warningCount: evidencePackage.warnings.length,
    durationMs: metrics.durationMs,
  });
}

export function logPKOSRetrievalWarning(
  executionId: string,
  warning: { code: string; message: string; artifactId?: string },
): void {
  logPKOSRetrievalEvent("retrieval_warning", {
    executionId,
    code: warning.code,
    message: warning.message,
    artifactId: warning.artifactId,
  });
}
