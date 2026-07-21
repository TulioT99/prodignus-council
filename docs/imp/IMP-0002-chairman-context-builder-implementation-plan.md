# IMP-0002 — ChairmanContextBuilder Implementation Plan

**Status:** Approved for Implementation
**Version:** 1.0
**Date:** 2026-07-21
**Sprint:** Sprint 6
**Priority:** High
**Implementation Type:** Architectural Refactoring (Behavior Preserving)

---

# 1. Purpose

This Implementation Plan defines the execution strategy for introducing the **ChairmanContextBuilder**, the first component of the Collective Intelligence Layer defined in ADR-0003 and specified in ENG-0002 Revision 1.

Unlike ADR-0003 and ENG-0002, this document is **execution-oriented**.

Its purpose is to guide implementation in a deterministic, low-risk sequence while preserving existing Chairman behavior.

---

# 2. References

Architecture

* ADR-0003 — Collective Intelligence Layer

Engineering

* ENG-0002 Rev.1 — ChairmanContextBuilder Technical Specification

Governance

* ARR-0001 — Architecture Readiness Review

---

# 3. Objective

Implement the ChairmanContextBuilder without changing external Council behavior.

At the end of PR-2:

* every Advisor field reaches the Chairman;
* DecisionContext remains unchanged;
* prompt generation depends on ChairmanContext;
* Chairman continues producing equivalent executive decisions;
* no new intelligence capabilities are introduced.

---

# 4. Scope

## Included

* ChairmanContextBuilder
* ChairmanContext model
* composite builder input
* pipeline refactoring
* prompt integration
* repository-aligned tests
* documentation updates

## Excluded

* Consensus
* Conflict Detection
* Confidence Aggregation
* Advisor Reputation
* Memory
* Executive Briefing
* Prompt optimization
* Token optimization
* Performance optimization

---

# 5. Success Criteria

Implementation is considered complete only if:

* all tests pass;
* existing Council functionality is preserved;
* every Advisor field reaches the Chairman;
* no information loss occurs;
* no architectural rules from ADR-0003 are violated.

---

# 6. Implementation Principles

The implementation shall follow these principles:

1. Preserve behavior.
2. Introduce architecture incrementally.
3. Keep commits small and reviewable.
4. Maintain repository conventions.
5. Avoid speculative abstractions.
6. Prefer deterministic implementations.
7. Do not redesign unrelated components.

---

# 7. Implementation Sequence

Implementation shall be performed in the following order.

---

## Phase 1 — Repository Assessment

Review the current implementation.

Confirm:

* current Chairman execution flow;
* DecisionContext definition;
* AdvisorResult definition;
* prompt generation flow;
* existing tests.

Deliverable:

Implementation checklist confirming repository state.

---

## Phase 2 — Create ChairmanContext

Introduce:

```text
ChairmanContext

Request

AdvisorCollection

Metadata

CollectiveIntelligence {}
```

No existing component shall consume it yet.

Deliverable:

Immutable ChairmanContext model.

---

## Phase 3 — Create ChairmanContextBuilder

Implement:

```text
ChairmanContextBuilder
```

using the approved composite input:

```text
DecisionContext

+

AdvisorResult[]
```

The builder must:

* preserve all Advisor fields;
* preserve ordering;
* preserve metadata;
* perform validation;
* remain deterministic.

Deliverable:

Fully tested builder.

---

## Phase 4 — Unit Tests

Create builder unit tests covering:

* empty advisors;
* multiple advisors;
* ordering;
* metadata preservation;
* optional fields;
* extension fields;
* invalid input;
* immutability.

Deliverable:

Builder test suite.

---

## Phase 5 — Refactor Chairman Pipeline

Replace direct dependencies:

Current

```text
DecisionContext
↓

Prompt Builder
```

Target

```text
DecisionContext

+

AdvisorResult[]

↓

ChairmanContextBuilder

↓

ChairmanContext

↓

Prompt Builder
```

No behavioral changes.

Deliverable:

Pipeline refactored.

---

## Phase 6 — Prompt Builder Refactoring

Update prompt generation.

Prompt Builder shall consume only:

```text
ChairmanContext
```

It shall not depend on:

* DecisionContext
* AdvisorResult

directly.

Deliverable:

Prompt Builder decoupled.

---

## Phase 7 — Regression Tests

Execute complete regression suite.

Validate:

* Chairman output stability;
* information preservation;
* advisor ordering;
* deterministic context generation;
* graceful failure handling.

Deliverable:

Regression report.

---

## Phase 8 — Documentation

Update:

README

Architecture overview

Pipeline diagrams

Engineering references

Implementation notes

Do not modify ADR-0003.

Deliverable:

Documentation synchronized.

---

# 8. Files Expected to Change

Expected modifications include files similar to:

```text
src/lib/council/
    chairman-context.ts
    chairman-context-builder.ts
    chairman-runner.ts
    chairman-prompt.ts

src/types/
    council.ts

tests/
    chairman-context-builder.test.mjs
    chairman-runner.test.mjs

docs/
    eng/
```

Actual file locations shall follow existing repository conventions.

---

# 9. Commit Strategy

Prefer multiple logical commits rather than one large commit.

Suggested sequence:

Commit 1

Create ChairmanContext model

Commit 2

Implement Builder

Commit 3

Builder tests

Commit 4

Pipeline refactoring

Commit 5

Prompt Builder refactoring

Commit 6

Regression fixes

Commit 7

Documentation

---

# 10. Validation Gates

Implementation shall pause after each phase.

Proceed only if:

Phase 2

✓ ChairmanContext compiles

Phase 3

✓ Builder compiles

Phase 4

✓ Unit tests pass

Phase 5

✓ Pipeline builds

Phase 6

✓ Prompt generation succeeds

Phase 7

✓ Regression suite passes

Phase 8

✓ Documentation complete

---

# 11. Rollback Strategy

If implementation introduces regressions:

1. Revert Prompt Builder integration.
2. Restore previous pipeline.
3. Preserve ChairmanContextBuilder implementation.
4. Resolve issues incrementally.
5. Reattempt integration.

Never delete tested components.

---

# 12. Risks

| Risk                         | Probability | Impact | Mitigation                     |
| ---------------------------- | ----------- | ------ | ------------------------------ |
| Prompt behavior changes      | Medium      | High   | Regression tests (BEH-001–004) |
| Repository contract mismatch | Low         | High   | Use repository types only      |
| Information loss             | Low         | High   | Field-level mapping validation |
| Ordering changes             | Low         | Medium | Ordering tests                 |
| Hidden coupling              | Medium      | Medium | Pipeline refactoring review    |

---

# 13. Deliverables

Implementation shall produce:

* ChairmanContext model
* ChairmanContextBuilder
* Updated Chairman pipeline
* Updated Prompt Builder
* Unit tests
* Integration tests
* Regression report
* Updated documentation

---

# 14. Definition of Done

PR-2 is complete only when all of the following are true:

* ADR-0003 remains fully respected.
* ENG-0002 Rev.1 is fully implemented.
* ARR-0001 blocking findings are fully addressed.
* All validation gates pass.
* All tests pass.
* No Advisor information is lost.
* Chairman behavior remains within the defined behavioral equivalence criteria.
* Prompt Builder depends exclusively on `ChairmanContext`.
* Documentation reflects the implemented architecture.
* Code review identifies no architectural violations.

---

# 15. Cursor Execution Instructions

Execute this implementation sequentially.

Do not skip phases.

Do not introduce capabilities outside the approved scope.

Do not redesign unrelated components.

If repository implementation differs materially from ENG-0002 Rev.1, stop implementation and produce an Architecture Exception Report instead of making assumptions.

At the end of the implementation, produce an **Implementation Completion Report** containing:

1. Executive Summary
2. Files Created
3. Files Modified
4. Commits Performed
5. Test Results
6. Regression Results
7. Documentation Updated
8. Deviations from Plan (if any)
9. Risks Identified
10. Final Implementation Assessment

Implementation is considered successful only if the completed code remains fully compliant with ADR-0003, ENG-0002 Rev.1, and ARR-0001.

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0003 — Collective Intelligence Layer](../adr/ADR-0003-collective-intelligence-layer.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [ARR-0001 — Architecture Readiness Review](../arr/ARR-0001-architecture-readiness-review.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
- [Documentation Index](../README.md)

</user_query>