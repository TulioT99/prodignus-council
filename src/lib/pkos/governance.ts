import {
  EXCLUDED_ARTIFACT_STATUSES,
  PREFERRED_ARTIFACT_STATUSES,
} from "@/lib/pkos/constants";
import type { PKOSArtifact, RetrievalWarning } from "@/types/pkos";

export type GovernanceEligibility = {
  readonly eligible: boolean;
  readonly warnings: readonly RetrievalWarning[];
  readonly precedenceScore: number;
};

function buildWarning(
  code: RetrievalWarning["code"],
  message: string,
  artifact: PKOSArtifact,
): RetrievalWarning {
  return Object.freeze({
    code,
    message,
    artifactId: artifact.id,
    path: artifact.path,
  });
}

export function evaluateGovernanceEligibility(
  artifact: PKOSArtifact,
): GovernanceEligibility {
  const warnings: RetrievalWarning[] = [];

  if (!artifact.id.trim()) {
    return Object.freeze({
      eligible: false,
      warnings: Object.freeze([
        buildWarning(
          "PARSING_WARNING",
          "Artifact excluded because its identifier could not be established safely.",
          artifact,
        ),
      ]),
      precedenceScore: -1000,
    });
  }

  const status = artifact.status?.toLowerCase();

  if (status && EXCLUDED_ARTIFACT_STATUSES.has(status)) {
    return Object.freeze({
      eligible: false,
      warnings: Object.freeze([
        buildWarning(
          "PARSING_WARNING",
          `Artifact excluded because status "${status}" is not eligible for canonical evidence.`,
          artifact,
        ),
      ]),
      precedenceScore: -1000,
    });
  }

  let precedenceScore = 0;

  if (artifact.isNavigationOnly) {
    warnings.push(
      buildWarning(
        "NAVIGATION_ONLY",
        "Navigation-only artifact; deprioritized unless explicitly requested.",
        artifact,
      ),
    );
    precedenceScore -= 200;
  }

  if (status === "draft") {
    warnings.push(
      buildWarning(
        "DRAFT_EVIDENCE",
        "Draft artifact selected because no higher-authority source was available.",
        artifact,
      ),
    );
    precedenceScore += 10;
  } else if (status === "proposed") {
    warnings.push(
      buildWarning(
        "PROPOSED_EVIDENCE",
        "Proposed artifact selected because no approved or accepted source was available.",
        artifact,
      ),
    );
    precedenceScore += 5;
  } else if (status && PREFERRED_ARTIFACT_STATUSES.has(status)) {
    precedenceScore += 100;
  } else if (status === "approved" || status === "accepted") {
    precedenceScore += 100;
  } else if (!status) {
    precedenceScore += 20;
  }

  for (const parsingWarning of artifact.parsingWarnings) {
    warnings.push(
      buildWarning("PARSING_WARNING", parsingWarning, artifact),
    );
  }

  return Object.freeze({
    eligible: true,
    warnings: Object.freeze(warnings),
    precedenceScore,
  });
}

export function isPreferredStatus(status: string | undefined): boolean {
  if (!status) {
    return false;
  }

  return PREFERRED_ARTIFACT_STATUSES.has(status.toLowerCase());
}

export function compareCanonicalPrecedence(
  left: PKOSArtifact,
  right: PKOSArtifact,
): number {
  const leftPreferred = isPreferredStatus(left.status) ? 1 : 0;
  const rightPreferred = isPreferredStatus(right.status) ? 1 : 0;

  if (leftPreferred !== rightPreferred) {
    return rightPreferred - leftPreferred;
  }

  const leftDraft = left.status === "draft" ? 1 : 0;
  const rightDraft = right.status === "draft" ? 1 : 0;

  if (leftDraft !== rightDraft) {
    return leftDraft - rightDraft;
  }

  return left.path.localeCompare(right.path);
}
