import "server-only";

import {
  discoverMarkdownArtifacts,
  readArtifactFile,
  toRepositoryRelativePath,
} from "@/lib/pkos/discovery";
import {
  buildEvidencePackage,
  createFailedEvidencePackage,
} from "@/lib/pkos/evidence-package-builder";
import { evaluateGovernanceEligibility } from "@/lib/pkos/governance";
import {
  logPKOSRetrievalCompleted,
  logPKOSRetrievalStarted,
  logPKOSRetrievalWarning,
} from "@/lib/pkos/logging";
import { parsePKOSArtifact } from "@/lib/pkos/metadata-parser";
import {
  filterRankedArtifactsForExplicitIds,
  rankArtifacts,
} from "@/lib/pkos/ranking";
import {
  analyzeCouncilRequest,
  buildRequestSummary,
} from "@/lib/pkos/request-analyzer";
import { resolveEvidence } from "@/lib/pkos/resolver";
import { PKOSConfigurationError, resolvePKOSRetrievalConfig } from "@/lib/pkos/config";
import type { DecisionContext } from "@/types/council";
import type { EvidencePackage, PKOSArtifact, RetrievalWarning } from "@/types/pkos";

export type PKOSRetrievalDependencies = {
  readonly loadConfig?: typeof resolvePKOSRetrievalConfig;
  readonly discoverArtifacts?: typeof discoverMarkdownArtifacts;
  readonly readArtifact?: typeof readArtifactFile;
  readonly now?: () => string;
};

function loadEligibleArtifacts(
  repositoryPath: string,
  discoverArtifacts: typeof discoverMarkdownArtifacts,
  readArtifact: typeof readArtifactFile,
): {
  artifacts: PKOSArtifact[];
  warnings: RetrievalWarning[];
} {
  const artifacts: PKOSArtifact[] = [];
  const warnings: RetrievalWarning[] = [];
  const discoveredPaths = discoverArtifacts(repositoryPath);

  for (const absolutePath of discoveredPaths) {
    const relativePath = toRepositoryRelativePath(repositoryPath, absolutePath);
    const rawContent = readArtifact(repositoryPath, absolutePath);
    const parsed = parsePKOSArtifact(relativePath, rawContent);

    for (const warning of parsed.warnings) {
      warnings.push(
        Object.freeze({
          code: "PARSING_WARNING",
          message: warning,
          path: relativePath,
        }),
      );
    }

    if (!parsed.artifact) {
      continue;
    }

    const eligibility = evaluateGovernanceEligibility(parsed.artifact);

    warnings.push(...eligibility.warnings);

    if (eligibility.eligible) {
      artifacts.push(parsed.artifact);
    }
  }

  return { artifacts, warnings };
}

export function retrieveEvidenceForCouncil(
  decisionContext: DecisionContext,
  dependencies: PKOSRetrievalDependencies = {},
): EvidencePackage {
  const startedAt = Date.now();
  const generatedAt = dependencies.now?.() ?? new Date().toISOString();
  const requestSummary = buildRequestSummary(decisionContext);

  logPKOSRetrievalStarted(decisionContext.executionId);

  let config;

  try {
    config = dependencies.loadConfig?.() ?? resolvePKOSRetrievalConfig();
  } catch (error) {
    const message =
      error instanceof PKOSConfigurationError
        ? error.message
        : "PKOS configuration could not be validated.";

    const failedPackage = createFailedEvidencePackage({
      requestSummary,
      generatedAt,
      warnings: Object.freeze([
        Object.freeze({
          code: "PKOS_UNAVAILABLE",
          message,
        }),
      ]),
    });

    logPKOSRetrievalCompleted(failedPackage, {
      executionId: decisionContext.executionId,
      discoveredCount: 0,
      eligibleCount: 0,
      durationMs: Date.now() - startedAt,
    });

    return failedPackage;
  }

  if (!config) {
    const failedPackage = createFailedEvidencePackage({
      requestSummary,
      generatedAt,
      warnings: Object.freeze([
        Object.freeze({
          code: "PKOS_UNAVAILABLE",
          message: "PKOS_REPOSITORY_PATH is not configured.",
        }),
      ]),
    });

    logPKOSRetrievalCompleted(failedPackage, {
      executionId: decisionContext.executionId,
      discoveredCount: 0,
      eligibleCount: 0,
      durationMs: Date.now() - startedAt,
    });

    return failedPackage;
  }

  const discoverArtifacts =
    dependencies.discoverArtifacts ?? discoverMarkdownArtifacts;
  const readArtifact = dependencies.readArtifact ?? readArtifactFile;
  const discoveredPaths = discoverArtifacts(config.repositoryPath);
  const { artifacts, warnings: loadWarnings } = loadEligibleArtifacts(
    config.repositoryPath,
    discoverArtifacts,
    readArtifact,
  );

  for (const warning of loadWarnings) {
    logPKOSRetrievalWarning(decisionContext.executionId, warning);
  }

  const analysis = analyzeCouncilRequest(decisionContext);
  const ranked = filterRankedArtifactsForExplicitIds(
    rankArtifacts(artifacts, analysis),
    analysis,
  );

  const resolution = resolveEvidence(
    ranked,
    config.maxSources,
    analysis.documentIds,
  );

  for (const warning of resolution.warnings) {
    logPKOSRetrievalWarning(decisionContext.executionId, warning);
  }

  const evidencePackage = buildEvidencePackage({
    requestSummary,
    generatedAt,
    selected: resolution.selected,
    warnings: Object.freeze([...loadWarnings, ...resolution.warnings]),
    retrievalStatus: resolution.retrievalStatus,
    maxExcerptChars: config.maxExcerptChars,
  });

  logPKOSRetrievalCompleted(evidencePackage, {
    executionId: decisionContext.executionId,
    discoveredCount: discoveredPaths.length,
    eligibleCount: artifacts.length,
    durationMs: Date.now() - startedAt,
  });

  return evidencePackage;
}
