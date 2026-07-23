import { compareCanonicalPrecedence } from "@/lib/pkos/governance";
import type {
  PKOSArtifact,
  PKOSRetrievalStatus,
  RankedArtifact,
  RetrievalWarning,
} from "@/types/pkos";

const MINIMUM_RELEVANCE_SCORE = 50;

export type EvidenceResolutionResult = {
  readonly selected: readonly RankedArtifact[];
  readonly warnings: readonly RetrievalWarning[];
  readonly retrievalStatus: PKOSRetrievalStatus;
};

function buildWarning(
  code: RetrievalWarning["code"],
  message: string,
  artifact?: PKOSArtifact,
): RetrievalWarning {
  return Object.freeze({
    code,
    message,
    artifactId: artifact?.id,
    path: artifact?.path,
  });
}

export function resolveEvidence(
  ranked: readonly RankedArtifact[],
  maxSources: number,
  explicitDocumentIds: readonly string[],
): EvidenceResolutionResult {
  const warnings: RetrievalWarning[] = [];
  const byId = new Map<string, RankedArtifact[]>();

  for (const entry of ranked) {
    const existing = byId.get(entry.artifact.id) ?? [];
    existing.push(entry);
    byId.set(entry.artifact.id, existing);
  }

  const resolved: RankedArtifact[] = [];

  for (const [artifactId, entries] of [...byId.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (entries.length === 1) {
      resolved.push(entries[0]);
      continue;
    }

    const sorted = [...entries].sort((left, right) =>
      compareCanonicalPrecedence(left.artifact, right.artifact),
    );
    const winner = sorted[0];
    const losers = sorted.slice(1);

    resolved.push(winner);

    warnings.push(
      buildWarning(
        "DUPLICATE_IDENTIFIER",
        `Multiple artifacts share identifier ${artifactId}; canonical precedence applied.`,
        winner.artifact,
      ),
    );

    const activeConflicts = losers.filter(
      (entry) =>
        entry.artifact.status &&
        winner.artifact.status &&
        entry.artifact.status !== winner.artifact.status,
    );

    if (activeConflicts.length > 0) {
      warnings.push(
        buildWarning(
          "CONFLICTING_VERSIONS",
          `Conflicting active versions detected for ${artifactId}.`,
          winner.artifact,
        ),
      );
    }
  }

  resolved.sort((left, right) => {
    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }

    return left.artifact.path.localeCompare(right.artifact.path);
  });

  const explicitMatches = resolved.filter((entry) =>
    explicitDocumentIds.includes(entry.artifact.id.toUpperCase()),
  );

  let selected =
    explicitMatches.length > 0
      ? explicitMatches
      : resolved.filter((entry) => entry.relevanceScore >= MINIMUM_RELEVANCE_SCORE);

  if (selected.length === 0 && resolved.length > 0 && explicitDocumentIds.length > 0) {
    selected = resolved.slice(0, 1);
  }

  selected = selected.slice(0, maxSources);

  let retrievalStatus: PKOSRetrievalStatus = "complete";

  if (selected.length === 0) {
    retrievalStatus = "insufficient";
    warnings.push(
      buildWarning(
        "NO_ELIGIBLE_ARTIFACTS",
        "No eligible PKOS artifacts matched the Council request.",
      ),
    );
  } else if (warnings.some((warning) => warning.code === "CONFLICTING_VERSIONS")) {
    retrievalStatus = "partial";
  } else if (
    selected.some(
      (entry) =>
        entry.artifact.status === "draft" || entry.artifact.status === "proposed",
    )
  ) {
    retrievalStatus = "partial";
  }

  return Object.freeze({
    selected: Object.freeze(selected),
    warnings: Object.freeze(warnings),
    retrievalStatus,
  });
}
