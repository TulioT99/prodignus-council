---
id: WP-02-IMPLEMENTATION-REPORT
title: WP-02 Implementation Report
subtitle: Error Model & OpenRouter Reliability — implementation evidence
version: "1.0"
status: Complete — local commits created; Architecture Compliance Review pending
classification: Engineering Implementation Report
owner: Prodignus Engineering
created: 2026-07-27
updated: 2026-07-27
related:
  - WP-02-SCOPE-VERIFICATION
  - WP-01-STAGE-B
  - IMP-0001
  - IMP-0000
work_package: WP-02
imp: IMP-0001
repository: prodignus-council
---

# WP-02 Implementation Report

## A. Canonical identity

| Field | Value |
|-------|-------|
| Work package | **WP-02 — Error Model & OpenRouter Reliability** |
| Governing IMP | [IMP-0001](https://github.com/TulioT99/hercules-knowledge/blob/main/engineering/implementation/IMP-0001-decision-council-production-readiness.md) (Approved) |
| Governing standard | IMP-0000 §11 Engineering Execution Rules + §11.7 Commit Traceability |
| Scope verification | [WP-02-SCOPE-VERIFICATION.md](./WP-02-SCOPE-VERIFICATION.md) |
| Gap source | [WP-01-STAGE-B-GAP-ANALYSIS.md](./WP-01-STAGE-B-GAP-ANALYSIS.md) |
| Repository | `prodignus-council` |
| Branch | `master` |
| Implementation date | 2026-07-27 |

### Approved scope

Mandatory: **GAP-04** (WP-02 slice), **GAP-09** (WP-02 slice), **GAP-10**, **GAP-11**, **GAP-23** (verify).

### Explicit exclusions

GAP-01…03, 05…08, 12…22, 24…25; **GAP-26 deferred** (alternate-model fallback); full WP-07 config externalization; full WP-05 Chairman reason taxonomy.

---

## B. Baseline

| Check | Before implementation | Notes |
|-------|----------------------|-------|
| `npm run lint` | PASS (exit 0) | Pre-existing npm `devdir` notice only |
| `npm run typecheck` | PASS (exit 0) | — |
| `npm run test` | PASS — **254** pass / 0 fail | MODULE_TYPELESS_PACKAGE_JSON warnings (pre-existing) |
| `npm run build` | PASS (exit 0) | Next.js 16.2.10 |

No baseline failures. No WP-02 blockers.

---

## C. Gap resolution

| Gap | Change | Files | Tests | Acceptance result | Status |
|-----|--------|-------|-------|-------------------|--------|
| GAP-04 | Centralized provider-neutral retry policy (`maxAttempts=3`); OpenRouter adapter consumes eligibility + fail-closed exhaustion; no alternate-model fallback | `src/lib/retry/*`; `src/lib/openrouter/client.ts` | `tests/retry-policy.test.mjs`; `tests/openrouter-retry-sanitization.test.mjs`; existing retry test retained | Retry eligibility tests green; WP-07 config deferred | **Implemented** |
| GAP-09 | Minimal terminal reason-code taxonomy + derivation | `src/types/council.ts`; `src/lib/council/terminal-outcome.ts`; API route | `tests/council-terminal-outcome.test.mjs` | Reason codes on terminal outcomes; WP-05 taxonomy deferred | **Implemented** |
| GAP-10 | Additive `sessionStatus` / `sessionSeverity` / `terminalReasonCode` on `CouncilApiSuccess`; `ok` remains transport success | route + types + client comment | terminal + client tests | Operators need not infer failure from HTTP alone | **Implemented** |
| GAP-11 | README documents bounded retries, fail-closed, no alternate-model fallback; removes false “no retries” claim | `README.md` | Doc review vs policy | README matches behavior | **Implemented** |
| GAP-23 | Domain/API types and retry policy remain free of OpenRouter types | scans + regression tests | isolation assertions in new tests | AC-T-04 | **Verified** |
| GAP-26 | Not implemented | — | README + this report | Deferred | **Deferred** |

---

## D. API contract

| Signal | Meaning |
|--------|---------|
| `ok: true` | Transport/request-processing success — orchestration produced a `CouncilResult` without crashing |
| `ok: false` | Request/validation/orchestrator failure envelope (`CouncilApiFailure`) |
| `result.status` / `sessionStatus` | Council session outcome: `complete` \| `partial` \| `failed` |
| `sessionSeverity` | `success` \| `warning` \| `error` |
| `terminalReasonCode` | See taxonomy below |

### Reason codes (WP-02 minimal)

| Code | Typical condition |
|------|-------------------|
| `SESSION_COMPLETE` | `complete` |
| `PARTIAL_ADVISOR_FAILURE` | `partial` |
| `CHAIRMAN_SYNTHESIS_FAILURE` | `failed` with chairman failed/missing after enough advisors |
| `INSUFFICIENT_ADVISOR_PARTICIPATION` | `failed` due to participation / `insufficientCouncil` |
| `INTERNAL_ORCHESTRATION_FAILURE` | `failed` residual |

**Compatibility:** Additive fields only. Existing UI uses `result.status` via `fetchCouncilResult` (unchanged return type).

**HTTP:** 200 remains appropriate for completed orchestration including partial/failed sessions; 400/500 remain for transport/request failures.

---

## E. Retry policy

| Topic | Behavior |
|-------|----------|
| Semantics | **`maxAttempts = 3`** (1 initial + 2 retries). Former `MAX_RETRIES=2` meant retries after first attempt. |
| Eligible | `timeout`, `rate_limited`, `transient`, `invalid_response` |
| Ineligible | `configuration`, `permanent` |
| Exhaustion | Fail closed — throw sanitized provider error; no silent success |
| Delay | `getRetryDelayMs` returns `0` (immediate); backoff config → WP-07 |
| Deferred | Full NFR-CFG-01 externalization (WP-07); **GAP-26** alternate-model fallback |

---

## F. Security (AC-S-02)

- Adapter `sanitizeProviderMessage` discards raw provider body; client-visible message is stable: `"The model provider returned an error."`
- Tests inject Bearer tokens / stack traces and assert exclusion (`tests/openrouter-retry-sanitization.test.mjs`)
- Terminal reason codes are closed enums — no exception text
- API `ok: false` INTERNAL_ERROR message remains generic

---

## G. Provider isolation (AC-T-04)

- `src/types/council.ts`: no OpenRouter references
- `src/lib/retry/*`: no provider SDK imports
- Provider translation remains in `src/lib/openrouter/client.ts`
- Reason codes name Council outcomes, not vendor errors

---

## H. Final validation

| Check | Final result | Baseline comparison |
|-------|--------------|---------------------|
| `npm run lint` | PASS (exit 0; 0 warnings after cleanup) | Same pass; new unused-param warnings fixed |
| `npm run typecheck` | PASS | Same |
| `npm run test` | PASS — **273** pass / 0 fail | +19 tests vs 254 baseline |
| `npm run build` | PASS | Same |

---

## I. Scope control

No unrelated gaps implemented. GAP-26 deferred. Shared GAP-04/GAP-09 limited to WP-02 slices per Scope Verification §A.5.

---

## J. Rollback

- Revert WP-02 commits (or discard uncommitted WP-02 file set listed in proposed commits).
- No database, migration, secret, or infrastructure changes.
- Fully reversible at source level.
- Residual risk: clients that began consuming additive session fields would need to tolerate their absence after rollback (additive-only contract).

---

## K. Completion Validation (IMP-0000 §11)

| Criterion | Result |
|-----------|--------|
| Functional integrity (build/start/regression) | **PASS** — build green; 273 tests green |
| Code quality (typecheck/lint/TODO) | **PASS** — typecheck/lint clean for WP-02 changes |
| Verification | **PASS** — new + existing automated tests |
| Documentation / traceability | **PASS** — README, this report, Scope Verification §C |
| Source control checkpoint | **PASS** — local PEOS implementation commits created (see below) |
| Commit Traceability Validation | **PASS** — hashes and Gap IDs recorded |
| Deployment readiness | **Architecture review pending** — Staging eligibility **not granted**; no push/deploy performed |
| Exceptions | None |

### Commit Traceability

| Item | Value |
|------|-------|
| Commit 1 hash | `5081131658a2ec06493f177e21e6ddad178cf949` |
| Commit 1 summary | `fix: centralize provider retry policy and sanitize errors` |
| Commit 2 hash | `4d763595a4d0cfce9de994db08e6c8388a2a3243` |
| Commit 2 summary | `fix: surface Council terminal severity and reason codes` |
| Commit 3 hash | `4c8de9c4364e31a207f143114bf17aee7acf370a` |
| Gap IDs | Resolves GAP-10, GAP-11; Implements GAP-04/GAP-09 (WP-02 slices); Verifies GAP-23, AC-S-02, AC-T-04; Defers GAP-26 |

---

## L. Final assessment

**PASS WITH OBSERVATIONS**

Governance determination:

1. **WP-02 implementation is complete** for the approved scope.
2. **Validation passed** (lint / typecheck / 273 tests / build).
3. **Local implementation commits were created** (Commit 1 + Commit 2; this evidence commit follows).
4. **Architecture Compliance Review is the next gate.**
5. **Staging eligibility has not yet been granted** (subject to architecture review and WP-08 controls).
6. **No push or deployment occurred.**
7. Pre-existing WP-01 assessment artifacts remain excluded from WP-02 commits.

---

*WP-02 — Error Model & OpenRouter Reliability — `prodignus-council` under IMP-0001 / IMP-0000 §11*
