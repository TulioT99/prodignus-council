# OPS-0001 — Engineering Workflow Standard

**Status:** Approved
**Version:** 1.0
**Date:** 2026-07-21
**Owner:** Prodignus Engineering
**Applies To:** All repositories within the Prodignus ecosystem

---

# 1. Purpose

This document defines the official engineering workflow for designing, implementing, validating, and maintaining software within the Prodignus platform.

Its purpose is to ensure that every significant engineering change follows a consistent, traceable, and reviewable lifecycle, minimizing implementation risk while preserving architectural integrity.

This workflow applies equally to application code, platform infrastructure, AI components, and engineering tooling.

---

# 2. Engineering Philosophy

Prodignus follows a **Documentation-Driven Engineering** approach.

Major engineering decisions are made before implementation begins.

Documentation is not a by-product of development—it is an integral part of the engineering process.

The architecture defines the destination.

Engineering specifications define the implementation contract.

Implementation executes an approved plan.

Reviews verify compliance.

---

# 3. Engineering Principles

Every engineering activity shall follow these principles.

## 3.1 Architecture First

Implementation shall never precede architectural decisions.

---

## 3.2 Documentation Before Code

Every significant feature shall be documented before implementation begins.

---

## 3.3 Evidence Over Assumptions

Engineering decisions shall be based on repository evidence, architectural reasoning, and documented requirements.

Implementation must never rely on undocumented assumptions.

---

## 3.4 Incremental Evolution

Architectural evolution shall occur through small, reviewable increments.

Large-scale rewrites should be avoided unless explicitly approved.

---

## 3.5 Separation of Concerns

Architecture, engineering, implementation, and operations represent distinct responsibilities.

No artifact should attempt to replace another.

---

## 3.6 Traceability

Every implementation shall be traceable back to an approved architectural decision.

No code should exist without a documented rationale.

---

# 4. Engineering Lifecycle

Every major feature follows the lifecycle below.

```text
Business Need
      │
      ▼
Architecture Decision (ADR)
      │
      ▼
Engineering Specification (ENG)
      │
      ▼
Architecture Readiness Review (ARR)
      │
      ▼
ENG Revision (when required)
      │
      ▼
Implementation Plan (IMP)
      │
      ▼
Implementation
      │
      ▼
Architecture Implementation Review (AIR)
      │
      ▼
Implementation Completion Report (ICR)
      │
      ▼
Merge
      │
      ▼
Release
```

Code review and testing provide evidence during **Implementation** and must pass before **Merge** authorization.

No phase should be skipped without explicit approval.

---

# 5. Engineering Artifacts

## ADR — Architecture Decision Record

Purpose:

Capture architectural decisions.

Answers:

* Why?
* Why this approach?
* What alternatives were rejected?

Output:

Architectural baseline.

---

## ENG — Engineering Specification

Purpose:

Describe the engineering implementation contract.

Answers:

* What shall be built?
* Interfaces
* Contracts
* Invariants
* Testing
* Constraints

Output:

Implementation-ready specification.

---

## ARR — Architecture Readiness Review

Purpose:

Verify implementation readiness before coding begins.

Answers:

* Is the architecture complete?
* Is the specification consistent?
* Are interfaces unambiguous?
* Are risks understood?

Possible outcomes:

* PASS
* PASS WITH RECOMMENDATIONS
* FAIL

---

## IMP — Implementation Plan

Purpose:

Describe exactly how the implementation will be executed.

Contents include:

* implementation sequence;
* file modifications;
* validation gates;
* rollback strategy;
* deliverables;
* Definition of Done.

---

## AIR — Architecture Implementation Review

Purpose:

Verify that the completed implementation conforms to the approved architecture.

Answers:

* Did the implementation faithfully realize the approved architecture?
* Are architectural boundaries, coupling, and responsibilities preserved?

Focus:

* compliance;
* coupling;
* responsibilities;
* maintainability;
* architectural integrity.

Possible outcomes:

* APPROVED
* APPROVED WITH MINOR OBSERVATIONS
* REJECTED

Output:

Formal architectural compliance assessment.

---

## ICR — Implementation Completion Report

Purpose:

Certify that the implementation team delivered everything committed in the approved Implementation Plan.

Answers:

* Did the implementation team complete all mandatory deliverables?
* Do tests, lint, and build evidence support merge readiness?

Contents include:

* deliverable status;
* files created and modified;
* testing summary;
* deferred items;
* Definition of Done verification;
* final implementation certification.

Output:

Implementation delivery certification from the engineering team.

---

## Code Review

Purpose:

Verify code quality and correctness.

Focus:

* readability;
* correctness;
* standards;
* security;
* maintainability.

---

## Testing

Purpose:

Provide objective evidence that the implementation satisfies the engineering contract.

Testing includes:

* unit;
* integration;
* regression;
* architectural invariants.

---

# 6. Governance Gates

Every feature passes through formal decision gates.

| Gate                | Required Outcome                  |
| ------------------- | --------------------------------- |
| ADR                 | Approved                          |
| ENG                 | Complete                          |
| ARR                 | PASS or PASS WITH RECOMMENDATIONS |
| IMP                 | Approved                          |
| AIR                 | APPROVED                          |
| ICR                 | Published                         |
| Code Review         | Approved                          |
| Testing             | Passing                           |
| Merge               | Authorized                        |

A FAIL at any gate blocks progression until resolved.

---

# 7. Roles and Responsibilities

## Human Product & Architecture Owner

Responsibilities:

* define business objectives;
* approve architecture;
* make strategic decisions;
* authorize implementation;
* approve releases.

Authority:

Final decision maker.

---

## ChatGPT

Responsibilities:

* architectural design;
* systems thinking;
* engineering documentation;
* specification development;
* governance;
* architecture reviews;
* implementation planning;
* executive technical review.

ChatGPT does not modify production code directly.

---

## Cursor

Responsibilities:

* implement approved specifications;
* maintain repository conventions;
* execute implementation plans;
* generate tests;
* refactor code;
* produce implementation reports.

Cursor shall not redesign architecture without approval.

---

## Repository

Responsibilities:

* maintain source of truth;
* preserve history;
* provide traceability;
* enforce version control.

---

# 8. Repository Standards

Every engineering artifact shall reside in a clearly defined location.

Example structure:

```text
docs/
    adr/
    eng/
    arr/
    imp/
    air/
    icr/
    ops/
```

Each artifact shall have:

* unique identifier;
* title;
* status;
* version;
* author;
* references;
* revision history (when applicable).

---

# 9. Traceability Standard

Every engineering change shall support bidirectional traceability.

```
ADR
 ↓
ENG
 ↓
ARR
 ↓
ENG Revision (when required)
 ↓
IMP
 ↓
Implementation
 ↓
AIR
 ↓
ICR
 ↓
Merge
```

Every implementation should answer:

* Which ADR authorized this change?
* Which ENG defines it?
* Which IMP governed execution?
* Which tests verify it?
* Which AIR certified architectural compliance?
* Which ICR certified delivery completion?

---

# 10. Definition of Ready

Implementation may begin only when:

* architecture approved;
* engineering specification complete;
* ARR passed;
* implementation plan approved;
* repository understood;
* scope controlled;
* dependencies identified.

---

# 11. Definition of Done

A feature is complete only when:

* implementation finished;
* architecture preserved;
* documentation updated;
* tests passing;
* code reviewed;
* AIR approved;
* ICR published;
* merge approved;
* traceability maintained.

Code completion alone is insufficient.

---

# 12. Documentation Standards

Engineering documentation shall be:

* concise;
* technically precise;
* version controlled;
* repository-aligned;
* implementation-oriented;
* free of speculative design.

Every document should answer one primary question.

Avoid overlapping responsibilities between artifacts.

---

# 13. Change Management

Architectural changes require a new ADR.

Engineering changes require ENG updates.

Implementation-only improvements may proceed without new architecture provided they do not alter approved design.

If implementation reveals an architectural inconsistency:

1. Stop implementation.
2. Produce an Architecture Exception Report.
3. Review the architecture.
4. Update documentation before continuing.

---

# 14. Quality Standards

Engineering quality is measured by:

* architectural clarity;
* low coupling;
* high cohesion;
* deterministic behavior;
* explicit contracts;
* comprehensive testing;
* maintainability;
* extensibility;
* operational simplicity.

Optimization is secondary to correctness.

---

# 15. Engineering Metrics

Every major implementation should be evaluated using:

| Metric                   | Target   |
| ------------------------ | -------- |
| Architecture Compliance  | 100%     |
| Test Success             | 100%     |
| Documentation Coverage   | 100%     |
| Traceability             | Complete |
| Critical Defects         | 0        |
| Architectural Violations | 0        |

These metrics support continuous improvement rather than individual performance evaluation.

---

# 16. Continuous Improvement

The engineering workflow is itself an evolving system.

After each significant implementation, the team should perform a retrospective to identify:

* improvements to governance;
* documentation refinements;
* reusable patterns;
* automation opportunities;
* lessons learned.

Changes to this workflow shall be documented through new operational standards or updated versions of this document.

---

# 17. Engineering Culture

Prodignus engineering values:

* thoughtful design over rapid coding;
* clarity over cleverness;
* evidence over opinion;
* consistency over novelty;
* incremental evolution over disruptive rewrites;
* documentation as a first-class engineering artifact;
* architecture as a long-term investment.

Technology choices may evolve.

Engineering discipline shall remain constant.

---

# 18. Final Statement

The objective of this workflow is not to increase process overhead.

Its objective is to make every important engineering decision understandable, reproducible, reviewable, and maintainable throughout the lifetime of the Prodignus platform.

Every artifact contributes a distinct responsibility:

* **ADR** explains **why** a decision exists.
* **ENG** defines **what** must be built.
* **ARR** determines whether the design is ready.
* **IMP** defines **how** implementation will proceed.
* **AIR** verifies architectural compliance of the completed implementation.
* **ICR** certifies implementation delivery against the approved plan.
* **Code Review** verifies implementation quality.
* **Testing** provides objective evidence of correctness.

Together, these artifacts form the engineering operating system for Prodignus, enabling a small team to build software with the rigor, traceability, and long-term maintainability expected of enterprise-scale platforms.

---

## Related Documentation

- [Documentation Index](../README.md)
- [ADR-0003 — Collective Intelligence Layer](../adr/ADR-0003-collective-intelligence-layer.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [ARR-0001 — Architecture Readiness Review](../arr/ARR-0001-architecture-readiness-review.md)
- [IMP-0002 — ChairmanContextBuilder Implementation Plan](../imp/IMP-0002-chairman-context-builder-implementation-plan.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
