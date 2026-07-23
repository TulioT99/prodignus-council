import { extractHeading } from "@/lib/pkos/metadata-parser";
import type { PKOSArtifact, RankedArtifact, RequestAnalysis } from "@/types/pkos";

function countKeywordMatches(content: string, keywords: readonly string[]): number {
  const normalized = content.toLowerCase();
  let count = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      count += 1;
    }
  }

  return count;
}

export function rankArtifacts(
  artifacts: readonly PKOSArtifact[],
  analysis: RequestAnalysis,
): RankedArtifact[] {
  const ranked = artifacts.map((artifact) => {
    const reasons: string[] = [];
    let score = 0;
    const normalizedId = artifact.id.toUpperCase();
    const normalizedTitle = artifact.title.toLowerCase();
    const heading = extractHeading(artifact.content)?.toLowerCase() ?? "";
    const searchable = `${artifact.title}\n${artifact.content}`.toLowerCase();

    if (analysis.documentIds.includes(normalizedId)) {
      score += 1000;
      reasons.push(`Exact document ID match (${normalizedId}).`);
    }

    for (const phrase of analysis.phrases) {
      if (searchable.includes(phrase)) {
        score += 120;
        reasons.push(`Phrase match (${phrase}).`);
      }
    }

    if (
      analysis.normalizedText.toLowerCase().includes(normalizedTitle) &&
      normalizedTitle.length >= 8
    ) {
      score += 200;
      reasons.push("Exact title match.");
    }

    if (
      heading &&
      analysis.normalizedText.toLowerCase().includes(heading) &&
      heading.length >= 8
    ) {
      score += 180;
      reasons.push("Heading match.");
    }

    if (artifact.related?.some((relatedId) => analysis.documentIds.includes(relatedId))) {
      score += 90;
      reasons.push("Related document reference match.");
    }

    const keywordMatches = countKeywordMatches(searchable, analysis.keywords);

    if (keywordMatches > 0) {
      score += Math.min(keywordMatches * 10, 80);
      reasons.push(`Keyword matches (${keywordMatches}).`);
    }

    if (analysis.families.includes(artifact.family)) {
      score += 30;
      reasons.push(`Document family relevance (${artifact.family}).`);
    }

    if (artifact.isNavigationOnly && !analysis.documentIds.includes(normalizedId)) {
      score -= 500;
      reasons.push("Navigation-only artifact deprioritized.");
    }

    if (reasons.length === 0) {
      reasons.push("Included through repository scan with minimal direct relevance.");
    }

    return Object.freeze({
      artifact,
      relevanceScore: score,
      relevanceReasons: Object.freeze(reasons),
    });
  });

  return ranked
    .filter((entry) => entry.relevanceScore > -400)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return left.artifact.path.localeCompare(right.artifact.path);
    });
}

export function filterRankedArtifactsForExplicitIds(
  ranked: readonly RankedArtifact[],
  analysis: RequestAnalysis,
): RankedArtifact[] {
  if (analysis.documentIds.length === 0) {
    return [...ranked];
  }

  const explicitMatches = ranked.filter((entry) =>
    analysis.documentIds.includes(entry.artifact.id.toUpperCase()),
  );

  if (explicitMatches.length > 0) {
    return explicitMatches;
  }

  return [...ranked];
}
