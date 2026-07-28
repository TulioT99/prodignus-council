# WP-04 — Consensus Engine Implementation Notes

**Status:** Published — WP-04 Canonical Implementation Baseline  
**Governing specification:** ENG-0006 — Consensus Engine Engineering Specification (Approved v1.0 in `hercules-knowledge`)  
**Predecessor baseline:** WP-03 @ `d76ee128d3f5d925b99b9f7b32c786fcf2cae7ef`  
**Architecture review:** PASS WITH OBSERVATIONS (no Critical / Major findings)

## Pipeline position

```text
Request → PKOS → Advisor Execution → Validated Opinions → Consensus Engine → Chairman → Decision
```

The Consensus Engine is a deterministic, non-generative stage. It does not call OpenRouter, Anthropic, OpenAI, or any LLM.

## Module layout

| Path                                       | Responsibility                                          |
| ------------------------------------------ | ------------------------------------------------------- |
| `src/lib/council/consensus/types.ts`       | Consensus package contracts                             |
| `src/lib/council/consensus/eligibility.ts` | Eligibility partition + exclusion classification        |
| `src/lib/council/consensus/analysis.ts`    | Agreement / disagreement / minority structural analysis |
| `src/lib/council/consensus/confidence.ts`  | Evidence coverage + consensus confidence                |
| `src/lib/council/consensus/engine.ts`      | Lifecycle orchestration + package publication           |
| `src/lib/council/consensus/logging.ts`     | Structured stage logging                                |
| `src/lib/council/consensus/index.ts`       | Public exports                                          |

## Implementation choices where ENG-0006 left flexibility

ENG-0006 explicitly does **not** prescribe scoring algorithms, vote weights, or numeric aggregation formulas. WP-04 chose:

### 1. Recommendation-stance structural comparison

Comparable dimension for Sprint-bound WP-04:

- Exact `CouncilDecision` clustering
- Polarity families:
  - **advance:** `proceed`, `proceed_with_conditions`, `test_first`
  - **halt:** `do_not_proceed`
  - **defer:** `insufficient_information`

| Concept                     | Rule                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Full agreement              | Single recommendation cluster with ≥2 eligible advisors (not `insufficient_information`)                                      |
| Complementary               | Full agreement plus distinct rationale-token facets across advisors                                                           |
| Partial agreement           | Multiple advance-family recommendations without halt conflict                                                                 |
| Conflicting recommendations | Advance-family and halt present together                                                                                      |
| Contradictory evidence      | Recommendation conflict **and** shared exact normalized support tokens (risks/assumptions/keyArguments) across opposing camps |
| Insufficient evidence       | Zero/below-minimum eligible opinions, single advisor, or uniform `insufficient_information`                                   |

Rationale tokens are compared as trimmed, lowercased, whitespace-normalized exact strings — no embeddings, no generative rewrite.

### 2. Confidence method `wp04_structural_product_v1`

```text
overall = mean(advisorConfidence)
        × participationFactor
        × agreementFactor
        × conflictPenalty
        × evidenceFactor
```

Additional explicit reductions:

- below configured minimum eligible → ×0.5
- single eligible advisor → ×0.5

Advisor confidence remains visible on each participant and is never overwritten.

### 3. Minimum participation

Uses existing runtime config `chairman.minimumSuccessfulAdvisors` (WP-07) as the consensus minimum-eligible threshold. No new hardcoded policy knobs.

### 4. Chairman integration (WP-05A contract)

- Orchestrator always publishes a consensus package before Chairman invocation.
- `ChairmanContextBuildInput.consensus` and `RunChairmanOptions.consensus` are **mandatory**.
- Contract validation rejects missing/invalid packages before any LLM invocation (`ChairmanFailed`).
- Package fills `collectiveIntelligence` (closes empty-stub GAP-21).
- Chairman prompt includes an explicit **CONSENSUS PACKAGE** boundary.
- Chairman remains the sole executive recommendation authority.

## Observability

Structured logs under `[Council Consensus]` (gated by `enableStructuredLogging`):

- `consensus_start`
- `eligibility_results`
- `agreement_analysis`
- `disagreement_detection`
- `confidence_calculation`
- `degraded_consensus`
- `consensus_completion`

Prompts and sensitive content are not logged.

## Out of scope (intentional)

- Full ENG-0003 Decision Analysis Layer productization
- Generative arbitration
- PKOS retrieval changes
- Chairman retry/reason-taxonomy redesign (WP-05)
- Metrics backends (WP-07 observability slice)

## Baseline succession

| Milestone                    | Commit                                                   | Role                                                   |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| WP-07 Configuration Slice    | `e0d9424` (feat) / published evidence later              | Config baseline before hardening                       |
| WP-03 Advisor Reliability    | `d76ee128d3f5d925b99b9f7b32c786fcf2cae7ef`               | Validated opinion gate                                 |
| **WP-04 Consensus Engine**   | `3146af80bf1455f6adede8ba6979bd11bf20818a`               | **Consensus Engine canonical baseline**                |
| **WP-05A Chairman Contract** | See `docs/assessments/WP-05A-IMPLEMENTATION-BASELINE.md` | **Current Chairman Decision Engine contract baseline** |

Subsequent WP-05 slices must start from the published WP-05A baseline. Consensus Engine changes remain governed by ENG-0006 / WP-04.
