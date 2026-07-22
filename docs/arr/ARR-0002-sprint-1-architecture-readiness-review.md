# ARR-0002 — Sprint 1 Architecture Readiness Review

**Review type:** Pre-implementation governance checkpoint  
**Sprint:** Sprint 1  
**Reviewer role:** Independent Architecture Review Board (ARB)  
**Review date:** 2026-07-22  
**Independence statement:** This review was performed independently from the authors of ADR-0006 and ENG-0003. Findings are based on repository evidence, not document defense.

**Documents reviewed:**

- `docs/ops/OPS-0001-engineering-workflow-standard.md`
- `docs/adr/ADR-0003-collective-intelligence-layer.md`
- `docs/adr/ADR-0005-decision-council-advisors-v1.md`
- `docs/adr/ADR-0006-sprint-1-architecture-validation-strategy.md`
- `docs/eng/ENG-0002-chairman-context-builder-technical-specification.md`
- `docs/eng/ENG-0003-sprint-1-execution-architecture.md`
- `docs/air/AIR-0001-chairman-context-builder-architecture-implementation-review.md`
- `docs/imp/IMP-0002-chairman-context-builder-implementation-plan.md`
- `docs/icr/ICR-0002-chairman-context-builder-implementation-completion-report.md`
- `docs/README.md`
- `DECISION_COUNCIL_ARCHITECTURE_ASSESSMENT.md` (historical baseline `cc90061`)

**Repository evidence inspected:**

- `src/lib/council/orchestrator.ts`, `advisor-runner.ts`, `advisor-execution-config.ts`, `advisor-response-router.ts`
- `src/lib/council/chairman-runner.ts`, `chairman-context-builder.ts`, `chairman-prompt.ts`
- `src/lib/council/council-status.ts`, `validation.ts`, `errors.ts`
- `src/lib/openrouter/client.ts`
- `src/app/api/council/route.ts`
- `src/config/council.ts`, `src/types/council.ts`
- `tests/orchestrator.integration.test.mjs`, `tests/chairman-runner.test.mjs`, `tests/council-status.test.mjs`, and related advisor/chairman test suites

---

## Executive Summary

ADR-0006 and ENG-0003 are **architecturally aligned** with verified current repository evidence. The execution pipeline — generic `runAdvisor`, persona router, `DefaultChairmanContextBuilder`, `runChairman`, and `runCouncil` — **exists in code** and matches the documented component boundaries. No architectural rewrite is required for Sprint 1.

However, the ARB **does not accept** that Steps 1–3 of ADR-0006 are already proven. Existing tests demonstrate **structural correctness** and **mocked-provider integration**, but **not** complete operational or failure-orchestration evidence. Critical validation gaps include: no dedicated `advisor-runner` tests, no API-route tests, no orchestrator partial-failure scenarios, unresolved minimum proof bar for live OpenRouter (ENG OQ-001), and no consolidated Sprint 1 validation report artifact.

ENG-0003 is a **strong engineering specification** for a validation sprint: contracts, invariants, failure semantics, and deferred scope are well defined. Minor specification gaps remain (undocumented advisor persona/config mismatch throw; `successfulCount` nuance in session status).

**Governance status:** ADR-0006 is **Accepted**. ENG-0003 remains **Proposed** but is sufficiently complete for validation work to be planned. OPS-0001 lifecycle requirements for ARR are satisfied by this review.

**Recommendation:** **PASS WITH OBSERVATIONS**

Sprint 1 validation implementation **may proceed** to IMP-0003 and subsequent execution **provided** blocking observations are addressed in the implementation plan and validation evidence matrix. Step 4 baseline acceptance **must not** be declared until IMP-defined evidence is produced and reviewed.

---

## Findings

### Critical

| ID | Classification | Finding |
| -- | -------------- | ------- |
| **C-01** | Critical | **Steps 1–3 validation evidence is incomplete.** ENG-0003 §16 lists existing tests as evidence, but the ARB verified that `runAdvisor` has no direct unit tests, API route semantics are untested, orchestrator integration omits `CouncilSessionStatus` and partial-advisor-failure paths, and no formal Sprint 1 validation report exists. Treating current tests as Step 1–3 completion would violate ADR-0006 §28 and INV-012. |
| **C-02** | Critical | **Minimum proof bar for live execution unresolved (OQ-001).** ENG-0003 defers to ARR-0002 whether mocked-provider integration tests alone suffice for architectural proof vs requiring live OpenRouter runs. IMP-0003 cannot define Done without this decision. |

### Major

| ID | Classification | Finding |
| -- | -------------- | ------- |
| **M-01** | Major | **Advisor failure-path contract under-tested.** Code returns failed `AdvisorResult` for missing model env (`advisor-runner.ts:134-142`), provider errors, and parse failures, but only chairman missing-env is unit-tested. Advisor-side paths are unverified. |
| **M-02** | Major | **Orchestrator hard-failure path untested.** `resolveAdvisorResult` throws when execution config is missing (`orchestrator.ts:25-27`), producing HTTP 500. ENG-0003 §14.9 documents this; no test confirms API mapping. |
| **M-03** | Major | **Partial-failure orchestration not proven end-to-end.** ENG-0003 §14.8 states chairman runs with failed advisors. Chairman-runner unit tests cover this; `orchestrator.integration.test.mjs` does not exercise mixed advisor success/failure or assert `result.status`. |
| **M-04** | Major | **No API-layer verification.** `POST /api/council` validation (400) and internal error (500) paths in `route.ts` have zero automated tests. |
| **M-05** | Major | **Step 4 baseline acceptance artifact undefined.** OQ-004 remains open. Without a mandated validation report format, Step 4 gate cannot be audited. |

### Minor

| ID | Classification | Finding |
| -- | -------------- | ------- |
| **m-01** | Minor | **Undocumented failure mode.** `runAdvisor` throws on persona/config ID mismatch (`advisor-runner.ts:126-129`) as generic `Error`. Not listed in ENG-0003 §14 failure semantics; would surface as HTTP 500. |
| **m-02** | Minor | **`determineCouncilSessionStatus` success count nuance.** `successfulCount` counts all advisors, not only `liveAdvisorIds` (`council-status.ts:11`). Harmless today (all five live); latent inconsistency if mock advisors are introduced. |
| **m-03** | Minor | **Unused prototype config flags.** `prototypeMode`, `prototypeAdvisorIds`, `prototypeChairman` in `councilConfig` are unread. Correctly deferred but may confuse operators (OQ-006). |
| **m-04** | Minor | **Historical assessment drift.** `DECISION_COUNCIL_ARCHITECTURE_ASSESSMENT.md` describes hybrid mock posture at `cc90061`. ADR-0006 and ENG-0003 correctly supersede for present-state facts; assessment recommendations (e.g. Phase 1 enable five advisors first) conflict with ADR-0006 sequencing — governance reconciled in ADR, not assessment. |
| **m-05** | Minor | **`council-status.test.mjs` uses simplified config.** Tests use `liveAdvisorIds: ["ADV-001"]` only, not production five-advisor config. |

### Observations

| ID | Classification | Finding |
| -- | -------------- | ------- |
| **O-01** | Observation | ChairmanContextBuilder pipeline certified in AIR-0001 / ICR-0002; Sprint 1 must not regress ENG-0002 contracts. |
| **O-02** | Observation | Layer separation (INV-007–INV-009) verified: prompt and parser modules do not import OpenRouter client. |
| **O-03** | Observation | No runtime mock path exists; `AdvisorSource: "mock"` is type-only. Aligns with ADR-0006 and ENG-0003. |
| **O-04** | Observation | ENG-0003 traceability chain is consistent with ADR-0006 §13. |
| **O-05** | Observation | ADR-0005 / ADR-0003 relationship reconciled in ENG-0002 §29 and ENG-0003 §20; no Sprint 1 conflict. |
| **O-06** | Observation | Retry loops, persistence, auth, streaming correctly deferred per ADR-0006 §6. |

---

## Detailed Review by Criterion

### 1. Architectural completeness

**Assessment:** The execution architecture is **structurally complete** in code. All layers required by ADR-0006 Steps 1–3 exist: validation, orchestration, advisor execution, chairman context construction, chairman execution, result assembly. Missing elements are **validation artifacts and test coverage**, not architectural components.

### 2. Specification quality

**Assessment:** ENG-0003 is comprehensive: purpose, scope, current state, target flow, component contracts, invariants, failure semantics, and open questions. Deductions for undocumented persona mismatch throw and reliance on test inventory without pass/fail status per Step.

### 3. Component boundaries

**Assessment:** **Pass.** Orchestrator coordinates; runners execute; builders prepare context; prompt builders serialize; parsers validate; provider client transports. No reverse dependencies observed.

### 4. Execution pipeline

**Assessment:** **Pass in code.** End-to-end path verified from `route.ts` → `runCouncil` → parallel `runAdvisor` → `runChairman` → `CouncilResult`. Parallel advisors, sequential chairman preserved.

### 5. Contracts

**Assessment:** **Pass.** Canonical types in `src/types/council.ts` match ENG-0003 §12. ChairmanContext types in `chairman-context.types.ts` align with ENG-0002.

### 6. Error handling

**Assessment:** **Pass with gaps.** Graceful degradation for advisor/chairman provider and parse failures confirmed. Orchestrator and persona mismatch throws create HTTP 500 paths that lack tests and partial ENG documentation.

### 7. Execution invariants

**Assessment:** See invariant matrix below. Code supports INV-001–INV-011 and INV-014. INV-012 intentionally **not satisfied** until Step 4. INV-013 satisfied by absence of deferred features.

### 8. ChairmanContextBuilder integration

**Assessment:** **Pass.** `runChairman` invokes `defaultChairmanContextBuilder.build` before `buildChairmanPrompts`. Tests in `chairman-context-builder.test.mjs` and `chairman-runner.test.mjs` provide strong evidence. AIR-0001 / ICR-0002 certify prior delivery.

### 9. Advisor execution architecture

**Assessment:** **Pass in structure.** Single `runAdvisor` with persona router satisfies ADR-0005 freeze. Validation evidence incomplete (C-01, M-01).

### 10. Chairman execution architecture

**Assessment:** **Pass.** Live chairman path with context builder consumption of full `AdvisorResult[]`. Stronger test coverage than advisor runner.

### 11. Orchestrator responsibilities

**Assessment:** **Pass.** Orchestrator does not call providers or build prompts. Gap: partial-failure and status assembly not integration-tested (M-03).

### 12. Evidence required for each invariant

**Assessment:** ENG-0003 §16 maps artifacts but overstates readiness. See Required Evidence Matrix below.

### 13. Mock/live assumptions

**Assessment:** **Pass.** Runtime is live-only. Test mocks use `globalThis.fetch` fixtures — not production mock execution. INV-010 satisfied.

### 14. Deferred scope

**Assessment:** **Pass.** ADR-0006 §6 and ENG-0003 §3 consistently defer persistence, auth, streaming, deployment, collective intelligence beyond builder placeholder.

### 15. Governance compliance

**Assessment:** Traceability chain OPS-0001 → ADR-0006 → ENG-0003 → ARR-0002 is intact. ADR-0006 Accepted; ENG-0003 Proposed pending this review.

### 16. OPS compliance

**Assessment:** Documentation-driven engineering followed. ARR precedes IMP per OPS-0001 §4. This review satisfies the ARR gate for Sprint 1 validation planning.

### 17. ADR compliance

**Assessment:** ENG-0003 implements ADR-0006 sequencing. No rewrite authorized. ADR-0003 and ADR-0005 preserved. Step 4 framed as governance acceptance gate — correct.

### 18. ENG compliance

**Assessment:** ENG-0003 accurately describes current code. Minor gap: §14 omits persona mismatch throw (m-01).

### 19. Architectural risks

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| Declaring baseline accepted without evidence | High | INV-012; Step 4 gate; IMP validation report |
| Advisor failures undetected in CI | Medium | IMP must add advisor-runner and partial-failure tests |
| Live provider behavior differs from mocks | Medium | ARB resolves OQ-001 in IMP scope |
| Orchestrator 500 on config error vs advisor graceful failure | Low | Document and test (OQ-003) |
| Assessment doc misread as current state | Low | ADR-0006 §1 historical note — sufficient |

### 20. Implementation readiness

**Assessment:** **Ready for validation implementation planning**, not ready for Step 4 baseline certification. Architecture stable; evidence production is the Sprint 1 deliverable.

---

## Invariant Validation Matrix

| Invariant | Current evidence | Required validation | Ready? | Result |
| --------- | ---------------- | ------------------- | ------ | ------ |
| **INV-001** — Single generic `runAdvisor` | `advisor-runner.ts`; orchestrator invokes all five IDs | Direct or integration test per persona through `runAdvisor`; documented in validation report | Partial | **PASS** (code); **FAIL** (evidence incomplete) |
| **INV-002** — Router-driven persona behavior | `advisor-response-router.ts`; per-persona advisor tests | Confirm no duplicate runners; regression suite pass | Yes | **PASS** |
| **INV-003** — Parse before Chairman | Parsers in `runAdvisor` before return | Parser tests + integration assert parsed fields on results | Partial | **PASS** (code); **FAIL** (orchestrator partial) |
| **INV-004** — Chairman consumes `AdvisorResult[]` | `runChairman(decisionContext, advisors)` | `chairman-runner.test.mjs`; integration prompt content checks | Yes | **PASS** |
| **INV-005** — Separate chairman runner | `chairman-runner.ts` separate from `advisor-runner.ts` | Unit tests; shared `callOpenRouter` only | Yes | **PASS** |
| **INV-006** — Orchestrator owns sequencing | `runCouncil` only coordinator | Integration test asserts order, parallel advisors, chairman after advisors | Partial | **PASS** (code); **FAIL** (partial integration) |
| **INV-007** — Prompt builders no providers | No OpenRouter imports in prompt modules | Static review + lint | Yes | **PASS** |
| **INV-008** — Provider client transport-only | `openrouter/client.ts` | No council imports from client into domain logic | Yes | **PASS** |
| **INV-009** — Parsers no provider calls | Parser modules pure | Static review | Yes | **PASS** |
| **INV-010** — Mock not live evidence | No runtime mock path | Confirm no `source: "mock"` in production code path | Yes | **PASS** |
| **INV-011** — Deterministic partial failure | `determineCouncilSessionStatus`; failed result objects | Unit tests + **required:** orchestrator partial-failure integration test | Partial | **PASS** (unit); **FAIL** (E2E) |
| **INV-012** — Baseline not accepted until evidence | Five-live config exists; no acceptance artifact | Step 4 validation report; ARB/architect sign-off | No | **FAIL** (by design — gate open) |
| **INV-013** — No deferred feature redesign | No persistence/auth/streaming in pipeline | Scope review in IMP | Yes | **PASS** |
| **INV-014** — ChairmanContextBuilder preserved | Wired in `runChairman`; AIR-0001 approved | Regression tests; no ENG-0002 contract changes | Yes | **PASS** |

**Summary:** 8 invariants **PASS** fully; 4 **PASS** in code but **FAIL** on required Sprint 1 evidence; 1 (**INV-012**) **FAIL** by design until Step 4.

---

## Required Evidence Matrix

| ADR-0006 step | Required evidence (ARB) | Existing artifact | Gap |
| ------------- | ------------------------ | ----------------- | --- |
| **Step 1** — Advisor execution | All five personas execute through `runAdvisor`; advisor failure paths tested; validation report section | Router/parser tests; mocked integration | No `advisor-runner.test.mjs`; no advisor missing-env test; no live-run policy (OQ-001) |
| **Step 2** — Chairman execution | Builder + runner + parser tests; chairman failure degradation | `chairman-*.test.mjs` | Live chairman optional per OQ-001 |
| **Step 3** — Orchestration | E2E integration with status assertions; partial failure; API 400/500 if in scope | `orchestrator.integration.test.mjs` (happy + chairman fail) | No `result.status` assert; no partial advisor failure; no API tests |
| **Step 4** — Baseline acceptance | Formal validation report; per-advisor evidence; governance sign-off | None | **Not started** — correct per ADR-0006 |

---

## Executive Scorecard

| Dimension | Score | Justification |
| --------- | ----- | ------------- |
| **Architecture completeness** | **9/10** | Full live pipeline implemented; boundaries clean. Deduction for orchestrator throw inconsistency and unused config flags. |
| **Specification maturity** | **8/10** | ENG-0003 thorough; minor failure-semantics gap; OQ-001/OQ-004 block operational clarity. |
| **Risk** | **6/10** | Structural risk low; **evidence risk moderate** — premature baseline acceptance is the primary threat. |
| **Implementation readiness** | **7/10** | Ready to **plan and execute validation**; not ready to **certify baseline** or expand features. |
| **Governance compliance** | **8/10** | ADR/ENG/OPS aligned; ENG still Proposed; assessment historical conflict documented. |
| **Overall recommendation** | **PASS WITH OBSERVATIONS** | Validation sprint may proceed under IMP-0003 with mandatory evidence closures. |

---

## Blocking Observations (resolve in IMP-0003)

1. **Resolve OQ-001:** Define minimum proof bar (mocked integration only vs required live OpenRouter smoke runs per advisor/chairman).
2. **Define Step 4 artifact (OQ-004):** Validation report template with per-step pass/fail and per-advisor evidence table.
3. **Add advisor-runner and partial-failure test requirements** to IMP deliverables (addresses C-01, M-01, M-03).
4. **Document persona mismatch throw** in ENG addendum or IMP failure matrix (m-01).
5. **Clarify API route test scope** — minimal 400/500 contract tests or explicit deferral with rationale (M-04).

---

## IMP-0003 Required Contents

If implementation proceeds, IMP-0003 **must** contain at minimum:

1. **Scope statement** — Sprint 1 validation only; no architectural rewrite; no five-live **introduction** (already exists); focus on evidence production.
2. **OQ-001 decision** — Mocked vs live OpenRouter proof criteria and Definition of Done for Steps 1–3.
3. **Validation report deliverable** — Format, owner, storage path, and Step 4 acceptance checklist (OQ-004).
4. **Test plan** — Explicit cases for: `runAdvisor` missing env; provider timeout; parse failure; orchestrator partial advisor failure with `result.status`; optional API route 400/500; chairman failure with partial advisors.
5. **Execution sequence** — Ordered tasks mapped to ADR-0006 Steps 1–3; Step 4 gated separately.
6. **Environment matrix** — Required env vars for CI and optional live validation (OQ-008).
7. **Regression gates** — Full `npm test`, lint, build; no ENG-0002 regression.
8. **Prohibited changes list** — From ENG-0003 §21.
9. **Rollback strategy** — Test-only and documentation changes revert cleanly; no production config changes unless explicitly approved.
10. **Definition of Done** — Per-step evidence linked to invariant matrix; INV-012 remains open until Step 4 review.
11. **OQ-002 disposition** — Whether isolated validation uses test-only subset controls without changing production five-live architecture.
12. **OQ-003 disposition** — Orchestrator throw on missing config: preserve, test, or align with graceful failure.

IMP-0003 must **not** duplicate ENG-0003 architecture; it defines **how** validation is executed.

---

## Readiness Checklist

```text
ADR-0006 approved                         ✅
ENG-0003 complete for planning            ✅ (Proposed; sufficient post-ARR)
Scope controlled                          ✅
Interfaces defined                        ✅
Testing defined                           ⚠️  (gaps identified; IMP must close)
Coupling acceptable                       ✅
Execution invariants (code)               ✅
Validation evidence (Steps 1–3)           ❌  (IMP deliverable)
Step 4 baseline acceptance                ❌  (intentionally deferred)
Ready for validation implementation       YES, with observations
Ready for feature expansion               NO
```

---

## Final Decision

## **PASS WITH OBSERVATIONS**

**Justification:** The Sprint 1 execution architecture is **implemented and correctly specified**. ADR-0006 and ENG-0003 form a coherent validation strategy aligned with repository evidence. The ARB rejects premature baseline acceptance (INV-012) and rejects treating existing tests as complete Step 1–3 proof (C-01).

A **FAIL** is **not warranted**: no architectural contradiction, no missing layer, no unauthorized rewrite requirement, and no blocking design ambiguity that requires a new ADR.

Implementation **may proceed** to IMP-0003 and subsequent Sprint 1 validation execution, subject to the blocking observations and required IMP contents above. Step 4 baseline certification **may not** proceed until IMP-defined evidence is produced and independently reviewed.

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0006 — Sprint 1 Architecture Validation Strategy](../adr/ADR-0006-sprint-1-architecture-validation-strategy.md)
- [ENG-0003 — Sprint 1 Execution Architecture](../eng/ENG-0003-sprint-1-execution-architecture.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [ARR-0001 — Architecture Readiness Review (Sprint 6)](../arr/ARR-0001-architecture-readiness-review.md)
- [Documentation Index](../README.md)

---

*This review evaluated architecture, specifications, and repository evidence. No implementation code was modified.*
