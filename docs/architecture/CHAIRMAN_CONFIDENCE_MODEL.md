# WP-05C — Chairman Confidence Triad & Uncertainty Model

**Status:** Implemented — WP-05C engineering slice  
**Governing specification:** ENG-0007 §10 Confidence Model / §11 Uncertainty Communication (Approved v1.0)  
**Predecessor baseline:** WP-05B @ `08dc9cd02188b337f70ffbb796f48e220726cd8b`

## Purpose

Replace a single opaque Chairman confidence number with an explicit **Confidence Triad** and a structured **Decision Uncertainty** package.

This improves **decision transparency**, not decision quality. Chairman prompts, Consensus Engine behavior, PKOS retrieval, Decision Policy, and recovery remain unchanged in this slice.

## Confidence Triad (`DecisionConfidence`)

| Dimension                  | Meaning                                                                    | Source                                                                               |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `evidenceConfidence`       | How complete/reliable is the evidence landscape available to the Chairman? | Structural Consensus Package indicators (coverage, conflicts, degradation, status)   |
| `reasoningConfidence`      | How coherent is the Chairman synthesis signal?                             | Chairman numeric confidence, **capped by** evidence confidence (no silent inflation) |
| `recommendationConfidence` | How strongly should the published recommendation be trusted for action?    | Derived: `min(evidence, reasoning)`, reduced further under material uncertainty      |

Also published (distinct, preserved):

| Field                 | Meaning                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `consensusConfidence` | Consensus Package `confidence.overall` from ENG-0006 — **never overwritten** |

Method identity: `wp05c_structural_min_v1`.

`ChairmanSuccessResult.confidence` is retained as an **API alias** of `recommendationConfidence` (0–1). Presentation must expose the triad, not only this alias.

## Decision Uncertainty (`DecisionUncertainty`)

Uncertainty is always present on successful publication and is never hidden.

| Field                                              | Role                                                         |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `material`                                         | Whether material uncertainty indicators were detected        |
| `evidenceGaps`                                     | Coverage gaps / open questions / minimum additional evidence |
| `unresolvedDisagreement`                           | Unresolved conflict / disagreement topics                    |
| `conflictingAdvisors`                              | Advisor IDs participating in conflicting positions           |
| `assumptionsMade`                                  | Explicit assumptions from synthesis                          |
| `informationLimitations`                           | Unknowns, degradation flags, missing perspectives            |
| `whatIsKnown` / `whatIsDisputed` / `whatIsMissing` | Explicit knowledge inventory                                 |
| `howItConstrainsRecommendation`                    | How uncertainty bounds action trust                          |
| `nextStepsToReduceUncertainty`                     | Concrete reduction steps when available                      |

## Generation lifecycle

```text
Consensus Package (ENG-0006)
        ↓
Chairman contract validation (WP-05A)
        ↓
Chairman synthesis (prompts unchanged)
        ↓
buildDecisionMetadata + validateDecisionMetadata (WP-05B)
        ↓
buildDecisionConfidence + buildDecisionUncertainty (exactly once)
        ↓
validateDecisionConfidence (WP-05C)
        ↓
ChairmanSuccessResult.{decisionConfidence, uncertainty, confidence}
        ↓
CouncilResult → API JSON → Presentation (triad + uncertainty)
```

Confidence is generated **once** on the success path and is not regenerated downstream.

Publication continues with Decision Policy Evaluation (WP-05D) after confidence validation.

## Validation rules (publication gate)

Before successful publication, validation requires:

1. `DecisionConfidence` and `DecisionUncertainty` both present
2. `schemaVersion === "1.0"` and `method === "wp05c_structural_min_v1"`
3. All confidence scalars finite and in `[0, 1]`
4. `consensusConfidence` preserves Consensus Package overall confidence
5. `reasoningConfidence ≤ evidenceConfidence`
6. `recommendationConfidence ≤ min(evidence, reasoning)`
7. Uncertainty array fields are arrays; `material` is boolean
8. Confidence notes are non-empty

Invalid confidence fails closed as `ChairmanFailed` with `INVALID_DECISION_CONFIDENCE`.

## Failure handling

`ChairmanFailed` must **not** contain `decisionConfidence`, `uncertainty`, or success metadata. Failures remain confidence-free.

## Serialization

Field names are stable JSON keys on the published Chairman success artifact. The model is provider-independent (no OpenRouter / model-specific fields).

## Presentation

Council Recommendation UI surfaces:

- Evidence / Reasoning / Recommendation as distinct triad values
- Preserved consensus confidence as secondary lineage context
- Explicit uncertainty disclosure when `material === true`

Do not display only a single opaque percentage as the sole confidence signal.

## Module map

| Path                                              | Responsibility                                  |
| ------------------------------------------------- | ----------------------------------------------- |
| `src/lib/council/chairman-decision-confidence.ts` | Build + validate Confidence Triad / Uncertainty |
| `src/types/council.ts`                            | `DecisionConfidence`, `DecisionUncertainty`     |
| `src/lib/council/chairman-runner.ts`              | Generate/validate once on success path          |
| `src/lib/council/council-display.ts`              | Triad + uncertainty presentation helpers        |
| `src/components/chairman-card.tsx`                | Surfaces triad and uncertainty                  |

## Out of scope (later WP-05 slices)

- Decision Policy enforcement (WP-05D)
- Failure model & recovery expansion (WP-05E)
- Conformance testing & final publication (WP-05F)
