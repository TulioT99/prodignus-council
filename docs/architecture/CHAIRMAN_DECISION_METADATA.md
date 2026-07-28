# WP-05B — Chairman Decision Metadata & Traceability

**Status:** Published — WP-05B Canonical Implementation Baseline  
**Governing specification:** ENG-0007 §6.2 Decision Metadata Requirements (Approved v1.0)  
**Predecessor baseline:** WP-05A @ `9ae4974941bb253c8b7977a1fa18f63236e8cdb7`

## Purpose

Every successful Chairman publication carries a **Decision Metadata Package** sufficient for engineering audit:

- which ENG governed the decision;
- which Consensus Package was consumed;
- which implementation baseline produced it;
- when it was published;
- which execution/request lineage produced it.

This is auditability — not analytics, telemetry, or Decision Policy.

## Decision Metadata Package

| Field                                      | Role                                                                |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `decisionId`                               | Unique published decision-package identity (`decpkg:{executionId}`) |
| `decisionTimestamp`                        | ISO-8601 publish time (generated once per success)                  |
| `chairmanSpecificationVersion`             | Chairman Decision Engine contract version (`1.0`)                   |
| `governingEngineeringSpecification`        | Always `ENG-0007`                                                   |
| `governingEngineeringSpecificationVersion` | Approved ENG version (`1.0`)                                        |
| `implementationBaseline`                   | Published WP-05A commit identity                                    |
| `consensusPackageId`                       | Immutable Consensus Package identity                                |
| `consensusSchemaVersion`                   | Consensus schema version                                            |
| `executionId`                              | Council execution correlation id                                    |
| `requestId`                                | Original decision request id                                        |
| `sessionId`                                | Session correlation (execution id when available)                   |
| `traceabilityId`                           | Lineage id for path reconstruction                                  |
| `parentConsensusReference`                 | Equals `consensusPackageId`                                         |
| `executionMetadataReference`               | Reference into consensus execution metadata / config identity       |

Provider-specific fields are forbidden.

## Failure-path traceability

`ChairmanFailed` carries `failureTraceability` with:

- `failureId` / `failureTimestamp`
- `decisionAbsent: true` (no completed decision package)
- governing ENG / baseline / execution identifiers
- optional consensus linkage when a package was available

It **must not** invent a success `decisionId`.

## Lifecycle

```text
Consensus Package (ENG-0006)
        ↓
Chairman contract validation (WP-05A)
        ↓
Chairman synthesis
        ↓
buildDecisionMetadata + validateDecisionMetadata (WP-05B)
        ↓
ChairmanSuccessResult.metadata  →  CouncilResult  →  API JSON  →  Presentation lineage
```

Invalid metadata blocks success publication (`INVALID_DECISION_METADATA` → `ChairmanFailed`).

## Module map

| Path                                            | Responsibility                                            |
| ----------------------------------------------- | --------------------------------------------------------- |
| `src/lib/council/chairman-decision-metadata.ts` | Build + validate metadata / failure traceability          |
| `src/types/council.ts`                          | `DecisionMetadata`, `ChairmanFailureTraceability`         |
| `src/lib/council/chairman-runner.ts`            | Generate/validate on success; attach failure traceability |
| `src/components/chairman-card.tsx`              | Surfaces lineage (does not invent metadata)               |

## Out of scope (later WP-05 slices)

- Confidence triad (WP-05C) — see `docs/architecture/CHAIRMAN_CONFIDENCE_MODEL.md`
- Decision Policy (WP-05D)
- Recovery / richer failure taxonomy (WP-05E) — see `CHAIRMAN_FAILURE_MODEL.md`
- Conformance testing & final publication (WP-05F)
- Full conformance evidence pack (WP-05F)
