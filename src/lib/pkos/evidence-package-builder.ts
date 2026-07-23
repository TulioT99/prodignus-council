import type {
  EvidencePackage,
  EvidenceSource,
  PKOSRetrievalStatus,
  RankedArtifact,
  RetrievalWarning,
} from "@/types/pkos";

function buildExcerpt(content: string, maxChars: number): {
  excerpt: string;
  truncated: boolean;
} {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  if (normalized.length <= maxChars) {
    return { excerpt: normalized, truncated: false };
  }

  return {
    excerpt: `${normalized.slice(0, maxChars).trimEnd()}…`,
    truncated: true,
  };
}

function freezeSource(source: EvidenceSource): EvidenceSource {
  return Object.freeze({
    ...source,
    relevanceReasons: Object.freeze([...source.relevanceReasons]),
  });
}

export function buildEvidencePackage(input: {
  requestSummary: string;
  generatedAt: string;
  selected: readonly RankedArtifact[];
  warnings: readonly RetrievalWarning[];
  retrievalStatus: PKOSRetrievalStatus;
  maxExcerptChars: number;
}): EvidencePackage {
  const packageWarnings = [...input.warnings];
  const sources = input.selected.map((entry) => {
    const { excerpt, truncated } = buildExcerpt(
      entry.artifact.content,
      input.maxExcerptChars,
    );

    if (truncated) {
      packageWarnings.push(
        Object.freeze({
          code: "EXCERPT_TRUNCATED" as const,
          message: `Excerpt truncated for ${entry.artifact.id}.`,
          artifactId: entry.artifact.id,
          path: entry.artifact.path,
        }),
      );
    }

    return freezeSource(
      Object.freeze({
        artifactId: entry.artifact.id,
        title: entry.artifact.title,
        family: entry.artifact.family,
        status: entry.artifact.status,
        version: entry.artifact.version,
        path: entry.artifact.path,
        relevanceScore: entry.relevanceScore,
        relevanceReasons: Object.freeze([...entry.relevanceReasons]),
        excerpt,
      }),
    );
  });

  const constraints = Object.freeze([
    "Canonical PKOS evidence only; do not treat model knowledge as canonical.",
    "Use excerpts as authoritative context; consult source IDs for traceability.",
  ]);

  return Object.freeze({
    requestSummary: input.requestSummary,
    generatedAt: input.generatedAt,
    sources: Object.freeze(sources),
    constraints: constraints,
    warnings: Object.freeze(packageWarnings),
    retrievalStatus: input.retrievalStatus,
  });
}

export function createFailedEvidencePackage(input: {
  requestSummary: string;
  generatedAt: string;
  warnings: readonly RetrievalWarning[];
}): EvidencePackage {
  return Object.freeze({
    requestSummary: input.requestSummary,
    generatedAt: input.generatedAt,
    sources: Object.freeze([]),
    constraints: Object.freeze([
      "No canonical PKOS evidence was retrieved for this session.",
    ]),
    warnings: Object.freeze([...input.warnings]),
    retrievalStatus: "failed",
  });
}

export function createInsufficientEvidencePackage(input: {
  requestSummary: string;
  generatedAt: string;
  warnings: readonly RetrievalWarning[];
}): EvidencePackage {
  return Object.freeze({
    requestSummary: input.requestSummary,
    generatedAt: input.generatedAt,
    sources: Object.freeze([]),
    constraints: Object.freeze([
      "No sufficient canonical PKOS evidence matched this request.",
    ]),
    warnings: Object.freeze([...input.warnings]),
    retrievalStatus: "insufficient",
  });
}
