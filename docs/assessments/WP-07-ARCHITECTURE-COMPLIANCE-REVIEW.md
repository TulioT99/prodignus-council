---
id: WP-07-ARCHITECTURE-COMPLIANCE-REVIEW
title: WP-07 Architecture Compliance Review
subtitle: Configuration Slice — PEOS architecture gate
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
  - WP-02-ARCHITECTURE-COMPLIANCE-REVIEW
  - RUNTIME_CONFIGURATION
work_package: WP-07 Configuration Slice
imp: IMP-0001
repository: prodignus-council
verdict: PASS WITH OBSERVATIONS
---

# Executive Architecture Review

## Document Control

| Field | Value |
|-------|-------|
| Title | WP-07 Architecture Compliance Review — Configuration Slice |
| Repository | `prodignus-council` |
| Branch | `master` |
| Base / HEAD commit | `d5286ad4c46beae2231fc266f02f47810987cbbe` (ARR-0004 published) |
| Reviewed revision | **Uncommitted working tree** implementing WP-07 Configuration Slice + `docs/architecture/RUNTIME_CONFIGURATION.md` |
| Review date | 2026-07-27 |
| Reviewer | PEOS Executive Architecture Review (Cursor execution agent under IMP-0000 §13) |
| Governing documents | IMP-0001; ARR-0004; ENG-0003; ENG-0004 (boundary); ADR-0002, ADR-0006, ADR-0007; ADR-0008 (Proposed — guidance); WP-02 Architecture Compliance Review (AR-001…003) |
| Review status | **Complete** |
| Verdict | **PASS WITH OBSERVATIONS** |

### Working-tree context at review

Implementation and documentation for the Configuration Slice exist as local modifications and untracked files against `d5286ad`. This review evaluates that working tree as the candidate publication artifact. No implementation commits were present at review time.

Out of review authority: modifying source, tests, or documentation other than this assessment; staging; commit; push; deploy; release.

---

## Executive Summary

WP-07 Configuration Slice introduces a typed, centralized, immutable runtime configuration layer (`src/config/`) and rewires operational consumers (retry, OpenRouter, orchestrator, advisors, chairman) to read `getRuntimeConfig()` instead of unmarked operational literals.

The slice:

- satisfies ARR-0004’s instruction to execute **configuration before** WP-03;
- advances IMP-0001 **NFR-CFG-01** for the configuration half of WP-07 without implementing observability;
- preserves pre–WP-07 runtime defaults (behavior-preserving externalization);
- documents the architecture in `docs/architecture/RUNTIME_CONFIGURATION.md`;
- fully closes **WP02-AR-003**; partially closes **WP02-AR-001** and **WP02-AR-002** in a manner consistent with “configuration only / no retry redesign.”

**No Critical or Major findings.** Residual dual constants, inert feature-flag surfaces, and lazy first-access load timing are Observations or Minor, not publication blockers.

**Verdict: PASS WITH OBSERVATIONS.** The Configuration Slice is architecturally sound and ready for publication after PEOS-compliant implementation (and related docs) commits. Staging eligibility remains **not granted**.

---

## Review Scope

### In scope

| Area | Evidence |
|------|----------|
| Governance | IMP-0001 §8.8 / NFR-CFG-01 / WP-07 objective; ARR-0004 config-before-hardening sequence |
| Config layer | All of `src/config/` |
| Consumers | Retry policy; OpenRouter client/types; orchestrator; concurrency helper; advisor/chairman execution & policy/prompt/status/terminal paths |
| Docs | `docs/architecture/RUNTIME_CONFIGURATION.md`; `.env.example` commentary; `docs/README.md` index entry |
| Tests | `tests/runtime-config.test.mjs`; modified retry/OpenRouter/advisor-runner tests |
| WP-02 leftovers | WP02-AR-001, AR-002, AR-003 |

### Out of scope

WP-07 Observability Slice; WP-03…WP-06/WP-08 product work; Staging/Production deploy; fixing findings; rewriting IMP/ADR/ENG.

---

## Architecture Assessment

### Runtime Configuration

| Criterion | Assessment |
|-----------|------------|
| Centralized | **PASS** — single typed model `RuntimeCouncilConfig`; load path `env → load → validate → freeze → runtime singleton` |
| Ownership clear | **PASS** — operational knobs in runtime config; secrets/model IDs in `.env`; metadata in `council.ts`; documented in RUNTIME_CONFIGURATION.md |
| Deterministic | **PASS** — same env ⇒ same frozen config for process lifetime |
| Startup lifecycle | **PASS WITH OBSERVATION** — appropriate parse/validate/freeze/singleton; load is **lazy** on first `getRuntimeConfig()` (see WP07-AR-004) |
| Singleton | **PASS** — `runtime.ts` caches once; test reset helpers only |
| Immutable | **PASS** — nested `Object.freeze` in `load.ts` |
| Fail-fast validation | **PASS** — invalid numbers/booleans/IDs/thresholds throw `RuntimeConfigError`; no silent coercion of invalid values |

Architecture diagram and hierarchy in `RUNTIME_CONFIGURATION.md` match the inspected modules.

### Separation of Concerns

| Boundary | Assessment |
|----------|------------|
| Business logic vs config | **PASS** — prompts, parsers, consensus semantics unchanged; knobs externalized |
| Retry does not own config | **PASS** — `policy.ts` reads `getRuntimeConfig().retry`; eligibility/delay are policy functions over config |
| OpenRouter does not own config | **PASS** — URL, temperature, timeouts, maxAttempts, referer sourced from runtime; adapter still owns HTTP translation |
| Orchestration does not own config | **PASS** — order, concurrency, chairman enable, overall timeout from runtime |
| Chairman does not own config | **PASS** — thresholds via getters; temperature/timeout from runtime |

No evidence of config tables embedded inside business algorithms.

### Configuration Quality

| Dimension | Assessment |
|-----------|------------|
| Typing | **PASS** — section types in `types.ts` |
| Maintainability | **PASS** — clear module split (`defaults` / `env` / `load` / `runtime`) |
| Discoverability | **PASS** — architecture doc + `.env.example` + `docs/README` index |
| Extensibility | **PASS** — new knobs fit typed sections; env parsers reusable |
| Readability | **PASS** |
| Duplication | **PASS WITH OBSERVATION** — residual aliases (`CHAIRMAN_*` constants, static `ADVISOR_EXECUTION_*`, `DEFAULT_RETRY_POLICY`, deprecated `councilConfig` fields). Runtime paths use getters/config; aliases are documentation/compat risk (WP07-AR-001) |
| Defaults | **PASS** — explicitly behavior-preserving vs pre–WP-07 |
| Environment overrides | **PASS** — `COUNCIL_*` / OpenRouter tuning vars; legacy `OPENROUTER_REQUEST_TIMEOUT_MS` fallback documented |

### Architecture Alignment

| Control | Result |
|---------|--------|
| ARR-0004 | **PASS** — config slice executed as next critical-path package; obs slice deferred; IMP IDs unchanged |
| IMP-0001 NFR-CFG-01 | **PASS** (slice) — timeouts, retries, participation, model mapping are configuration-driven; full IMP WP-07 also requires observability (deferred by ARR-0004 split) |
| IMP-0001 NFR-RES-01 | **PARTIAL by design** — attempt budget and backoff formula configurable; default backoff remains `baseDelayMs = 0` to preserve behavior (see AR-002 closure) |
| ENG-0003 | **PASS** — configuration resolution surface aligns with recovery/config expectations; no Recovery Manager redesign |
| ENG-0004 | **PASS** — no PKOS contract change; PKOS path vars unchanged |
| ADR-0002 | **PASS** — provider replaceability unchanged; OpenRouter remains adapter |
| ADR-0006 | **PASS** — no consensus engine; no false baseline certification |
| ADR-0007 | **PASS** — evidence-before-reasoning boundary untouched |
| ADR-0008 | **PASS** — presentation model untouched |

### WP-02 Observation Closure

| ID | WP-02 intent | WP-07 outcome | Status |
|----|--------------|---------------|--------|
| **WP02-AR-001** | Refine eligibility (`invalid_response` broader than IMP §8.5) | Categories are env-configurable (`COUNCIL_RETRY_CATEGORIES`); **default still includes `invalid_response`** to preserve behavior; no eligibility redesign | **Partially addressed** |
| **WP02-AR-002** | Externalize backoff; ARR-0004 preferred non-zero defaults | Backoff formula + knobs externalized; **default `baseDelayMs = 0` retained** (Configuration Slice “behavior-preserving”); operators may set non-zero via env | **Partially addressed** |
| **WP02-AR-003** | Preserve `rate_limited` through delay path | `OpenRouterClientError.failureCategory` persisted; `classifyOpenRouterError` returns stored category; tests assert fidelity | **Fully addressed** |

Partial closures for AR-001/AR-002 are consistent with authorized WP-07 Configuration Slice scope (“No retry logic redesign. Configuration only.” / “Current defaults must remain unchanged”). Remaining default-policy hardening is a future operational choice, not a Configuration Slice defect.

---

## Findings

### Critical

None.

### Major

None.

### Minor

#### WP07-AR-001

| Field | Content |
|-------|---------|
| ID | WP07-AR-001 |
| Severity | Minor |
| Area | Duplication / discoverability |
| Evidence | `chairman-policy.ts` still exports `CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS = 3` and `CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD = 4` beside getters; `advisor-execution-config.ts` retains static `ADVISOR_EXECUTION_CONFIG` / `ADVISOR_EXECUTION_ORDER`; `policy.ts` retains `DEFAULT_RETRY_POLICY`; `council.ts` retains deprecated operational mirrors |
| Finding | Residual literals/aliases can confuse future editors about the single source of truth |
| Impact | Low while call sites use getters/`getRuntimeConfig()`; risk of drift if someone imports aliases for new logic |
| Recommendation | Prefer deprecating or deriving aliases from `DEFAULT_RUNTIME_CONFIG` in a small cleanup commit; do not block publication |
| Blocking | No |

### Post-review disposition (publication)

**WP07-AR-001** was resolved before publication as a non-behavioral cleanup: legacy aliases (`CHAIRMAN_*`, `ADVISOR_EXECUTION_*`, `DEFAULT_RETRY_POLICY`, deprecated `councilConfig` operational mirrors) are now **derived from `DEFAULT_RUNTIME_CONFIG`** so duplicated literal values cannot drift. Runtime paths continue to use `getRuntimeConfig()` / getters. No retry, timeout, or orchestration semantics changed.

---

### Observations

#### WP07-AR-002

| Field | Content |
|-------|---------|
| ID | WP07-AR-002 |
| Severity | Observation |
| Area | Feature flags |
| Evidence | `features.enableStructuredLogging`, `enableDetailedTraces`, `enableRetryMetrics` loaded in `load.ts` but not consumed by runtime paths; only `enableProviderDiagnostics` gates OpenRouter diagnostic logging |
| Finding | Typed flags exist as forward surface; most are inert until Observability Slice |
| Impact | None on current behavior; operators flipping unused flags see no effect |
| Recommendation | Wire during WP-07 Observability Slice; document inertness already noted in architecture doc |
| Blocking | No |
| Target | WP-07 Observability Slice |

#### WP07-AR-003

| Field | Content |
|-------|---------|
| ID | WP07-AR-003 |
| Severity | Observation |
| Area | Chairman config |
| Evidence | `chairman.allowInventedAdvisorContent` is loaded/validated; no consumer reads it |
| Finding | Reserved fallback flag as designed; not a behavior switch today |
| Impact | None |
| Recommendation | Keep reserved until a deliberate degradation design exists; do not imply product capability |
| Blocking | No |

#### WP07-AR-004

| Field | Content |
|-------|---------|
| ID | WP07-AR-004 |
| Severity | Observation |
| Area | Lifecycle |
| Evidence | `getRuntimeConfig()` loads on first access, not at process boot |
| Finding | Fail-fast occurs at first config use, which in Next.js may be first request rather than server boot |
| Impact | Misconfiguration surfaces as first-session failure rather than boot failure |
| Recommendation | Optional eager load at server entry in a later hardening pass; not required for slice acceptance |
| Blocking | No |

#### WP07-AR-005

| Field | Content |
|-------|---------|
| ID | WP07-AR-005 |
| Severity | Observation |
| Area | Timeouts |
| Evidence | `orchestrator.ts` `Promise.race` on `overallCouncilTimeoutMs > 0`; default is `0` (disabled) |
| Finding | When enabled, race rejects without aborting in-flight advisor/provider work |
| Impact | None at default; if operators enable overall timeout, work may continue after rejection |
| Recommendation | Document operator caveat; consider AbortSignal coupling in a later reliability WP |
| Blocking | No |

#### WP07-AR-006

| Field | Content |
|-------|---------|
| ID | WP07-AR-006 |
| Severity | Observation |
| Area | WP-02 / NFR-RES-01 |
| Evidence | Defaults: `baseDelayMs = 0`; retryable categories still include `invalid_response` |
| Finding | ARR-0004 language favored non-zero backoff and eligibility refine; Configuration Slice correctly prioritized behavior preservation and env-driven policy |
| Impact | Operators can enable backoff and narrow categories without code changes; defaults retain prior cost/latency profile |
| Recommendation | Decide production defaults under WP-08 / ops policy; optional non-zero staging defaults |
| Blocking | No |

#### WP07-AR-007

| Field | Content |
|-------|---------|
| ID | WP07-AR-007 |
| Severity | Observation |
| Area | Documentation drift |
| Evidence | Root `README.md` still describes configuration primarily via `src/config/council.ts` and defers backoff externalization |
| Finding | Project README lags RUNTIME_CONFIGURATION.md |
| Impact | Onboarding confusion |
| Recommendation | Update README pointers in a docs follow-up (not required to accept architecture) |
| Blocking | No |

---

## Production Readiness Assessment

| Area | Rating | Notes |
|------|--------|-------|
| Configuration | **Ready** | Centralized typed surface; env overrides; documented |
| Validation | **Ready** | Fail-fast on invalid env; tests cover defaults/overrides/errors |
| Reliability | **Developing** | Config enables reliability tuning; default backoff still zero; overall timeout abort incomplete when enabled |
| Maintainability | **Ready** | Clear ownership; residual aliases are Minor |
| Extensibility | **Ready** | New knobs fit sections; flags reserved for obs |
| Documentation | **Ready** | Architecture doc complete; minor root README drift |

Ratings intentionally stop short of **Production Ready**: IMP-0001 Staging gate remains WP-08; observability half of WP-07 incomplete by ARR-0004 design.

---

## Scope Compliance

**WP-07 Configuration Slice remained inside approved scope.**

| Prohibited / deferred item | Present? |
|----------------------------|----------|
| Observability implementation (metrics/dashboards/streaming) | **No** |
| Consensus engine | **No** |
| Advisor reliability redesign | **No** |
| Chairman redesign | **No** |
| Deployment / infra changes | **No** |
| Runtime reload / dynamic remote config | **No** |
| Feature creep beyond knobs + wiring + docs | **No** (concurrency helper preserves prior all-parallel default of 5) |

ARR-0004 sequencing (config before WP-03; observability later) is respected. IMP-0001 work-package ID WP-07 is not rewritten; only the approved slice is claimed.

---

## Recommendation

**Publish after minor corrections** — specifically: create PEOS-traceable **implementation** commit(s) for the Configuration Slice (and the already-authored architecture documentation), then publish. No architecture rework is required before publication.

Do **not** treat residual Observations as blockers. Do **not** authorize Staging from this gate.

Rationale: architecture goals for the Configuration Slice are met; remaining items are either intentional deferrals (observability, default backoff policy) or low-risk cleanup.

---

## Final Verdict

```text
PASS WITH OBSERVATIONS
```

Supported by: centralized immutable config; consumer separation of concerns; documented hierarchy/lifecycle; validation fail-fast; full AR-003 closure; partial AR-001/AR-002 closure consistent with authorized “configuration only” scope; no Critical/Major findings; scope control confirmed against ARR-0004 / IMP-0001.

---

## Evidence appendix

### Modules reviewed

`src/config/{types,defaults,env,load,runtime,index,council}.ts`  
`src/lib/retry/policy.ts`  
`src/lib/openrouter/{client,types}.ts`  
`src/lib/council/{orchestrator,concurrency,advisor-execution-config,advisor-runner,chairman-execution-config,chairman-policy,chairman-prompt,chairman-runner,council-status,terminal-outcome}.ts`  
`docs/architecture/RUNTIME_CONFIGURATION.md`  
`tests/runtime-config.test.mjs` (+ modified retry/OpenRouter/advisor-runner tests)

### Technical debt register (evidence-backed)

| Class | Item |
|-------|------|
| Critical | None |
| Major | None |
| Minor | Residual config aliases / dual constants (WP07-AR-001) |
| Future | Wire feature flags & metrics (obs slice); production backoff/eligibility defaults; eager config load; overall-timeout abort; README sync |

---

*WP-07 Architecture Compliance Review — `prodignus-council` under IMP-0001 / ARR-0004 — Verdict: PASS WITH OBSERVATIONS*
