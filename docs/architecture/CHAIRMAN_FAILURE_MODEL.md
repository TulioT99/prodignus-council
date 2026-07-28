# WP-05E — Failure Model & Recovery

**Status:** Implemented — WP-05E Failure Model & Recovery Framework  
**Governing specification:** ENG-0007 §13 Failure Handling / AC-CH-04/05/11/13 (Approved v1.0)  
**Predecessor baseline:** WP-05D @ `9febe58a229722eabcc359a2e365a9be185fa2e5`

## Purpose

Introduce a deterministic **Failure Manager** that classifies execution failures, applies recovery policy, produces structured failure artifacts, and acts as the final operational gate before decision publication.

The Failure Manager does **not** alter advisor reasoning, consensus algorithms, Chairman decision semantics, confidence calculations, or policy rule outcomes. It governs operational resilience only.

## Failure Manager architecture

```text
Decision Council
        │
        ▼
Failure Manager
        │
        ├── Failure Classification
        ├── Severity Assessment
        ├── Recovery Policy
        ├── Retry Engine (bounded)
        ├── Failure Artifact (DecisionFailureReport)
        └── Publication Decision
```

Evaluator identity: `council-failure-manager`  
Schema version: `1.0`

## Failure lifecycle

```text
Request
    ↓
Context Retrieval
    ↓
Advisor Execution
    ↓
Consensus
    ↓
Chairman
    ↓
Metadata
    ↓
Confidence
    ↓
Policy Evaluation
    ↓
Failure Evaluation   ← WP-05E gate
    ↓
Publication
```

Failure evaluation is the final operational gate before publication. Terminal failures always produce a structured `DecisionFailureReport` with `publicationAllowed: false`.

## Failure taxonomy

| Category | Description                                      | Recovery                                           | Publication                                    |
| -------- | ------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| FM-001   | Infrastructure (provider, network, filesystem)   | Bounded provider retry; else structured failure    | Blocked on terminal failure                    |
| FM-002   | Advisor (timeout, invalid/malformed response)    | Isolate advisor; continue if council policy allows | Blocked for that advisor; session may continue |
| FM-003   | Consensus (insufficient inputs / cannot compute) | Structured failure — never fabricate consensus     | Blocked                                        |
| FM-004   | Chairman (invalid response, contract, reasoning) | Bounded schema recovery; else ChairmanFailed       | Blocked                                        |
| FM-005   | Metadata / traceability failure                  | Fail closed                                        | Blocked                                        |
| FM-006   | Confidence / uncertainty failure                 | Fail closed                                        | Blocked                                        |
| FM-007   | Policy engine unavailable / invalid / Rejected   | Fail closed                                        | Blocked                                        |
| FM-008   | Publication / serialization failure              | Decision not published; execution recorded failed  | Blocked                                        |

## Severity model

Severity is deterministic per category and reason code:

| Level    | Typical use                                                        |
| -------- | ------------------------------------------------------------------ |
| INFO     | Reserved (observability)                                           |
| WARNING  | Isolated advisor failure (FM-002)                                  |
| ERROR    | Recoverable-class terminal failures (FM-001/FM-004)                |
| CRITICAL | Consensus failure; policy Rejected                                 |
| FATAL    | Metadata / confidence / policy invalid; configuration; publication |

## Recovery policy

Each category defines:

- `retryable`
- `maxAttempts` (includes the initial try)
- `fallbackBehavior` (`structured_failure` | `isolate_and_continue` | `fail_closed`)
- `publicationEligible` (always `false` for terminal failure artifacts)
- `userVisibleOutcome`

Rules:

1. Recovery never fabricates missing information.
2. Infrastructure retries remain provider-bounded (`OpenRouter` + runtime retry config).
3. Chairman schema-invalid generative output uses FM-004 bounded recovery (default `maxAttempts: 2`) before `ChairmanFailed`.
4. Retry exhaustion always yields a structured failure artifact.

## DecisionFailureReport

Mandatory on every `ChairmanFailed` outcome:

| Field                                     | Meaning                                |
| ----------------------------------------- | -------------------------------------- |
| `executionId`                             | Correlation identity                   |
| `timestamp`                               | ISO-8601 failure publication time      |
| `failureCategory`                         | FM-001…FM-008                          |
| `severity`                                | Deterministic severity                 |
| `component`                               | Failed component identity              |
| `recoveryAttempted` / `recoverySucceeded` | Recovery observability                 |
| `retryCount`                              | Retry count recorded                   |
| `publicationAllowed`                      | Always `false` on terminal reports     |
| `diagnostics`                             | Safe message, actions, terminal status |
| `relatedMetadata`                         | Traceability + ENG-0007 linkage        |

## Publication behavior

| Gate input                                                              | Result                       |
| ----------------------------------------------------------------------- | ---------------------------- |
| Success candidate with required artifacts + Approved/EscalationRequired | Publication allowed          |
| Policy Rejected                                                         | Publication blocked (FM-007) |
| Missing metadata/confidence/uncertainty/policy                          | Publication blocked          |
| Failure candidate / `DecisionFailureReport`                             | Publication blocked          |
| Serialization failure                                                   | Publication blocked (FM-008) |

Consumers always receive a structured response — never null, partial JSON, malformed output, or an uncaught operational exception from the Chairman failure path.

## Interaction with prior engines

| Engine                 | Interaction                                          |
| ---------------------- | ---------------------------------------------------- |
| Contract (WP-05A)      | Failures classified; report attached                 |
| Metadata (WP-05B)      | FM-005 blocks publication                            |
| Confidence (WP-05C)    | FM-006 blocks publication                            |
| Policy (WP-05D)        | FM-007 blocks publication; policy outcomes unchanged |
| Consensus (WP-04)      | FM-003 — no fabricated consensus                     |
| Provider retry (WP-07) | FM-001 budget remains config-governed                |

## Module map

| Path                                 | Responsibility                                      |
| ------------------------------------ | --------------------------------------------------- |
| `src/lib/council/failure-manager.ts` | Taxonomy, recovery, reports, publication gate       |
| `src/types/council.ts`               | `DecisionFailureReport` and related types           |
| `src/lib/council/chairman-runner.ts` | Schema recovery + failure evaluation before publish |
| `src/lib/council/orchestrator.ts`    | Pass AbortSignal into Chairman                      |

## Out of scope

- Conformance testing & final publication (WP-05F)
- Changes to advisor/Chairman reasoning quality
- Changes to Consensus / Confidence / Policy algorithms
