---
id: WP-02-ARCHITECTURE-COMPLIANCE-REVIEW
title: WP-02 Architecture Compliance Review
subtitle: Error Model & OpenRouter Reliability — PEOS architecture gate
version: "1.0"
status: Complete
classification: Architecture Compliance Review
owner: Prodignus Architecture / Engineering
created: 2026-07-27
updated: 2026-07-27
related:
  - WP-02-SCOPE-VERIFICATION
  - WP-02-IMPLEMENTATION-REPORT
  - IMP-0001
  - IMP-0000
  - ADR-0002
  - ADR-0006
  - ADR-0007
  - ADR-0008
  - ENG-0003
work_package: WP-02
imp: IMP-0001
repository: prodignus-council
verdict: PASS WITH OBSERVATIONS
---

# WP-02 Architecture Compliance Review

## Document control

| Field | Value |
|-------|-------|
| Work package | **WP-02 — Error Model & OpenRouter Reliability** |
| Repository | `prodignus-council` |
| Branch | `master` (local; not pushed) |
| Base commit | `fe40dde8323b9b50740ae19c0c9c895e72dc2c42` |
| Reviewed commits | `5081131658a2ec06493f177e21e6ddad178cf949`, `4d763595a4d0cfce9de994db08e6c8388a2a3243`, `4c8de9c4364e31a207f143114bf17aee7acf370a` |
| Review date | 2026-07-27 |
| Reviewer | PEOS Architecture Compliance Review (Cursor execution agent under IMP-0000 §13) |
| Governing documents | IMP-0000 §11 / §11.7; IMP-0001 WP-02; WP-02 Scope Verification; WP-01 Stage B Gap Analysis; ADR-0002, ADR-0006, ADR-0007; ADR-0008 (Proposed — guidance); ENG-0003; ENG-0004 (boundary check only) |
| Review status | **Complete** |
| Verdict | **PASS WITH OBSERVATIONS** |

### Working-tree context at review start

| Path | State | Disposition |
|------|-------|-------------|
| `docs/assessments/WP-01-STAGE-A-BASELINE-AUDIT.md` | Untracked | Pre-existing; excluded from WP-02 |
| `docs/assessments/WP-01-STAGE-B-GAP-ANALYSIS.md` | Untracked | Pre-existing; read-only gap source |
| `docs/assessments/README.md` | Modified | Mixed WP-01/WP-02 index hunks; not treated as defect |
| `docs/assessments/WP-02-IMPLEMENTATION-REPORT.md` | Modified | Intentional Commit 3 self-hash residual; not treated as defect |
| `HEAD` | `4c8de9c…` | Matches expected evidence tip |

---

## 1. Executive summary

WP-02 local implementation commits were reviewed against approved Scope Verification, IMP-0001 WP-02 completion criteria, IMP-0000 execution/traceability rules, and applicable ADR/ENG constraints.

The implementation:

- centralizes provider-neutral retry eligibility (`src/lib/retry/`) with bounded `maxAttempts = 3` and fail-closed exhaustion;
- keeps OpenRouter translation inside the adapter while domain/API types remain provider-neutral;
- adds additive session outcome fields (`sessionStatus`, `sessionSeverity`, `terminalReasonCode`) without redefining transport `ok`;
- sanitizes provider error text on the adapter exit path (AC-S-02);
- documents README retry behavior (GAP-11);
- defers GAP-26 and WP-07 configuration/backoff externalization as required.

**No Critical or Major findings.** Non-blocking Observations and one Minor test-coverage gap are recorded. Validation re-run: lint/typecheck/build PASS; **273** tests PASS.

**Verdict: PASS WITH OBSERVATIONS.** Architecture gate may proceed to authorize remote publication. Staging eligibility remains **not granted** pending WP-08 and separate Staging authorization.

---

## 2. Review scope

In scope: the three listed commits and their combined delta from `fe40dde`, related tests, WP-02 evidence docs, and applicable PEOS/ADR/ENG controls for WP-02 gaps GAP-04 (slice), GAP-09 (slice), GAP-10, GAP-11, GAP-23, GAP-26 deferral, AC-S-02, AC-T-04.

Out of scope: application/test modifications; fixing findings; WP-01 artifacts; WP-03…WP-08 implementation; Production/Staging deployment; remote push.

---

## 3. Evidence reviewed

| Evidence | Role |
|----------|------|
| `git show` / `git diff fe40dde..4c8de9c` | Commit integrity and combined delta |
| `src/lib/retry/*`, `src/lib/openrouter/client.ts` | GAP-04 / AC-S-02 |
| `src/types/council.ts`, `terminal-outcome.ts`, API route, `council-client.ts` | GAP-09/10 |
| WP-02 tests listed in §6 | Behavioral coverage |
| `WP-02-SCOPE-VERIFICATION.md`, `WP-02-IMPLEMENTATION-REPORT.md` | Approved scope + implementation claims |
| `WP-01-STAGE-B-GAP-ANALYSIS.md` | Approved Gap IDs (read-only) |
| IMP-0000, IMP-0001 (hercules-knowledge) | PEOS controls / WP-02 AC |
| ADR-0002, ADR-0006, ADR-0007; ADR-0008 Proposed | Architecture constraints |
| ENG-0003 | Retry/recovery shape |
| ENG-0004 | No new PKOS dependency introduced by WP-02 |
| `npm run lint/typecheck/test/build` | Independent validation |

---

## 4. Commit-integrity assessment

| Check | Result |
|-------|--------|
| Commit boundaries coherent | **PASS** — (1) retry+sanitize+README, (2) terminal API/domain, (3) evidence docs |
| Tests with validating code | **PASS** — retry/sanitization with Commit 1; terminal/client with Commit 2 |
| PEOS message template | **PASS** — Resolves/Implements/Verifies/Defers/WP/IMP present |
| WP-01 artifacts excluded | **PASS** — not in any of the three commits |
| Secrets / generated artifacts | **PASS** — none observed |
| Unrelated functionality | **PASS** — no WP-03…WP-08 product expansion |
| Docs vs code | **PASS** — README and Implementation Report align with inspected behavior |
| Combined delta size | 18 files, +1122/−36 — proportionate to WP-02 |

---

## 5. Architecture assessment

### 5.1 Retry policy

| Topic | Assessment |
|-------|------------|
| Provider neutrality | **PASS** — `src/lib/retry/types.ts` / `policy.ts` have no OpenRouter imports; categories are application-level |
| Responsibility separation | **PASS** — HTTP→category translation in adapter; eligibility in policy; `callOpenRouter` consumes `shouldRetryAttempt` / `getRetryDelayMs` |
| Semantics | **PASS** — `maxAttempts = 3` documented and implemented as 1 initial + ≤2 retries (`for (attempt < maxAttempts)`); no off-by-one observed in tests |
| Eligibility | **PASS WITH OBSERVATION** — retries timeout/rate_limited/transient/invalid_response; not configuration/permanent. See WP02-AR-001 |
| Exhaustion | **PASS** — fail-closed throw after budget; no alternate-model fallback (GAP-26 deferred) |
| Backoff | **PASS WITH OBSERVATION** — `getRetryDelayMs` returns `0`; WP-07 owns externalization. See WP02-AR-002 |
| Category fidelity after throw | **PASS WITH OBSERVATION** — `classifyOpenRouterError` maps retryable `PROVIDER_ERROR` to `transient`, collapsing `rate_limited`. Harmless at 0 ms delay; relevant when backoff differs (WP02-AR-003) |

### 5.2 Provider boundary

| Topic | Assessment |
|-------|------------|
| Domain types (`src/types/council.ts`) | **PASS** — no OpenRouter types (AC-T-04 / GAP-23) |
| API contract | **PASS** — reason codes are Council outcomes, not vendor codes |
| Retry module | **PASS** — provider-neutral |
| Adapter | **PASS** — OpenRouter details confined to `src/lib/openrouter/` |
| Pre-existing runners | **NOTE** — `advisor-runner` / `chairman-runner` still import OpenRouter client/types (pre-WP-02 orchestration pattern). Not introduced by WP-02; domain models remain clean |

ENG-0004: WP-02 does not alter PKOS retrieval contracts; no manufactured PKOS dependency.

ADR-0002 provider replaceability: satisfied for domain/API; adapter remains OpenRouter-specific as designed.

### 5.3 Terminal outcome model

| Topic | Assessment |
|-------|------------|
| Deterministic mapping | **PASS** — complete→success/`SESSION_COMPLETE`; partial→warning/`PARTIAL_ADVISOR_FAILURE`; failed→error + participation/chairman/internal codes |
| Taxonomy within WP-02 | **PASS** — minimal set; WP-05 Chairman taxonomy not implemented |
| Provider neutrality of codes | **PASS** |
| Ambiguity | **PASS WITH OBSERVATION** — `INTERNAL_ORCHESTRATION_FAILURE` is defensive residual; unlikely under current `determineCouncilSessionStatus` (WP02-AR-004) |

### 5.4 API compatibility

| Topic | Assessment |
|-------|------------|
| Additive fields | **PASS** — `CouncilApiSuccess` extends with required session fields on success path; `ok` meaning preserved |
| HTTP 200 for partial/failed | **PASS** — intentional; documented in README; technical failures remain 400/500 |
| UI consumer | **PASS** — `page.tsx` uses `result.status` via `fetchCouncilResult` |
| Primary client helper | **PASS WITH OBSERVATION** — `fetchCouncilResult` returns `CouncilResult` only and discards additive session metadata (WP02-AR-005). Route still exposes fields; `result.status` remains available to ordinary UI clients. Not classified Major |

### 5.5 Error sanitization

| Topic | Assessment |
|-------|------------|
| `sanitizeProviderMessage` | **PASS** — discards provider body; stable message only |
| Production path | **PASS** — HTTP error path uses sanitize before `OpenRouterClientError` |
| Tests | **PASS** — inject Bearer/stack; assert absence; exhaustion call count = 3 |
| API 500 path | **PASS** — generic INTERNAL_ERROR message |
| Nested causes | **PASS** — OpenRouterClientError message is the sanitized string; no cause chain attached |

AC-S-02: **PASS** with direct code + test evidence.

---

## 6. Test assessment

| Area | Assessment |
|------|------------|
| Retry eligibility / exhaustion / success-after-retry | **PASS** — policy unit tests + adapter integration |
| Non-retryable stop | **PASS** — 401 single attempt |
| Sanitization on production path | **PASS** |
| Terminal complete/partial/failed | **PASS** — unit tests on `deriveCouncilTerminalOutcome` |
| Client compatibility with additive fields | **PASS** — payload with fields still returns `result` |
| API route response shaping | **MINOR GAP** — no dedicated route/integration test asserting JSON envelope fields (WP02-AR-006) |
| Source-text isolation assertions | **Observation** — durable for GAP-23 but brittle to comments/renames (WP02-AR-007) |

---

## 7. PEOS compliance

| Control | Result |
|---------|--------|
| Approved WP-02 scope only | **PASS** |
| IMP-0000 §11 deployable checkpoint | **PASS** — build/test green; known limitations documented |
| Commit Traceability §11.7 | **PASS** — Gap IDs in messages; files map to gaps |
| Completion Validation recorded | **PASS** — Implementation Report (Commit 3 self-hash residual noted) |
| No Production authorization claimed | **PASS** |
| GAP-26 deferred explicitly | **PASS** |
| Shared-gap slices respected | **PASS** — no full WP-05 taxonomy; no full WP-07 config |

---

## 8. Findings

### Critical

None.

### Major

None.

### Minor

#### WP02-AR-006

| Field | Content |
|-------|---------|
| ID | WP02-AR-006 |
| Severity | Minor |
| Area | Tests |
| Evidence | `src/app/api/council/route.ts`; absence of route-level test; coverage via `council-terminal-outcome.test.mjs` + `council-client.test.mjs` only |
| Finding | Additive API envelope fields are not asserted through the HTTP route handler |
| Impact | Regressions in route wiring could ship without a direct failing test |
| Recommendation | Add a focused route/handler test that stubs `runCouncil` and asserts `sessionStatus` / `sessionSeverity` / `terminalReasonCode` |
| Blocking | No |
| Target | Backlog / next hardening WP or WP-08 validation pack |

### Observations

#### WP02-AR-001

| Field | Content |
|-------|---------|
| ID | WP02-AR-001 |
| Severity | Observation |
| Area | Retry |
| Evidence | `isRetryEligible` includes `invalid_response`; IMP-0001 §8.5 lists timeouts/429/5xx/network; prior adapter retried `INVALID_PROVIDER_RESPONSE` |
| Finding | Retrying invalid provider responses preserves prior behavior but is broader than IMP’s transient list |
| Impact | Possible extra latency/cost when responses are permanently malformed |
| Recommendation | Revisit eligibility during WP-07 policy hardening; distinguish transport glitches vs permanent payload defects |
| Blocking | No |
| Target | WP-07 |

#### WP02-AR-002

| Field | Content |
|-------|---------|
| ID | WP02-AR-002 |
| Severity | Observation |
| Area | Retry |
| Evidence | `getRetryDelayMs` → `0`; IMP-0001 NFR-RES-01 expects exponential backoff; WP-02 Scope §A.5 defers config/backoff to WP-07 |
| Finding | Zero-delay retries are in-scope for WP-02 slice but can briefly amplify 429 pressure |
| Impact | Limited by `maxAttempts=3`; not unbounded |
| Recommendation | Implement backoff defaults when WP-07 externalizes knobs; keep hard attempt budget |
| Blocking | No |
| Target | WP-07 |

#### WP02-AR-003

| Field | Content |
|-------|---------|
| ID | WP02-AR-003 |
| Severity | Observation |
| Area | Retry |
| Evidence | `classifyHttpFailure` returns `rate_limited`; `classifyOpenRouterError` maps retryable `PROVIDER_ERROR` → `transient` |
| Finding | Rate-limit category is collapsed before delay decision |
| Impact | None while delay is always 0; future per-category backoff would be wrong without fix |
| Recommendation | Persist category on the error object or avoid remapping before `getRetryDelayMs` |
| Blocking | No |
| Target | WP-07 |

#### WP02-AR-004

| Field | Content |
|-------|---------|
| ID | WP02-AR-004 |
| Severity | Observation |
| Area | API |
| Evidence | `deriveFailedReasonCode` residual → `INTERNAL_ORCHESTRATION_FAILURE` |
| Finding | Code is defensive; may be unreachable under current session-status rules |
| Impact | Low; taxonomy remains stable |
| Recommendation | Keep as fail-safe; document rarity; refine in WP-05 if Chairman taxonomy absorbs it |
| Blocking | No |
| Target | WP-05 / backlog |

#### WP02-AR-005

| Field | Content |
|-------|---------|
| ID | WP02-AR-005 |
| Severity | Observation |
| Area | API |
| Evidence | `fetchCouncilResult` returns `CouncilResult` only; comment acknowledges dropped additive fields |
| Finding | Browser helper does not surface `sessionSeverity` / `terminalReasonCode` |
| Impact | UI still has `result.status`; monitors using raw `/api/council` retain full envelope; typed helper for monitors is missing |
| Recommendation | Optional `fetchCouncilApiResponse()` returning `CouncilApiSuccess` for ops/UI that need severity codes |
| Blocking | No |
| Target | Backlog |

#### WP02-AR-007

| Field | Content |
|-------|---------|
| ID | WP02-AR-007 |
| Severity | Observation |
| Area | Tests |
| Evidence | `tests/retry-policy.test.mjs`, `tests/openrouter-retry-sanitization.test.mjs` source scans |
| Finding | Provider-isolation tests partly assert file text |
| Impact | Brittle to renames/comments; still useful regression signal |
| Recommendation | Prefer import-graph or type-level guards over long-term |
| Blocking | No |
| Target | Backlog |

#### WP02-AR-008

| Field | Content |
|-------|---------|
| ID | WP02-AR-008 |
| Severity | Observation |
| Area | Governance |
| Evidence | Working-tree `M docs/assessments/WP-02-IMPLEMENTATION-REPORT.md` (Commit 3 self-hash) |
| Finding | Commit 3 cannot contain its own hash without amend; one-line residual remains |
| Impact | Traceability complete via this review + git log; residual is intentional |
| Recommendation | Optionally fold via authorized amend of `4c8de9c` or leave as known residual |
| Blocking | No |
| Target | Governance housekeeping |

---

## 9. Acceptance-criteria assessment

| Criterion | Result | Evidence |
|-----------|--------|----------|
| GAP-04 WP-02 slice | **PASS** | `src/lib/retry/*`; adapter consumes policy; eligibility tests |
| GAP-09 WP-02 slice | **PASS** | Minimal reason taxonomy + derivation |
| GAP-10 | **PASS** | Additive session severity/status/reason on `CouncilApiSuccess`; README documents distinction from `ok` |
| GAP-11 | **PASS** | README Provider retries section matches behavior |
| GAP-23 / AC-T-04 | **PASS** | Domain types clean; retry module neutral |
| GAP-26 deferral | **PASS** | Explicit in commits, README, reports |
| AC-S-02 | **PASS** | `sanitizeProviderMessage` + sanitization tests |
| Completion Validation | **PASS** | Implementation Report §K |
| Commit Traceability | **PASS** | PEOS templates; Gap→file mapping |
| IMP-0001 WP-02 AC (AC-T-04, AC-S-02, retry tests) | **PASS** | Revalidated 2026-07-27 |

---

## 10. Validation results

Re-run during this review (prodignus-council @ `4c8de9c` + residuals):

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (exit 0) |
| `npm run typecheck` | PASS (exit 0) |
| `npm run test` | PASS — **273** pass / 0 fail |
| `npm run build` | PASS (exit 0) |

Matches Implementation Report final validation. Pre-existing `MODULE_TYPELESS_PACKAGE_JSON` warnings remain unrelated.

---

## 11. Scope-control assessment

| Control | Result |
|---------|--------|
| Only approved WP-02 gaps | **PASS** |
| Excluded Gap IDs untouched | **PASS** |
| No WP-01 files in commits | **PASS** |
| No Production/infra/secrets changes | **PASS** |
| No silent architecture redesign | **PASS** |

---

## 12. Risk and rollback assessment

| Topic | Assessment |
|-------|------------|
| Rollback | Revert `5081131..4c8de9c` (or reset to `fe40dde`); source-only; no data migrations |
| Residual risk | Zero-delay 429 retries (bounded); monitors must read API envelope or `result.status` |
| Security residual | Low — sanitization fail-closed on provider HTTP errors |
| Compatibility residual | Additive API fields; old clients ignoring unknowns remain viable if they only used `result` |

---

## 13. Review verdict

### PASS WITH OBSERVATIONS

No Critical or Major findings. One Minor test-coverage follow-up (WP02-AR-006). Observations WP02-AR-001…005, 007, 008 are non-blocking and largely deferred to WP-05/WP-07/backlog by approved scope.

---

## 14. Progression recommendation

| Gate | Decision |
|------|----------|
| WP-02 implementation complete | **Yes** |
| Architecture compliant | **Yes** (with observations) |
| Ready for remote publication | **Yes** — after optional docs commit of this review |
| Eligible for Staging | **No** — requires WP-08 + Staging authorization |
| WP-08 authorization satisfied | **No** |

Recommended sequence:

```text
Architecture review PASS WITH OBSERVATIONS (this document)
→ authorize local docs commit for this ACR (optional but recommended)
→ authorize push/publication of WP-02 commits
→ continue IMP-0001 roadmap (WP-03…)
→ WP-08 validation pack / Staging authorization (separate)
```

---

## 15. Required follow-ups

| ID | Blocking for next WP-02 gate? | Target |
|----|-------------------------------|--------|
| WP02-AR-006 | No (publication OK); recommended before Staging soak | Backlog / WP-08 |
| WP02-AR-001…003 | No | WP-07 |
| WP02-AR-004…005, 007 | No | Backlog / WP-05 |
| WP02-AR-008 | No | Governance housekeeping |

No WP-02 correction commit is required to accept this architecture gate.

---

*WP-02 Architecture Compliance Review — `prodignus-council` under IMP-0001 / IMP-0000 — Verdict: PASS WITH OBSERVATIONS*
