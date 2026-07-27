import "server-only";

import type { ValidatedAdvisorOpinion } from "@/lib/council/validated-advisor-opinions";
import type { CouncilDecision } from "@/types/council";
import type {
  RecommendationPolarity,
  ConsensusAgreementEntry,
  ConsensusCompetingPosition,
  ConsensusDisagreementEntry,
  ConsensusMinorityPosition,
  ConsensusUnresolvedConflict,
} from "@/lib/council/consensus/types";

export type RecommendationCluster = {
  readonly recommendation: CouncilDecision;
  readonly opinions: readonly ValidatedAdvisorOpinion[];
};

export type StructuralAnalysis = {
  readonly clusters: readonly RecommendationCluster[];
  readonly dominantRecommendation: CouncilDecision | null;
  readonly dominantShare: number;
  readonly agreementMap: readonly ConsensusAgreementEntry[];
  readonly disagreementMap: readonly ConsensusDisagreementEntry[];
  readonly minorityPositions: readonly ConsensusMinorityPosition[];
  readonly unresolvedConflicts: readonly ConsensusUnresolvedConflict[];
  readonly relationshipSummary: readonly string[];
  readonly hasRecommendationConflict: boolean;
  readonly hasContradictoryEvidence: boolean;
};

const ADVANCE_RECOMMENDATIONS = new Set<CouncilDecision>([
  "proceed",
  "proceed_with_conditions",
  "test_first",
]);

export function recommendationPolarity(
  recommendation: CouncilDecision,
): RecommendationPolarity {
  if (ADVANCE_RECOMMENDATIONS.has(recommendation)) {
    return "advance";
  }
  if (recommendation === "do_not_proceed") {
    return "halt";
  }
  return "defer";
}

function compareAdvisorId(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareAdvisorId);
}

/**
 * Group eligible opinions by exact recommendation stance.
 * Cluster order: descending size, then recommendation lexicographic, then advisorIds.
 */
export function clusterByRecommendation(
  opinions: readonly ValidatedAdvisorOpinion[],
): RecommendationCluster[] {
  const byRecommendation = new Map<
    CouncilDecision,
    ValidatedAdvisorOpinion[]
  >();

  for (const opinion of opinions) {
    const group = byRecommendation.get(opinion.recommendation) ?? [];
    group.push(opinion);
    byRecommendation.set(opinion.recommendation, group);
  }

  for (const group of byRecommendation.values()) {
    group.sort((a, b) => compareAdvisorId(a.advisorId, b.advisorId));
  }

  return [...byRecommendation.entries()]
    .map(([recommendation, group]) =>
      Object.freeze({
        recommendation,
        opinions: Object.freeze([...group]),
      }),
    )
    .sort((a, b) => {
      if (b.opinions.length !== a.opinions.length) {
        return b.opinions.length - a.opinions.length;
      }
      return a.recommendation.localeCompare(b.recommendation);
    });
}

function toCompetingPosition(
  cluster: RecommendationCluster,
): ConsensusCompetingPosition {
  return Object.freeze({
    advisorIds: Object.freeze(
      sortIds(cluster.opinions.map((o) => o.advisorId)),
    ),
    recommendation: cluster.recommendation,
    summary: cluster.opinions.map((o) => o.summary).join(" | "),
    keyArguments: Object.freeze(
      cluster.opinions.flatMap((o) => [...o.keyArguments]),
    ),
    risks: Object.freeze(cluster.opinions.flatMap((o) => [...o.risks])),
    assumptions: Object.freeze(
      cluster.opinions.flatMap((o) => [...o.assumptions]),
    ),
  });
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function collectTokens(
  opinions: readonly ValidatedAdvisorOpinion[],
  field: "risks" | "assumptions" | "keyArguments",
): Set<string> {
  const tokens = new Set<string>();
  for (const opinion of opinions) {
    for (const value of opinion[field]) {
      const token = normalizeToken(value);
      if (token) {
        tokens.add(token);
      }
    }
  }
  return tokens;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const value of a) {
    if (b.has(value)) {
      count += 1;
    }
  }
  return count;
}

function hasComplementaryFacets(
  opinions: readonly ValidatedAdvisorOpinion[],
): boolean {
  if (opinions.length < 2) {
    return false;
  }

  const riskSets = opinions.map((o) => collectTokens([o], "risks"));
  const assumptionSets = opinions.map((o) => collectTokens([o], "assumptions"));
  const argumentSets = opinions.map((o) => collectTokens([o], "keyArguments"));

  for (let i = 0; i < opinions.length; i += 1) {
    for (let j = i + 1; j < opinions.length; j += 1) {
      const sharedRisks = intersectionSize(riskSets[i], riskSets[j]);
      const sharedAssumptions = intersectionSize(
        assumptionSets[i],
        assumptionSets[j],
      );
      const sharedArguments = intersectionSize(
        argumentSets[i],
        argumentSets[j],
      );
      const unionRisks = new Set([...riskSets[i], ...riskSets[j]]).size;
      const unionAssumptions = new Set([
        ...assumptionSets[i],
        ...assumptionSets[j],
      ]).size;
      const unionArguments = new Set([...argumentSets[i], ...argumentSets[j]])
        .size;

      if (
        unionRisks > sharedRisks ||
        unionAssumptions > sharedAssumptions ||
        unionArguments > sharedArguments
      ) {
        return true;
      }
    }
  }

  return false;
}

function findSharedSupportAcrossConflict(
  advanceClusters: readonly RecommendationCluster[],
  haltClusters: readonly RecommendationCluster[],
): string[] {
  const advanceOpinions = advanceClusters.flatMap((c) => c.opinions);
  const haltOpinions = haltClusters.flatMap((c) => c.opinions);

  const advanceSupport = new Set([
    ...collectTokens(advanceOpinions, "risks"),
    ...collectTokens(advanceOpinions, "assumptions"),
    ...collectTokens(advanceOpinions, "keyArguments"),
  ]);
  const haltSupport = new Set([
    ...collectTokens(haltOpinions, "risks"),
    ...collectTokens(haltOpinions, "assumptions"),
    ...collectTokens(haltOpinions, "keyArguments"),
  ]);

  const shared: string[] = [];
  for (const token of advanceSupport) {
    if (haltSupport.has(token)) {
      shared.push(token);
    }
  }
  return shared.sort((a, b) => a.localeCompare(b));
}

/**
 * Deterministic structural agreement/disagreement analysis (ENG-0006 §8).
 * Uses recommendation stance and exact rationale-token overlap only.
 */
export function analyzeStructuralRelationships(
  opinions: readonly ValidatedAdvisorOpinion[],
): StructuralAnalysis {
  if (opinions.length === 0) {
    return Object.freeze({
      clusters: Object.freeze([]),
      dominantRecommendation: null,
      dominantShare: 0,
      agreementMap: Object.freeze([]),
      disagreementMap: Object.freeze([
        Object.freeze({
          kind: "insufficient_evidence" as const,
          category: "scope" as const,
          topic: "No eligible advisor opinions available for comparison.",
          positions: Object.freeze([]),
        }),
      ]),
      minorityPositions: Object.freeze([]),
      unresolvedConflicts: Object.freeze([
        Object.freeze({
          kind: "insufficient_evidence" as const,
          topic: "No eligible advisor opinions",
          advisorIds: Object.freeze([]),
          note: "Consensus cannot characterize agreement without eligible opinions.",
        }),
      ]),
      relationshipSummary: Object.freeze(["insufficient_evidence"]),
      hasRecommendationConflict: false,
      hasContradictoryEvidence: false,
    });
  }

  const clusters = clusterByRecommendation(opinions);
  const dominant = clusters[0];
  const dominantRecommendation = dominant.recommendation;
  const dominantShare = dominant.opinions.length / opinions.length;

  const agreementMap: ConsensusAgreementEntry[] = [];
  const disagreementMap: ConsensusDisagreementEntry[] = [];
  const minorityPositions: ConsensusMinorityPosition[] = [];
  const unresolvedConflicts: ConsensusUnresolvedConflict[] = [];
  const relationshipSummary: string[] = [];

  const advanceClusters = clusters.filter(
    (c) => recommendationPolarity(c.recommendation) === "advance",
  );
  const haltClusters = clusters.filter(
    (c) => recommendationPolarity(c.recommendation) === "halt",
  );
  const deferClusters = clusters.filter(
    (c) => recommendationPolarity(c.recommendation) === "defer",
  );

  const hasRecommendationConflict =
    advanceClusters.length > 0 && haltClusters.length > 0;

  const sharedConflictSupport = hasRecommendationConflict
    ? findSharedSupportAcrossConflict(advanceClusters, haltClusters)
    : [];
  const hasContradictoryEvidence = sharedConflictSupport.length > 0;

  // Full / complementary agreement on identical recommendation (requires ≥2).
  if (clusters.length === 1 && opinions.length >= 2) {
    const advisorIds = sortIds(opinions.map((o) => o.advisorId));
    if (dominantRecommendation === "insufficient_information") {
      disagreementMap.push(
        Object.freeze({
          kind: "insufficient_evidence",
          category: "scope",
          topic: "Eligible advisors uniformly report insufficient information.",
          positions: Object.freeze([toCompetingPosition(dominant)]),
        }),
      );
      relationshipSummary.push("insufficient_evidence");
    } else {
      agreementMap.push(
        Object.freeze({
          kind: "full_agreement",
          dimension: "recommendation",
          position: dominantRecommendation,
          advisorIds: Object.freeze(advisorIds),
          qualifications: Object.freeze([]),
        }),
      );
      relationshipSummary.push("full_agreement");

      if (hasComplementaryFacets(opinions)) {
        agreementMap.push(
          Object.freeze({
            kind: "complementary",
            dimension: "recommendation",
            position: dominantRecommendation,
            advisorIds: Object.freeze(advisorIds),
            qualifications: Object.freeze([
              "Advisors share recommendation stance while contributing distinct rationale facets.",
            ]),
          }),
        );
        relationshipSummary.push("complementary");
      }
    }
  }

  // Partial agreement: multiple advance recommendations without halt conflict.
  if (
    !hasRecommendationConflict &&
    advanceClusters.length >= 2 &&
    opinions.length >= 2
  ) {
    const advisorIds = sortIds(
      advanceClusters.flatMap((c) => c.opinions.map((o) => o.advisorId)),
    );
    agreementMap.push(
      Object.freeze({
        kind: "partial_agreement",
        dimension: "recommendation",
        position: "advance_family",
        advisorIds: Object.freeze(advisorIds),
        qualifications: Object.freeze(
          advanceClusters.map(
            (c) =>
              `${c.recommendation}: ${c.opinions.map((o) => o.advisorId).join(",")}`,
          ),
        ),
      }),
    );
    relationshipSummary.push("partial_agreement");
  }

  if (hasRecommendationConflict) {
    const positions = [...advanceClusters, ...haltClusters].map((cluster) =>
      toCompetingPosition(cluster),
    );
    disagreementMap.push(
      Object.freeze({
        kind: "conflicting_recommendations",
        category: "recommendation",
        topic: "Advance-family recommendations conflict with do_not_proceed.",
        positions: Object.freeze(positions),
      }),
    );
    relationshipSummary.push("conflicting_recommendations");

    unresolvedConflicts.push(
      Object.freeze({
        kind: "conflicting_recommendations",
        topic: "Recommendation polarity conflict",
        advisorIds: Object.freeze(
          sortIds(positions.flatMap((p) => p.advisorIds)),
        ),
        note: "Competing advance and halt recommendations remain unresolved by structural analysis.",
      }),
    );
  }

  if (hasContradictoryEvidence) {
    disagreementMap.push(
      Object.freeze({
        kind: "contradictory_evidence",
        category: "evidence",
        topic:
          "Conflicting recommendation camps share identical support tokens.",
        positions: Object.freeze(
          [...advanceClusters, ...haltClusters].map((cluster) =>
            toCompetingPosition(cluster),
          ),
        ),
      }),
    );
    relationshipSummary.push("contradictory_evidence");
    unresolvedConflicts.push(
      Object.freeze({
        kind: "contradictory_evidence",
        topic: "Shared support under opposing recommendations",
        advisorIds: Object.freeze(
          sortIds(
            [...advanceClusters, ...haltClusters].flatMap((c) =>
              c.opinions.map((o) => o.advisorId),
            ),
          ),
        ),
        note: `Shared tokens: ${sharedConflictSupport.join("; ")}`,
      }),
    );
  }

  // Minority / non-dominant clusters (ENG-0006 FR-CO-04 / §8.2).
  for (const cluster of clusters.slice(1)) {
    minorityPositions.push(
      Object.freeze({
        advisorIds: Object.freeze(
          sortIds(cluster.opinions.map((o) => o.advisorId)),
        ),
        recommendation: cluster.recommendation,
        statement: cluster.opinions.map((o) => o.summary).join(" | "),
        keyArguments: Object.freeze(
          cluster.opinions.flatMap((o) => [...o.keyArguments]),
        ),
        risks: Object.freeze(cluster.opinions.flatMap((o) => [...o.risks])),
        assumptions: Object.freeze(
          cluster.opinions.flatMap((o) => [...o.assumptions]),
        ),
        whyItDiffers: `Non-dominant recommendation "${cluster.recommendation}" vs dominant "${dominantRecommendation}".`,
      }),
    );
  }

  // Defer-only or mixed defer without advance/halt agreement characterization.
  if (
    opinions.length >= 2 &&
    deferClusters.length > 0 &&
    advanceClusters.length === 0 &&
    haltClusters.length === 0 &&
    clusters.length > 1
  ) {
    // Only insufficient_information variants — already handled if single cluster.
  }

  if (opinions.length === 1) {
    relationshipSummary.push("single_advisor");
    unresolvedConflicts.push(
      Object.freeze({
        kind: "insufficient_evidence",
        topic: "Single eligible advisor",
        advisorIds: Object.freeze([opinions[0].advisorId]),
        note: "Agreement requires at least two independent eligible opinions.",
      }),
    );
  }

  if (relationshipSummary.length === 0) {
    relationshipSummary.push("no_consensus");
  }

  return Object.freeze({
    clusters: Object.freeze(clusters),
    dominantRecommendation,
    dominantShare,
    agreementMap: Object.freeze(agreementMap),
    disagreementMap: Object.freeze(disagreementMap),
    minorityPositions: Object.freeze(minorityPositions),
    unresolvedConflicts: Object.freeze(unresolvedConflicts),
    relationshipSummary: Object.freeze([...new Set(relationshipSummary)]),
    hasRecommendationConflict,
    hasContradictoryEvidence,
  });
}
