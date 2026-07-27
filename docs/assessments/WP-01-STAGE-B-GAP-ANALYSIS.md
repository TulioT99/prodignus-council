---
id: WP-01-STAGE-B
title: Decision Council Gap Analysis — IMP-0001 Implementation Roadmap
subtitle: WP-01 Stage B — compare Stage A baseline to IMP-0001 target state
version: "1.0"
status: Complete
classification: Engineering Gap Analysis / Execution Roadmap
owner: Prodignus Engineering
created: 2026-07-27
updated: 2026-07-27
related:
  - WP-01-STAGE-A
  - IMP-0000
  - IMP-0001
  - ADR-0002
  - ADR-0006
  - ADR-0007
  - ADR-0008
  - ENG-0003
  - ENG-0004
repository: prodignus-council
branch: master
---

# WP-01 Stage B — Gap Analysis

**IMP:** IMP-0001 — Decision Council Production Readiness  
**Baseline (current state):** [WP-01-STAGE-A-BASELINE-AUDIT.md](./WP-01-STAGE-A-BASELINE-AUDIT.md) v1.1  
**Assessment date:** 2026-07-27  
**Mode:** Gap analysis and implementation roadmap only — **no code changes**  
**Application code modified:** None  

---

# A. Executive Summary

Stage A established that the Decision Council is a **Partially Mature** live system: modular orchestration, five live advisors, Chairman synthesis, PKOS filesystem retrieval, and OpenRouter retries/timeouts already exist. Stage B asks what must change to satisfy IMP-0001.

**Overall gap posture:** The product **workflow** is largely present; the **production qualities** required by IMP-0001 are incomplete. The largest gaps are:

| Rank | Gap theme | Classification | Priority |
|------|-----------|----------------|----------|
| 1 | No deterministic Consensus Engine (FR-CO-*) | Missing Capability | **Critical** |
| 2 | Observability Immature (NFR-OBS-01, AC-O-02) | Missing Capability | **Critical** |
| 3 | Retry/timeout/config policy not centralized (NFR-RES-01, NFR-CFG-01, NFR-LAT-02) | Enhancement | **High** |
| 4 | Per-advisor timeout / orchestration reliability incomplete (FR-AD-02) | Missing Capability / Enhancement | **High** |
| 5 | Session failure semantics (HTTP 200 masks failed councils) | Defect | **High** |
| 6 | PKOS soft-fail without strong operational clarity (FR-PK-04 / R-07) | Enhancement | **High** |
| 7 | Validation/Staging evidence pack not established (AC-ST-*, AC-O-*) | Missing Capability | **High** |
| 8 | Documentation/config drift (README retries; inert flags; version split) | Defect | **Medium** |

**Compliance headline:** Architecture and provider isolation are largely aligned with ADR-0002/0007. ADR-0006 analysis-before-Chairman and ENG-0003 observability/recovery shape are **not** fully realized. Production deployment is **Not Ready**.

**Roadmap recommendation:** **Reorganize** the IMP-0001 work-package **execution sequence** (keep WP IDs for traceability; split WP-07 into early configuration + later observability slices). Do not redesign the target architecture.

---

# B. Gap Assessment Matrix

Evidence column cites Stage A unless noted. Classifications: **Defect** | **Missing Capability** | **Enhancement**.

| ID | Requirement | Current State | Gap | Classification | Priority | Recommended WP |
|----|-------------|---------------|-----|----------------|----------|----------------|
| GAP-01 | FR-CO-01…04 Deterministic consensus | No consensus module; LLM Chairman fields + session-status heuristics (Stage A §4, Maturity G.4) | Reproducible aggregation, explicit conflict/insufficient-evidence paths, minority lineage for Chairman not implemented as engine | Missing Capability | Critical | WP-04 |
| GAP-02 | Target arch Consensus Engine + Logging/Metrics | Console logs + UI metrics only; empty `collectiveIntelligence` (Stage A §10, G.6) | Stage events, metrics export, structured logs with correlation fields missing | Missing Capability | Critical | WP-07 (obs slice) |
| GAP-03 | NFR-OBS-01 `correlationId` + stage events | `executionId` only; ad-hoc console prefixes (Stage A §10) | Formal correlation ID (or documented alias), structured stage events for retrieve/advisors/consensus/chairman/validate | Missing Capability / Enhancement | Critical | WP-07 |
| GAP-04 | NFR-RES-01 / §8.5 Centralized retry policy | `MAX_RETRIES=2` hardcoded in OpenRouter client; no shared policy module; no total time budget config (Stage A §6, G.3/G.7) | Configurable attempts, backoff, wall-clock budget; orchestration + adapter consume one policy | Enhancement | High | WP-02 + WP-07 config slice |
| GAP-05 | FR-AD-02 Per-advisor timeout ≤45s default (NFR-LAT-02) | Shared provider timeout default 90s only (Stage A §3) | Per-advisor orchestration timeout distinct from HTTP timeout; failed `AdvisorResult` on timeout | Missing Capability | High | WP-03 |
| GAP-06 | FR-AD-01 / FR-AD-04 Consistency + confidence normalization | Schema parsers + calibration exist; temperature hardcoded 0.3; confidence normalization before aggregation not evidenced as consensus input (Stage A §3, §7) | Documented seed/temperature policy; normalize confidence into consensus inputs | Enhancement | High | WP-03 → WP-04 |
| GAP-07 | FR-CH-03 Bounded Chairman retry before fail | Provider-level retries exist; Chairman-specific bounded policy / `ChairmanFailed` reason taxonomy incomplete vs IMP (Stage A §2) | Explicit Chairman retry budget + reason codes on exhaustion; AC-ST-03 evidence | Enhancement | High | WP-05 |
| GAP-08 | FR-CH-04 Degradation flags; never invent missing advisors | Insufficient-council gate + `reducedConfidenceSynthesis` exist; explicit degradation flags incomplete vs IMP (Stage A §2) | Standardize degradation metadata into Chairman context/result | Enhancement | High | WP-05 |
| GAP-09 | FR-CH-02 Structured outcome with reason codes | Failed Chairman results exist; reason-code catalog not standardized across API (Stage A §2, §9) | Domain reason codes on all terminal outcomes | Enhancement | Medium | WP-02 / WP-05 |
| GAP-10 | API/HTTP failure semantics | HTTP 200 + `ok: true` with partial/failed council (Stage A §9, BR-05) | Operators/monitors cannot use HTTP status; need session-severity signal | Defect | High | WP-02 |
| GAP-11 | README vs code retries | README claims no retries; code `MAX_RETRIES=2` (Stage A §6, BR-06) | Documentation incorrect | Defect | Medium | WP-02 |
| GAP-12 | NFR-CFG-01 Configurability | Models via env; retries/temp/timeouts largely hardcoded; inert prototype flags (Stage A §8, G.7) | Documented knobs for timeouts, retries, participation, degradation flags | Enhancement | High | WP-07 config slice (early) |
| GAP-13 | Inert feature flags / version drift | `prototypeMode` unused; package 0.1.0 vs config 0.3.5 (Stage A §8, §12) | False control plane; release identity ambiguity | Defect | Medium | WP-07 / WP-08 docs |
| GAP-14 | FR-PK-01…04 PKOS contract | Retrieve-before-deliberate exists; soft-fail continues without evidence; integrity digest exists (Stage A §5) | Stronger insufficient/failed evidence surfacing to Chairman + Staging proof; avoid silent quality drop | Enhancement | High | WP-06 |
| GAP-15 | Prompt versioning / checksum (§8.7) | TS string builders; schemaVersion on context; no prompt checksum registry (Stage A §7) | Version/checksum + evidence of prompt diffs under IMP | Enhancement | Medium | WP-05 / WP-08 |
| GAP-16 | FR-AD-03 Validation before consensus | Per-advisor parsers exist; no consensus gate consuming validated set (Stage A §3–4) | Wire validated advisor opinions into consensus engine input | Enhancement | High | WP-03 → WP-04 |
| GAP-17 | Test: API route + pkos-smoke + resilience AC | Strong unit/integration; `pkos-smoke` unwired; no `route.ts` tests; no Staging soak evidence (Stage A §11, G.8) | AC-TE-01, AC-ST-* evidence missing | Missing Capability | High | WP-08 (+ WP-03/05 fixtures) |
| GAP-18 | AC-O-01…03 Staging deploy, timeline by correlation, rollback | Not evidenced in Stage A (ops Partially Mature / Immature obs) | Staging deploy record, operator timeline, rollback dry-run | Missing Capability | High | WP-08 |
| GAP-19 | NFR-REL-01/02 measured soak | Not measured (Stage A) | Staging soak metrics vs 95%/90% thresholds | Missing Capability | High | WP-08 |
| GAP-20 | NFR-LAT-01 p95 ≤120s published | Durations computed per run; no p50/p95/p99 evidence pack (Stage A §10) | Performance sampling table | Missing Capability | Medium | WP-08 |
| GAP-21 | Empty `collectiveIntelligence` stub | Always `{}` (Stage A §2, BR-11) | Stub misrepresents analysis layer; must feed consensus output or be removed/replaced | Defect / Missing Capability | High | WP-04 |
| GAP-22 | AC-F-05 Failed Chairman presentation | ADR-0008 guards claimed in knowledge; Stage A notes presentation path exists — verify no fabricated recommendation under IMP tests | Confirm + regression tests; close residual risk | Enhancement | Medium | WP-05 / WP-08 |
| GAP-23 | NFR-MAINT-01 Provider isolation | Domain largely provider-neutral (Stage A §6) | Maintain isolation under retry/config changes | — (compliant; monitor) | Low | WP-02 regression |
| GAP-24 | NFR-SEC-01 Secrets / sanitized errors | Env key; sanitize helpers; diagnostics tests (Stage A §6, §9) | Maintain; evidence samples redacted | Enhancement (evidence) | Medium | WP-08 |
| GAP-25 | Global session timeout / hang prevention (NFR-REL-01) | Provider timeout only; no documented global session wall-clock (Stage A BR-12) | Global timeout / hang guard for soak criteria | Enhancement | High | WP-03 / WP-07 config |
| GAP-26 | Alternate-model fallback after exhaustion (§8.5 optional) | Not present (Stage A) | Optional; only if configured — not mandatory for close if exhaustion fails closed | Enhancement | Low | WP-02 (optional) / defer |

**Compliant / near-compliant (no primary gap row):** FR-PK-01 retrieve-before-deliberate; advisor failure isolation (ADR-0002); OpenRouter adapter boundary; substantial automated tests for existing modules; Chairman schema parse reject path.

---

# C. Engineering Compliance Assessment

## C.1 Architecture

**Current State:** Modular Next.js pipeline; provider isolated; PKOS before advisors; empty CI stub.  
**Target State:** IMP-0001 §8.1 — Chairman, Advisors, Consensus Engine, Validation, Logging/Metrics as first-class stages.  
**Gap:** Consensus Engine and metrics/logging architecture missing; CI stub unresolved (GAP-01, GAP-02, GAP-21).  
**Priority:** Critical / High  
**Recommended Action:** Implement consensus module feeding Chairman; emit stage telemetry; do not invent new product architecture outside IMP.

## C.2 Chairman

**Current State:** `runChairman` with min-3 gate, structured parse, failed results, reduced-confidence flag.  
**Target State:** FR-CH-01…05 — deterministic orchestration order, reason codes, bounded retries, degradation flags, schema validation.  
**Gap:** Partial compliance — retries provider-level only; reason codes/degradation incomplete (GAP-07, GAP-08, GAP-09).  
**Priority:** High  
**Recommended Action:** WP-05 after consensus feed exists.

## C.3 Advisor orchestration

**Current State:** Parallel `allSettled`; per-advisor failure isolation; shared 90s provider timeout.  
**Target State:** FR-AD-01…04 — per-advisor timeout, validation before consensus, confidence normalization.  
**Gap:** Per-advisor timeout missing; confidence→consensus pipeline incomplete (GAP-05, GAP-06, GAP-16).  
**Priority:** High  
**Recommended Action:** WP-03 then feed WP-04.

## C.4 Consensus

**Current State:** LLM narrative fields + session status heuristics.  
**Target State:** FR-CO-01…04 reproducible aggregation with conflict/insufficient/minority handling.  
**Gap:** Engine absent (GAP-01, GAP-21).  
**Priority:** Critical  
**Recommended Action:** WP-04 — primary architectural gap under ADR-0006 / IMP target diagram.

## C.5 PKOS

**Current State:** Filesystem CRE; retrieve-before-deliberate; soft-fail; integrity digest.  
**Target State:** FR-PK-01…04 integrity, traceability, explicit insufficient/empty status to Chairman.  
**Gap:** Soft-fail operational clarity and Staging proof incomplete (GAP-14).  
**Priority:** High  
**Recommended Action:** WP-06 validation + harden surfacing; do not bypass CRE.

## C.6 OpenRouter

**Current State:** Timeouts, retries, diagnostics, sanitized messages; domain mostly clean.  
**Target State:** §8.5/8.10 centralized policy, eligibility, budgets, visibility.  
**Gap:** Policy not centralized/configurable; doc drift (GAP-04, GAP-11).  
**Priority:** High  
**Recommended Action:** WP-02 foundation.

## C.7 Prompt management

**Current State:** In-code builders; tested; no checksum registry.  
**Target State:** Versioned/checksummed prompts; diffs in evidence.  
**Gap:** GAP-15.  
**Priority:** Medium  
**Recommended Action:** Lightweight checksum/version during Chairman/advisor robustness edits; record in WP-08 evidence.

## C.8 Configuration

**Current State:** Env models; hardcoded retries/temp; inert flags.  
**Target State:** NFR-CFG-01 documented knobs.  
**Gap:** GAP-12, GAP-13.  
**Priority:** High (config surface) / Medium (drift)  
**Recommended Action:** Early config slice before advisor/chairman hardening.

## C.9 Error handling

**Current State:** Structured participant failures; safe messages; HTTP 200 masks session failure.  
**Target State:** Domain error codes; prefer structured failure; presentation-safe.  
**Gap:** GAP-10, GAP-09.  
**Priority:** High  
**Recommended Action:** WP-02 severity signal + reason codes.

## C.10 Observability

**Current State:** Immature — console + `executionId` + UI aggregates.  
**Target State:** NFR-OBS-01; structured logs; AC-O-02 timeline.  
**Gap:** GAP-02, GAP-03.  
**Priority:** Critical  
**Recommended Action:** WP-07 observability after stages exist; define event schema early with config slice.

## C.11 Testing

**Current State:** Broad unit/integration; gaps in route/smoke/Staging soak.  
**Target State:** §12 + AC-TE + AC-ST.  
**Gap:** GAP-17, GAP-18, GAP-19.  
**Priority:** High  
**Recommended Action:** Fixtures in WP-03/05; pack in WP-08; wire `pkos-smoke`.

## C.12 Operational readiness

**Current State:** Runnable app; no monitoring/rollback evidence.  
**Target State:** Staging deploy, operator diagnose, rollback validated.  
**Gap:** GAP-18.  
**Priority:** High  
**Recommended Action:** WP-08 exclusively for ops evidence (no Production deploy in scope).

---

# D. Recommended Work Package Plan

## D.1 Assessment of IMP-0001 WP-01…WP-08

| IMP WP | Still appropriate? | Change |
|--------|--------------------|--------|
| WP-01 Baseline Audit | Yes — **complete** after Stage A+B | Close WP-01 when this document accepted |
| WP-02 Error Model & OpenRouter | Yes | **Expand** to include GAP-10 (HTTP/session severity) and GAP-11 (README defect) |
| WP-03 Advisor Orchestration | Yes | Keep; add GAP-05/06/16/25 |
| WP-04 Consensus Hardening | Yes — **Critical** | Keep distinct; must materialize engine (not prompt-only) |
| WP-05 Chairman Stabilization | Yes | Keep **after** WP-04 so Chairman consumes consensus, not invents it |
| WP-06 PKOS Validation | Yes | Keep; focus on FR-PK proof + soft-fail clarity (not new CRE product) |
| WP-07 Observability & Configuration | Yes but **split execution** | **Reorder/split slices** — config early; observability late |
| WP-08 Validation Pack | Yes | Keep as final gate; owns soak/Staging/rollback/docs |

## D.2 Rationale for reorganization

1. **Config before hardening** — If WP-03/05 hardcode new timeouts then WP-07 externalizes them, rework is guaranteed (Stage A G.7).  
2. **Observability after stages exist** — Stage events for consensus require WP-04; full timeline after WP-05/06. Defining the **event schema** can still happen early with config.  
3. **Consensus before Chairman** — ADR-0006 / IMP diagram: Advisors → Consensus → Chairman. Building Chairman first would entrench LLM-only consensus (GAP-01).  
4. **Defects early** — README drift and HTTP semantics are cheap relative to consensus; fix in WP-02 to stop false ops assumptions.  
5. **Do not merge WP-04 into WP-05** — Would violate analysis-before-synthesis and hide Critical gap.  
6. **Do not add new product WPs** — Auth/persistence remain out of IMP-0001 scope (Stage A / IMP §5).

## D.3 Refined execution plan (traceable to IMP WP IDs)

| Order | Execution slice | IMP WP | Objective | Dependencies | Deliverables | Completion criteria |
|------|-----------------|--------|-----------|--------------|--------------|---------------------|
| 0 | Baseline closed | WP-01 | Current state + gaps known | — | Stage A + Stage B docs | This roadmap accepted |
| 1 | Foundation reliability & semantics | WP-02 | Centralize retry eligibility; domain errors; session severity signal; README correction; provider isolation preserved | WP-01 | Policy module skeleton; adapter uses config defaults; tests; README fix | AC-T-04; AC-S-02; GAP-10/11 addressed; retry tests green |
| 2 | Configuration policy surface | WP-07 **config slice** | Externalize timeouts, retries, participation, degradation flags; document knobs; wire or remove inert flags | WP-02 | Config schema + docs; no unmarked literals for policy knobs | NFR-CFG-01 for listed knobs; GAP-12/13 dispositioned |
| 3 | Advisor hardening | WP-03 | Per-advisor timeout; validation gate; confidence normalize; hang/global budget hooks | WP-02, WP-07 config | Timeout→failed AdvisorResult; tests AC-ST-02 fixtures | FR-AD-*; GAP-05/06/16/25 closed or dispositioned |
| 4 | Consensus engine | WP-04 | Reproducible aggregation; conflicts; insufficient path; minority lineage; replace empty CI stub | WP-03 | Consensus module + unit tests; Chairman context consumes output | FR-CO-*; GAP-01/21 closed |
| 5 | Chairman stabilization | WP-05 | Consume consensus; bounded Chairman retries; reason codes; degradation flags; prompt robustness/version note | WP-04 | Updated runner/context; AC-F-05 tests | FR-CH-*; AC-F-05; GAP-07/08/09/15/22 |
| 6 | PKOS validation | WP-06 | Prove retrieve→deliberate; integrity; explicit insufficient/failed to Chairman; Staging/test double | WP-05 | Integration/Staging evidence; soft-fail behavior documented | FR-PK-*; AC-F-04; GAP-14 |
| 7 | Observability | WP-07 **obs slice** | Structured stage events + metrics (errors/retries/LLM/advisors); correlationId alias; operator timeline | WP-02…WP-06 | Structured logs/metrics; AC-O-02 exercise | NFR-OBS-01; GAP-02/03 |
| 8 | Closeout | WP-08 | Soak, latency tables, Staging deploy/smoke, rollback, Architecture Compliance Review, docs/evidence pack | WP-01…WP-07 | Evidence pack §13; green suites | All AC-*; GAP-17…20/24; IMP §17 |

---

# E. Risk Prioritization

Ranked High/Critical gaps:

| Rank | Gap ID | Priority | Technical impact | Operational impact | Production impact | Implementation complexity | Implementation risk |
|------|--------|----------|------------------|--------------------|-------------------|---------------------------|---------------------|
| 1 | GAP-01 | Critical | No reproducible consensus; ADR-0006 incomplete | Cannot explain/consistency-check “consensus” | Blocks production confidence on decision quality | High (new module + tests) | Medium — scope creep into full ENG-0003 analysis layer; keep IMP-bounded |
| 2 | GAP-02/03 | Critical | No ops telemetry | Cannot alert/diagnose by session | Failed councils invisible | Medium | Low–Medium — schema discipline needed |
| 3 | GAP-05/25 | High | Slow/hanging advisor stages | Latency/cost spikes | Soak NFR fail | Medium | Low |
| 4 | GAP-04/12 | High | Inconsistent reliability knobs | Misconfigured Staging | Unreproducible ops | Medium | Low if done before hardening |
| 5 | GAP-10 | High | Wrong monitoring signals | False “healthy” HTTP | Silent failure in prod | Low–Medium | Medium — client contract change |
| 6 | GAP-14 | High | Evidence-less deliberation | Quality drop unnoticed | Bad advisory under PKOS outage | Medium | Low |
| 7 | GAP-07/08 | High | Weak Chairman recovery/degradation | Unclear failure modes | AC-ST-03 / FR-CH fail | Medium | Medium (LLM variance residual) |
| 8 | GAP-17…19 | High | No Staging proof | Cannot close IMP | Production Authorization never earned | Medium | Low — process/evidence |
| 9 | GAP-21 | High | Architectural false confidence | Misplanning | Wrong assumptions in reviews | Low–Medium | Low if replaced by WP-04 output |
| 10 | GAP-11/13 | Medium | Drift | Wrong runbooks | Confusion | Low | Low |

---

# F. Recommended Execution Sequence

```text
WP-01 (done)
  → WP-02 (errors, OpenRouter policy, HTTP/session severity, README)
  → WP-07 config slice
  → WP-03 (advisors)
  → WP-04 (consensus)          ★ Critical path
  → WP-05 (chairman)
  → WP-06 (PKOS validation)
  → WP-07 observability slice  ★ Critical path
  → WP-08 (Staging / evidence / closeout)
```

### Justification summary

| Choice | Why |
|--------|-----|
| Config before WP-03/05 | Avoid double implementation of timeouts/retries (Stage A config debt) |
| Consensus before Chairman | Matches IMP §8.1 and ADR-0006; prevents entrenching LLM-only consensus |
| Observability after functional stages | Events must cover consensus/chairman/PKOS; schema can be drafted at config slice |
| Validation last | Evidence pack measures the hardened system, not the baseline |
| Defects in WP-02 | Cheap risk reduction for operators |

**Technical risk minimization:** Build policy + advisor contracts first; deliver Critical consensus next; stabilize Chairman on top; prove PKOS; instrument; then measure.

---

# G. Production Readiness Assessment (current)

| Dimension | Classification | Evidence |
|-----------|----------------|----------|
| Architecture | Conditionally Ready | Modular baseline OK; Critical consensus/metrics gaps remain |
| Functional workflow | Conditionally Ready | End-to-end works; not IMP-complete |
| Reliability | Not Ready | Per-advisor timeout, centralized budget, soak unmet |
| Determinism | Not Ready | No consensus engine |
| Error handling | Conditionally Ready | Strong participant failures; HTTP semantics defect |
| Observability | Not Ready | Immature (Stage A G.6) |
| Configuration | Not Ready | Hardcoded policy knobs |
| Testing / validation | Not Ready | No Staging soak/evidence pack |
| Security (secrets/sanitize) | Conditionally Ready | Patterns present; need evidence samples |
| **Overall Production deploy** | **Not Ready** | IMP-0001 explicitly excludes Production; Stage A Partially Mature + Critical gaps |

**Safe Production deploy today?** **No.**

**Staging engineering work?** **Yes**, after WP-02…WP-07 — Staging validation belongs in WP-08.

---

# H. Success Criteria (gap closure)

Objective closure checks (must be true to mark gap closed):

| Gap / theme | Closed when |
|-------------|-------------|
| GAP-01 Consensus | Given identical validated advisor opinions + config, consensus module output is byte-stable across ≥3 runs; conflicts/insufficient/minority covered by automated tests FR-CO-* |
| GAP-02/03 Observability | 100% of test/Staging sessions emit structured stage events for retrieve/advisors/consensus/chairman/validate with `executionId`/`correlationId`; operator retrieves timeline in ≤5 minutes (AC-O-02) |
| GAP-04/12 Config + retry | Retry attempts, backoff, timeouts, min participation are config-driven; defaults ≤3 attempts; unit tests enforce eligibility |
| GAP-05 Advisor timeout | Configurable per-advisor timeout default ≤45s; timeout → `AdvisorResult.failed`; AC-ST-02 pass |
| GAP-10 Session severity | Client/API exposes explicit session severity or non-success signal for `failed` councils; documented; tested |
| GAP-11 README | README matches retry behavior |
| GAP-14 PKOS | Insufficient/failed/empty retrieval status visible to Chairman path; AC-F-04 evidence recorded |
| GAP-07/08 Chairman | AC-ST-03 + FR-CH-03/04 tests pass; no fabricated recommendation (AC-F-05) |
| GAP-17…20 Validation | `npm test` includes smoke; route or contract tests exist; Staging soak meets or formally waives NFR-REL/LAT with Architecture sign-off; evidence pack complete |
| Maturity matrix | Post-IMP re-score: Observability ≥ Partially Mature→Mostly Mature target; Determinism and Reliability each rise ≥1 band or residual risk accepted in writing |

---

# I. Executive Recommendation

## Recommendation: **Reorganize** the IMP-0001 implementation roadmap

| Option | Decision |
|--------|----------|
| Remain unchanged | **Rejected** — original WP-07-after-all-hardening sequence causes config rework; Observability Critical gap needs explicit late slice but config must move earlier |
| Refined only (minor) | Insufficient — Critical consensus + Immature observability require sequence change |
| **Reorganized** | **Selected** — keep WP-01…WP-08 IDs and intents; **split WP-07** into early **config** and late **observability**; expand WP-02 with Defects GAP-10/11; preserve Consensus→Chairman order |

### Evidence supporting reorganization

1. Stage A Maturity: Observability **Immature**; Configuration **Partially Mature**; Determinism **Partially Mature** with Critical missing consensus.  
2. IMP-0001 target architecture places Consensus between Advisors and Chairman.  
3. Stage A shows retries already exist but are hardcoded — centralize before adding more timeouts.  
4. HTTP/README defects are independent of consensus and should not wait for WP-08.

### What must not change

- IMP-0001 scope boundaries (no new advisors, no Production deploy, no infra redesign).  
- ADR-0002/0006/0007/0008 constraints.  
- WP-04 as a distinct Consensus work package.  
- WP-08 as the sole Staging/evidence closeout gate.

### Immediate next engineering action

**Accept Stage B → begin WP-02** (Error Model, OpenRouter reliability, session severity, README correction) under the refined sequence above.

---

## Traceability

```text
Stage A (current state)
  → Stage B (this document: gaps → WPs)
  → WP-02…WP-08 execution
  → IMP-0001 Acceptance Criteria + §17 Completion
  → Maturity Matrix re-score (Stage A §G Post-Implementation Success Criteria)
```

---

## Code modifications during Stage B

**None.**

---

*WP-01 Stage B Gap Analysis — Prodignus Decision Council (`prodignus-council`) under IMP-0001*
