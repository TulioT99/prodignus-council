---
id: WP-03-ARCHITECTURE-COMPLIANCE-REVIEW
title: WP-03 Architecture Compliance Review
subtitle: Advisor Reliability — PEOS architecture gate
version: "1.0"
status: Complete
classification: Executive Architecture Review / Architecture Compliance Review
owner: Prodignus Architecture / Engineering
created: 2026-07-27
updated: 2026-07-27
related:
  - ARR-0004
  - IMP-0001
  - IMP-0000
  - ADR-0002
  - ADR-0006
  - ADR-0007
  - ADR-0008
  - ENG-0003
  - ENG-0004
  - WP-07-ARCHITECTURE-COMPLIANCE-REVIEW
  - RUNTIME_CONFIGURATION
work_package: WP-03 Advisor Reliability
imp: IMP-0001
repository: prodignus-council
verdict: PASS WITH OBSERVATIONS
---

# Executive Architecture Review

## Document Control

| Field | Value |
|-------|-------|
| Title | WP-03 Architecture Compliance Review — Advisor Reliability |
| Repository | `prodignus-council` |
| Reviewer | PEOS Executive Architecture Review (Cursor execution agent under IMP-0000 §13) |
| Branch | `master` |
| Governing documents | IMP-0001; ARR-0004; ENG-0003; ENG-0004 (boundary); ADR-0002, ADR-0006, ADR-0007; ADR-0008 (Proposed — guidance); Runtime Configuration Architecture; WP-07 Architecture Compliance Review |
| Reviewed baseline | `51354260d2e07dfdf9536154a72967da73766259` (WP-07 Configuration Slice published) |
| Reviewed working tree | Uncommitted WP-03 Advisor Reliability implementation against that baseline |
| Review date | 2026-07-27 |
| Review status | **Complete** |
| Verdict | **PASS WITH OBSERVATIONS** |

### Working-tree context at review

| Path | State | Role |
|------|-------|------|
| `src/lib/council/execution-abort.ts` | Untracked (new) | Abort reason/helpers |
| `src/lib/council/advisor-execution-result.ts` | Untracked (new) | Result builders / error classification / confidence normalize |
| `src/lib/council/validated-advisor-opinions.ts` | Untracked (new) | Validation gate (WP-04 prep) |
| `src/lib/council/advisor-runner.ts` | Modified | Advisor lifecycle + signal |
| `src/lib/council/concurrency.ts` | Modified | Abort-aware scheduling |
| `src/lib/council/orchestrator.ts` | Modified | Overall-timeout abort + gate hook |
| `src/lib/openrouter/client.ts` | Modified | Signal, cancel vs timeout, retry skip on cancel |
| `src/lib/openrouter/types.ts` | Modified | `REQUEST_CANCELLED` |
| `tests/advisor-reliability.test.mjs` | Untracked (new) | Reliability evidence |
| `package.json` | Modified | Registers new tests |

Unchanged (verified): `src/config/*`, `src/types/council.ts`, `src/app/api/council/route.ts`, Chairman runner/prompts, advisor prompts, PKOS CRE, consensus modules (none introduced).

Out of review authority: modifying implementation/tests/docs other than this assessment; staging; commit; push; deploy; release.

---

## Executive Summary

WP-03 strengthens **advisor execution reliability** on top of the published WP-07 runtime configuration baseline. The package makes the advisor lifecycle deterministic under failure, timeout, and cancellation; consolidates internal result construction; wires AbortSignal from overall council timeout through concurrency and OpenRouter; and introduces a **structural validation gate** that prepares normalized successful opinions for future consensus **without implementing consensus**.

Architecturally:

- Request → orchestration → per-advisor execution → provider (timeout/retry/cancel) → parse → `AdvisorResult` → cleanup is coherent for the **advisor stage**.
- Retry and timeout **ownership remain in WP-07** (`getRuntimeConfig()`); WP-03 consumes, does not redesign.
- Public Council API / `CouncilResult` schema / Chairman decision path are preserved.
- WP07-AR-005 (orphan work after overall timeout) is **substantially closed for advisors**; Chairman abort coupling remains intentionally deferred (out of WP-03 scope).

**No Critical or Major findings.** Residual gaps (Chairman abort, default timeout policy ≤45s, gate not yet consumed by consensus, missing overall-timeout e2e fixture) are Observations or Minor and are not publication blockers.

**Verdict: PASS WITH OBSERVATIONS.** WP-03 is ready for PEOS-compliant publication of the implementation. Staging eligibility remains **not granted**.

---

## Review Scope

### In scope

| Area | Evidence inspected |
|------|--------------------|
| Advisor lifecycle | `advisor-runner.ts`, `advisor-execution-result.ts` |
| Orchestration / abort | `orchestrator.ts`, `concurrency.ts`, `execution-abort.ts` |
| OpenRouter reliability | `openrouter/client.ts`, `openrouter/types.ts` |
| Validation gate | `validated-advisor-opinions.ts` |
| Tests | `tests/advisor-reliability.test.mjs`; regression suite context (289 tests reported at implementation) |
| WP-07 preservation | No edits under `src/config/`; consumers still call `getRuntimeConfig()` |
| Scope boundaries | Diff vs `51354260…`; unchanged Chairman/API/types/prompts/PKOS |

### Out of scope

WP-04 consensus; WP-05 Chairman redesign; WP-07 observability slice; WP-08 Staging; fixing findings; rewriting IMP/ADR/ENG.

---

## Architecture Assessment

### Execution Lifecycle

Mapped path under review:

```text
POST /api/council
  → validate request
  → runCouncil(decision)
      → [optional] overall timeout race + session AbortController
      → runCouncilSession
          → DecisionContext + PKOS retrieve + integrity
          → mapWithConcurrency(advisorOrder, maxConcurrency, signal)
              → runAdvisor (init → prompts → callOpenRouter → parse → AdvisorResult)
          → resolveSettled (unexpected rejection → failed AdvisorResult)
          → selectValidatedAdvisorOpinions (side-effect-free prep / optional trace)
          → abort check
          → runChairman(decisionContext, advisorResults)   // unchanged contract
          → determineCouncilSessionStatus
          → CouncilResult
```

| Criterion | Assessment |
|-----------|------------|
| Deterministic stage order | **PASS** — PKOS → advisors → gate hook → Chairman → status |
| Failure isolation | **PASS** — provider/parse/cancel → failed `AdvisorResult`; unexpected rejection still mapped |
| Cleanup | **PASS** — OpenRouter `finally` clears deadline + combined signal listeners; overall timeout clears timer and aborts session |
| Architectural gaps (advisor stage) | **None material** |
| Residual gap | Chairman stage does not consume session signal (see Observations) |

### Cancellation Architecture

| Criterion | Assessment |
|-----------|------------|
| Propagation | **PASS (advisor path)** — `runCouncil` aborts `ABORT_REASON_CANCELLED` → concurrency stops new work → `runAdvisor` / `callOpenRouter` receive signal → fetch aborts |
| Orphan prevention | **PASS for advisors** when overall timeout enabled; closes WP07-AR-005 for this stage |
| Cancel vs timeout | **PASS** — distinct abort reasons; `REQUEST_CANCELLED` never retried |
| Boundaries | **PASS WITH OBSERVATION** — well-defined for provider/advisor/orchestrator; Chairman not in the abort graph |
| Default behavior | Overall timeout remains disabled (`0`) — cancel path is opt-in via WP-07 config |

### Retry Architecture

| Criterion | Assessment |
|-----------|------------|
| Ownership | **PASS** — `getRuntimeConfig().retry` via `shouldRetryAttempt` / `getRetryDelayMs` / `maxAttempts` |
| Classification | **PASS** — provider failures still use `RetryFailureCategory`; cancel uses `permanent` + hard skip on `REQUEST_CANCELLED` |
| Policy redesign | **PASS** — no new hardcoded retry budget; no eligibility redesign beyond non-retryable cancel |
| WP-07 governance | **PASS** — retry remains exclusively runtime-config governed |

### Timeout Architecture

| Layer | Owner | Assessment |
|-------|-------|------------|
| Per-advisor / provider request | `timeouts.advisorTimeoutMs` via `resolveOpenRouterTimeoutMs()` + deadline controller | **PASS** — timeout → `PROVIDER_TIMEOUT` → failed `AdvisorResult` |
| Chairman request | `timeouts.chairmanTimeoutMs` (unchanged path) | **PASS** — not redesigned |
| Overall council | `timeouts.overallCouncilTimeoutMs` + abort | **PASS** — race reject preserved; abort added |
| Distinct orchestration vs HTTP timeout | Collapsed into one provider deadline per advisor | **OBSERVATION** — functionally satisfies timeout→failed result; not a second nested orchestration timer |

Timeout ownership is coherent: **config owns values; OpenRouter owns per-request deadline; orchestrator owns session wall-clock.**

### Advisor Result Model

| Criterion | Assessment |
|-----------|------------|
| Consistency | **PASS** — shared builders in `advisor-execution-result.ts` |
| Duration on failure | **PASS** — wall-clock `durationMs` recorded (was always `0`) |
| Error reporting | **PASS** — classified stages (`init`/`provider`/`parse`/`cancelled`/`unexpected`) + safe messages |
| Public API | **PASS** — `AdvisorResult` / `CouncilResult` shapes unchanged |
| Duplication | **PASS** — advisors consolidated; Chairman builders remain separate (correct scope boundary) |

### Validation Gate Assessment

`selectValidatedAdvisorOpinions`:

| Check | Result |
|-------|--------|
| Structural / status filter only | **Yes** — includes `status === "success"` only (post-parse) |
| Normalized confidence | **Yes** — unit-interval re-clamp; defensive 0–100 legacy path |
| Ranking / weighting / voting | **None** |
| Consensus policy / conflict resolution | **None** |
| Chairman behavior change | **None** — Chairman still receives full `AdvisorResult[]` |
| Public schema change | **None** — gate output not attached to `CouncilResult` |
| Scope | **Inside WP-03** as GAP-16 *preparation*; does **not** implement WP-04 consensus |

Orchestrator invokes the gate and may log count under `enableDetailedTraces`; the opinion array is not consumed by decision logic. This is architecturally correct for a reliability WP and avoids premature consensus coupling.

### WP-07 Preservation

| Criterion | Assessment |
|-----------|------------|
| Runtime config ownership | **PASS** — `src/config/` unmodified |
| Centralized retry | **PASS** |
| Centralized timeouts | **PASS** |
| Singleton runtime | **PASS** |
| Fail-fast validation | **PASS** — unchanged load/validate/freeze path |
| No hardcoded new reliability knobs | **PASS** — WP-03 uses existing knobs + abort plumbing |

### Scope Compliance

| Forbidden / out-of-scope item | Present? |
|-------------------------------|----------|
| Consensus engine | **No** |
| Chairman redesign | **No** |
| Advisor prompt redesign | **No** |
| Deployment / release tooling | **No** |
| Observability platform | **No** (console logs only; optional feature-flag gate) |
| Runtime configuration redesign | **No** |
| Public API changes | **No** |

**ARR-0004 / IMP-0001:** WP-03 executes **after** WP-07 config slice as required; advances advisor hardening (GAP-05/06/16/25 themes) without absorbing WP-04/05/08. **Compliant.**

---

## Findings

### Critical

None.

### Major

None.

### Minor

#### WP03-AR-001

| Field | Content |
|-------|---------|
| ID | WP03-AR-001 |
| Severity | Minor |
| Area | Tests |
| Evidence | `tests/advisor-reliability.test.mjs` covers unit/integration cancel, timeout, concurrency abort, validation selection; no `runCouncil` fixture asserting overall-timeout abort → in-flight fetch abort end-to-end |
| Finding | Overall-timeout abort coupling is evidenced indirectly (orchestrator + OpenRouter + concurrency tests), not as one orchestrator soak fixture |
| Impact | Slightly weaker regression signal for WP07-AR-005 closure |
| Recommendation | Add orchestrator-level overall-timeout abort test in WP-08 resilience pack or a follow-up fixture |
| Blocking | No |

#### WP03-AR-002

| Field | Content |
|-------|---------|
| ID | WP03-AR-002 |
| Severity | Minor |
| Area | Documentation |
| Evidence | Working tree contains implementation + this ACR; no `WP-03-IMPLEMENTATION-REPORT.md` in `docs/assessments/` (implementation report delivered in chat only) |
| Finding | PEOS evidence pack for WP-03 lacks a published implementation-report artifact comparable to WP-02 |
| Impact | Traceability gap for auditors; not an architecture defect |
| Recommendation | Capture implementation report as a docs artifact in the publication commit set (optional but preferred) |
| Blocking | No |

### Observations

#### WP03-AR-003

| Field | Content |
|-------|---------|
| ID | WP03-AR-003 |
| Severity | Observation |
| Area | Cancellation / Chairman |
| Evidence | `orchestrator.ts` passes signal to advisors only; `runChairman` has no `signal` parameter; overall timeout can fire during Chairman after advisors complete |
| Finding | Abort graph does not cover Chairman provider work |
| Impact | If operators enable `COUNCIL_OVERALL_TIMEOUT_MS`, Chairman fetch may continue briefly after session reject |
| Recommendation | Wire AbortSignal into Chairman in WP-05; keep out of WP-03 |
| Blocking | No |

#### WP03-AR-004

| Field | Content |
|-------|---------|
| ID | WP03-AR-004 |
| Severity | Observation |
| Area | Timeout policy (GAP-05 default) |
| Evidence | `DEFAULT_RUNTIME_CONFIG.timeouts.advisorTimeoutMs = 90000`; Stage B success text cites ≤45s default |
| Finding | Configurable timeout→failed result is implemented; **default** remains WP-07 behavior-preserving 90s |
| Impact | NFR-LAT-02 default not met until operators override or WP-08 sets Staging defaults |
| Recommendation | Treat ≤45s as ops/WP-08 default decision; do not hardcode in WP-03 |
| Blocking | No |

#### WP03-AR-005

| Field | Content |
|-------|---------|
| ID | WP03-AR-005 |
| Severity | Observation |
| Area | Validation gate wiring |
| Evidence | `selectValidatedAdvisorOpinions` result used only for optional detailed-trace logging; Chairman consumes raw `advisorResults` |
| Finding | GAP-16 closed as **prepared input surface**, not yet as consensus consumer wiring |
| Impact | Correct for WP-03; WP-04 must consume the gate |
| Recommendation | WP-04 must take `ValidatedAdvisorOpinion[]` (or equivalent) as consensus input |
| Blocking | No |

#### WP03-AR-006

| Field | Content |
|-------|---------|
| ID | WP03-AR-006 |
| Severity | Observation |
| Area | Timeout layering |
| Evidence | Per-advisor reliability uses OpenRouter request deadline equal to `advisorTimeoutMs`; no separate outer `Promise.race` around `runAdvisor` |
| Finding | Stage B language of “orchestration timeout distinct from HTTP timeout” is realized as a single per-request deadline with abort reasons, not two nested timers |
| Impact | Equivalent reliability outcome for advisors; simpler ownership |
| Recommendation | Accept as intentional architecture; document in RUNTIME_CONFIGURATION operator notes if needed |
| Blocking | No |

#### WP03-AR-007

| Field | Content |
|-------|---------|
| ID | WP03-AR-007 |
| Severity | Observation |
| Area | Logging |
| Evidence | `logAdvisorExecution` now returns early when `features.enableStructuredLogging` is false (default `true`) |
| Finding | Mild new coupling of advisor logs to WP-07 feature flag |
| Impact | None at default; operators disabling structured logging lose advisor JSON lines |
| Recommendation | Accept; observability slice owns richer events later |
| Blocking | No |

---

## Production Readiness Assessment

| Area | Rating | Notes |
|------|--------|-------|
| Advisor Reliability | **Ready** | Isolated failures; classified errors; duration; cancel/timeout paths tested |
| Cancellation | **Ready** (advisor stage) / **Developing** (full session) | Advisors + provider abort coherent; Chairman gap deferred |
| Retry | **Ready** | WP-07 governed; cancel hard-stops retries |
| Timeout | **Ready** | Config-driven advisor/overall timeouts; default policy values unchanged |
| Execution Lifecycle | **Ready** | Deterministic advisor lifecycle with cleanup |
| Maintainability | **Ready** | Shared abort/result helpers; clear ownership |
| Test Coverage | **Ready** | New reliability suite + prior suite green; Minor gap on overall-timeout e2e |
| Documentation | **Developing** | ACR present; implementation-report artifact optional gap |

Deployment readiness: **not assessed** (per charter).

---

## Recommendation

**Publish immediately.**

Justification:

1. Objectives of WP-03 Advisor Reliability are met for the advisor execution boundary.
2. ARR-0004 sequencing (config before hardening) and IMP-0001 scope boundaries are respected.
3. WP-07 runtime configuration architecture is preserved.
4. No Critical/Major defects; Minors/Observations are non-blocking and assigned to later WPs or publication hygiene.
5. Validation evidence (lint/typecheck/build/tests) was reported green at implementation; architecture review finds no contradiction in code structure.

Staging / Production authorization remains **out of scope** until WP-08.

---

## Final Verdict

```text
PASS WITH OBSERVATIONS
```

Architectural evidence: abort-propagating advisor lifecycle on WP-07 config; consistent internal result model without public API change; validation gate without consensus policy; residual Observations do not undermine publication readiness.
