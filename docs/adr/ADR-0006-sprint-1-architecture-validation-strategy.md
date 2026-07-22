# ADR-0006 — Sprint 1 Architecture Validation Strategy

**Status:** Accepted
**Date:** 2026-07-22
**Author:** Tulio Tavernaro
**Sprint:** Sprint 1
**Related Operations Standard:** OPS-0001 — Engineering Workflow Standard
**Related Architecture Decisions:** ADR-0003 — Collective Intelligence Layer; ADR-0005 — Decision Council Advisors v1.0

---

# 1. Context

The Prodignus Decision Council implements a multi-agent executive decision system in which independent domain Advisors produce structured assessments and a Chairman produces the final executive recommendation.

Verified current repository evidence confirms that the execution architecture is **already implemented** as a live-only pipeline:

* all five Advisors (ADV-001..ADV-005) are configured for live execution through a generic `runAdvisor` mechanism;
* a live Chairman execution mechanism exists through `runChairman`;
* `DefaultChairmanContextBuilder` integrates Advisor outputs into Chairman execution;
* end-to-end orchestration exists through `runCouncil`;
* no runtime mock Advisor or mock Chairman execution path exists under `src/`.

The root architecture assessment (`DECISION_COUNCIL_ARCHITECTURE_ASSESSMENT.md`, commit `cc90061`) remains valid **historical evidence** for architectural observations at that baseline. Verified current source code supersedes it **only for present-state implementation facts**. Where the assessment described a hybrid mock posture, that description no longer applies to the current repository.

A read-only architecture assessment concluded that the repository presents a **solid architectural foundation**. Remaining gaps are primarily **validation evidence**, not structural deficiency. The highest architectural uncertainty is whether the **end-to-end execution pipeline** — Advisor execution, Chairman execution, and orchestration contracts — has been **formally validated** as a cohesive system.

**Existing implementation does not count as validated merely because it exists.** Configuration of five live Advisors is not itself evidence of architectural correctness.

Sprint 1 follows the completion of Advisor layer stabilization under ADR-0005 and precedes broader collective-intelligence evolution defined in ADR-0003. Sprint 1 must therefore establish architectural confidence in the execution path through evidence rather than maximize feature delivery.

---

# 2. Problem Statement

The repository implements a five-live-Advisor execution path with a live Chairman and complete orchestration. However, Sprint 1 has not yet produced sufficient **formal validation evidence** that this pipeline operates correctly end-to-end under the approved architectural contracts.

Treating existing configuration or implementation as proof of correctness creates architectural risk:

* pipeline defects may remain undetected until broader feature expansion begins;
* orchestration contract gaps may be discovered only under operational load;
* Chairman integration failures may be misattributed to individual Advisor issues;
* engineering effort may shift to new features before execution depth is proven.

The problem is not architectural invalidity and not absence of execution components. The problem is **insufficient validated evidence** that the existing architecture executes correctly end-to-end and may be accepted as the architectural baseline.

---

# 3. Decision

Sprint 1 is designated an **architecture-validation sprint**.

Sprint 1 shall prioritize validating the existing Decision Council **execution architecture** and producing evidence sufficient to accept or reject it as the architectural baseline.

No architectural rewrite is authorized. Validation shall exercise the existing architecture through controlled, evidence-driven review.

The approved validation sequence for Sprint 1 is:

```text
1. Validate the existing generic Advisor execution mechanism
         │
         ▼
2. Validate the existing generic Chairman execution mechanism
         │
         ▼
3. Validate the complete existing orchestration pipeline and its contracts
         │
         ▼
4. After validation evidence is accepted, certify the current five-live-Advisor
   pipeline as the architectural baseline and authorize further execution breadth
   or feature expansion
```

Step 4 is a **governance and architecture-acceptance gate**, not a runtime configuration switch. It is intentionally deferred until Steps 1–3 produce acceptable validation evidence.

---

# 4. Decision Drivers

* Verified current source code confirms the execution pipeline is already implemented as live-only.
* The architecture assessment rated the existing structure as fundamentally sound and suitable for incremental evolution.
* Architectural uncertainty is concentrated in **validation evidence**, not in missing layer design.
* Existing configuration of five live Advisors does not substitute for formal architectural proof.
* Breadth or feature expansion before pipeline validation increases diagnostic complexity and rework risk.
* ADR-0005 establishes a stable Advisor v1.0 baseline that should be exercised, not bypassed.
* ADR-0003 defines future collective-intelligence evolution that depends on a validated execution foundation.
* OPS-0001 requires evidence over assumptions and incremental evolution over disruptive rewrites.

---

# 5. Scope

Sprint 1 scope under this ADR is limited to **architectural validation of the execution path**.

In scope:

* validating the existing generic Advisor execution mechanism consistent with ADR-0005;
* validating the existing generic Chairman execution mechanism that consumes pipeline inputs;
* validating orchestration flow, domain contracts, and failure semantics across the complete pipeline;
* producing objective evidence that the existing architecture executes correctly before baseline acceptance;
* minimal supporting changes required solely to observe or verify pipeline behavior.

Out of scope unless strictly required for minimal validation:

* persistence and session history;
* authentication and authorization;
* streaming and progressive response delivery;
* advanced observability beyond what is necessary to confirm pipeline behavior;
* UI expansion beyond what is necessary to trigger and observe validation;
* production deployment and operational hardening.

---

# 6. Deferred Scope

The following capabilities are explicitly deferred beyond Sprint 1 unless a downstream artifact demonstrates that minimal validation cannot proceed without them:

| Capability | Rationale for deferral |
| ---------- | ---------------------- |
| Five-live-Advisor pipeline accepted as architectural baseline | Deferred until Step 4 governance gate after Steps 1–3 validation |
| Further execution breadth or feature expansion beyond validated baseline | Deferred until Step 4 acceptance |
| Persistence / history | Not required to prove execution architecture |
| Authentication | Not required to prove orchestration contracts |
| Streaming / SSE | Observability enhancement, not pipeline proof |
| Advanced observability | Beyond minimal validation evidence |
| UI expansion | Presentation work must not drive architectural sequencing |
| Production deployment | Validation sprint precedes operational rollout |
| Collective Intelligence Layer capabilities beyond existing approved work | Governed by ADR-0003; not Sprint 1 validation scope |

Deferred scope remains valid future work. Deferral under this ADR does not constitute rejection of those capabilities.

---

# 7. Consequences

## 7.1 Positive Consequences

* architectural uncertainty is reduced before further execution breadth or feature expansion;
* defects are isolated through structured validation rather than discovered during expansion;
* the existing orchestrator, runner, and contract model are validated against evidence;
* ADR-0005 Advisor v1.0 stability is preserved and exercised through the generic execution path;
* future ENG, ARR, and IMP artifacts can proceed with a validated baseline;
* incremental evolution remains aligned with OPS-0001 and the architecture assessment recommendation.

## 7.2 Negative Consequences and Trade-offs

* Sprint 1 will not prioritize new feature delivery over validation evidence;
* some stakeholders may perceive reduced feature velocity during validation;
* validation sequencing may delay authorization of further expansion;
* additional governance artifacts may be required before baseline acceptance.

These trade-offs are intentional. Validation depth is prioritized over feature maximization in Sprint 1.

---

# 8. Risks and Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Validation scope expands into feature delivery | Sprint 1 loses architectural focus | Enforce scope and deferred-scope tables; require explicit ADR amendment to expand |
| Pipeline validation is declared complete without evidence | Premature baseline acceptance or expansion | Define acceptance criteria before implementation planning begins |
| Chairman validation is skipped in favor of new features | Executive synthesis remains unproven | Sequence Chairman validation before baseline authorization |
| Existing implementation mistaken for proof | False confidence in pipeline health | Require documented validation evidence; distinguish configuration from acceptance |
| Pressure to authorize expansion before Step 4 gate | Rework and misdiagnosis under breadth | Record deferral in this ADR; refer expansion to Step 4 gate |
| Validation work drifts into architectural redesign | Violates no-rewrite constraint | Changes must preserve existing layer boundaries and approved ADRs |

---

# 9. Alternatives Considered

## Alternative A — Accept Existing Pipeline Without Formal Validation

**Rejected.**

This approach treats implemented configuration as proof of architectural correctness before the generic Advisor runner, Chairman execution path, and orchestration contracts are validated as a system. Defects would be harder to isolate and remediate.

---

## Alternative B — Authorize an Architectural Rewrite

**Rejected.**

The architecture assessment and ADR-0003 both conclude that the current structure is fundamentally sound. A rewrite would violate OPS-0001 incremental-evolution principles and introduce unnecessary delivery risk.

---

## Alternative C — Sprint 1 as Feature-Maximization Sprint

**Rejected.**

Prioritizing UI, persistence, streaming, or deployment breadth before pipeline validation would increase architectural uncertainty rather than reduce it.

---

## Alternative D — Architecture-Validation Sprint with Sequenced Execution Proof

**Accepted.**

Validate the existing generic Advisor execution, generic Chairman execution, and orchestration contracts first. Certify the current five-live-Advisor pipeline as the architectural baseline only after validation evidence is accepted.

---

# 10. Compatibility with Existing ADRs

## ADR-0003 — Collective Intelligence Layer

**Remains valid.**

ADR-0003 defines the long-term evolution toward a Collective Intelligence Layer and ChairmanContextBuilder. ADR-0006 does not modify, supersede, or replace that decision.

ADR-0006 establishes that Sprint 1 must first validate the underlying execution pipeline upon which future collective-intelligence capabilities depend.

---

## ADR-0005 — Decision Council Advisors v1.0

**Remains valid.**

ADR-0005 freezes Advisor prompts, response contracts, structured output schemas, parser architecture, and Advisor routing except for bug fixes.

Sprint 1 validation shall exercise the existing Advisor v1.0 architecture through the generic execution mechanism. ADR-0006 does not authorize Advisor-layer redesign.

---

## Relationship Summary

ADR-0006 **refines implementation sequencing** of the existing architecture. It does not replace the collective-intelligence architecture decision or the Advisor v1.0 architecture decision.

---

# 11. Acceptance Criteria

Sprint 1 architectural validation may be considered complete only when all criteria below are satisfied:

1. The existing generic Advisor execution mechanism is validated and demonstrated against live execution evidence.
2. The existing generic Chairman execution mechanism is validated and demonstrated to consume pipeline inputs correctly.
3. The complete orchestration pipeline executes end-to-end with validated domain contracts and understood failure semantics.
4. Validation evidence is documented and reviewable without requiring code inspection alone.
5. No architectural rewrite was performed; existing layer boundaries and approved ADRs remain intact.
6. The five-live-Advisor pipeline has not been accepted as the architectural baseline unless Steps 1–3 acceptance criteria are met and Step 4 governance gate is satisfied.

Detailed validation methods, file-level changes, test plans, and deliverables are **not** defined in this ADR. Those belong in downstream ENG, ARR, and IMP artifacts.

---

# 12. References

| Reference | Role |
| --------- | ---- |
| [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md) | Governance and lifecycle standard |
| [ADR-0003 — Collective Intelligence Layer](./ADR-0003-collective-intelligence-layer.md) | Collective-intelligence architecture baseline |
| [ADR-0005 — Decision Council Advisors v1.0](./ADR-0005-decision-council-advisors-v1.md) | Advisor layer stability baseline |
| [DECISION_COUNCIL_ARCHITECTURE_ASSESSMENT.md](../../DECISION_COUNCIL_ARCHITECTURE_ASSESSMENT.md) | Historical architecture assessment (commit `cc90061`); superseded for present-state execution facts only |

---

# 13. Traceability

```text
OPS-0001 (workflow)
      │
      ▼
ADR-0003 (Collective Intelligence Layer — long-term architecture)
      │
      ▼
ADR-0005 (Decision Council Advisors v1.0 — Advisor architecture baseline)
      │
      ▼
ADR-0006 (Sprint 1 Architecture Validation Strategy) ← this document
      │
      ▼
ENG-0003 (Sprint 1 Execution Architecture)
      │
      ▼
ARR-0002 (Sprint 1 Architecture Readiness Review — future)
      │
      ▼
IMP-0003 (Sprint 1 Implementation Plan — future)
      │
      ▼
Implementation
      │
      ▼
AIR / ICR (future)
```

This ADR authorizes the **sequencing decision** for Sprint 1. It does not authorize implementation to begin without the downstream artifacts required by OPS-0001.

---

# 14. Decision

**Accepted.**

Sprint 1 shall prioritize validation of the existing Decision Council execution architecture and production of evidence sufficient to accept or reject it as the architectural baseline.

The validation sequence defined in Section 3 is binding for Sprint 1 architectural work.

No architectural rewrite is authorized.

ADR-0003 and ADR-0005 remain in full effect.

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0003 — Collective Intelligence Layer](./ADR-0003-collective-intelligence-layer.md)
- [ADR-0005 — Decision Council Advisors v1.0](./ADR-0005-decision-council-advisors-v1.md)
- [Documentation Index](../README.md)
