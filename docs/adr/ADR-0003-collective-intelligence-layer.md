# ADR-0003 — Collective Intelligence Layer

**Status:** Accepted
**Date:** 2026-07-21
**Authors:** Tulio Tavernaro, ChatGPT
**Sprint:** Sprint 6
**Related Engineering Specification:** ENG-0002 — ChairmanContextBuilder Technical Specification
**Related Operations Standard:** OPS-0001 — Engineering Workflow Standard

---

# 1. Context

The Prodignus Council is designed as a multi-agent executive decision system composed of independent domain Advisors coordinated by a Chairman responsible for producing the final executive recommendation.

The current decision pipeline follows the architecture below:

```text
User Request
      │
      ▼
Orchestrator
      │
      ▼
Advisor Execution
      │
      ▼
DecisionContext
      │
      ▼
Chairman Prompt
      │
      ▼
Chairman
      │
      ▼
Executive Decision
```

This architecture successfully separates orchestration from domain expertise and has demonstrated good modularity during the first development sprints.

A recent architectural review concluded that the repository presents a solid architectural foundation. Remaining improvements are primarily evolutionary rather than corrective. The principal opportunity identified is increasing the quality of collective reasoning rather than restructuring the Advisor layer.

As the Council evolves, new capabilities will be required, including:

* preservation of complete Advisor outputs;
* consensus identification;
* disagreement analysis;
* evidence consolidation;
* confidence aggregation;
* decision traceability;
* Advisor reputation;
* historical reasoning;
* collective memory.

The current architecture has no dedicated location for these capabilities.

Without an intermediate architectural layer, the Chairman would progressively accumulate responsibilities unrelated to executive reasoning.

---

# 2. Problem Statement

The current architecture tightly couples context preparation with Chairman prompt generation.

As a consequence:

* preparation of decision context is distributed across multiple components;
* future collective intelligence capabilities have no clear architectural home;
* the Chairman risks becoming responsible for both reasoning and context engineering;
* future evolution would increase coupling and implementation complexity.

Although this limitation does not currently affect functionality, it introduces long-term architectural risk.

---

# 3. Decision

Introduce a new architectural layer named **Collective Intelligence Layer**.

The first implementation of this layer will be the **ChairmanContextBuilder**.

The new architecture becomes:

```text
User Request
      │
      ▼
Orchestrator
      │
      ▼
Advisor Execution
      │
      ▼
DecisionContext
      │
      ▼
Collective Intelligence Layer
      │
      ▼
Chairman Prompt Builder
      │
      ▼
Chairman
      │
      ▼
Executive Decision
```

This layer becomes the exclusive responsibility for preparing structured decision context before executive reasoning begins.

The Chairman remains exclusively responsible for executive deliberation and final decision making.

---

# 4. Responsibilities

The Collective Intelligence Layer shall:

* preserve complete Advisor outputs;
* organize execution metadata;
* expose a stable Chairman context;
* prepare structured information for executive reasoning;
* provide a future extension point for collective intelligence capabilities.

The layer shall not:

* generate executive conclusions;
* summarize Advisor outputs;
* rank Advisors;
* determine consensus;
* resolve conflicts;
* calculate confidence;
* replace Chairman reasoning.

Those capabilities will be introduced incrementally in future sprints.

---

# 5. Design Principles

## 5.1 Separation of Concerns

Context preparation and executive reasoning are independent architectural responsibilities.

The Chairman must deliberate.

The Collective Intelligence Layer must prepare information.

---

## 5.2 Information Preservation

No Advisor information shall be discarded before reaching the Chairman.

Information reduction is allowed only during executive reasoning.

---

## 5.3 Extensibility

Future collective reasoning capabilities shall be introduced inside the Collective Intelligence Layer without requiring architectural changes to the Chairman.

---

## 5.4 Backward Compatibility

Existing Advisors, orchestration logic and execution flow shall remain unchanged.

The new layer integrates transparently into the current pipeline.

---

## 5.5 Deterministic Context

The same DecisionContext shall always generate the same ChairmanContext.

The layer must not depend on external services or LLM execution.

---

# 6. Alternatives Considered

## Alternative A — Maintain the Current Architecture

**Rejected.**

This approach would progressively overload the Chairman with responsibilities unrelated to executive reasoning.

It would also make future evolution increasingly difficult.

---

## Alternative B — Expand DecisionContext

**Rejected.**

DecisionContext represents execution state.

Embedding collective intelligence into this object would violate separation of concerns and reduce architectural clarity.

---

## Alternative C — Introduce a Collective Intelligence Layer

**Accepted.**

This approach introduces a dedicated architectural boundary between execution and executive reasoning.

It provides a stable extension point for future collective reasoning capabilities while maintaining low coupling.

---

# 7. Consequences

## Positive

* clearer architectural responsibilities;
* lower coupling;
* higher maintainability;
* improved testability;
* explicit extension point;
* stable Chairman contract;
* easier future evolution.

## Negative

* one additional architectural component;
* slightly more complex execution pipeline.

The trade-off is considered appropriate given the expected long-term evolution of the Council.

---

# 8. Implementation Strategy

The Collective Intelligence Layer will be introduced incrementally.

### Sprint 6

* ChairmanContextBuilder
* Information preservation
* Executive context organization

### Sprint 7

* Consensus analysis
* Conflict detection

### Sprint 8

* Collective confidence

### Sprint 9

* Evidence ranking

### Sprint 10

* Advisor reputation

### Sprint 11

* Decision history

### Sprint 12

* Collective memory

Each capability will build upon the previous one without requiring structural changes to the overall architecture.

---

# 9. Architectural Vision

The long-term architecture of the Prodignus Council becomes:

```text
                User Question
                      │
                      ▼
          ┌─────────────────────────┐
          │      Orchestrator       │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │      Advisor Layer      │
          │ Independent Specialists │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │     DecisionContext     │
          └───────────┬─────────────┘
                      ▼
      ┌──────────────────────────────────┐
      │ Collective Intelligence Layer    │
      │                                  │
      │ ChairmanContextBuilder           │
      │ Executive Briefing              │
      │ Consensus Analysis              │
      │ Conflict Detection              │
      │ Confidence Aggregation          │
      │ Evidence Ranking                │
      │ Advisor Reputation              │
      │ Historical Memory               │
      └───────────────┬──────────────────┘
                      ▼
          ┌─────────────────────────┐
          │  Chairman Prompt Builder│
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │        Chairman         │
          │ Executive Deliberation  │
          └───────────┬─────────────┘
                      ▼
          ┌─────────────────────────┐
          │ Executive Decision      │
          └─────────────────────────┘
```

This architecture establishes a clear separation between:

* domain expertise;
* collective intelligence;
* executive reasoning.

---

# 10. Rationale

The primary competitive advantage of the Prodignus Council is not the existence of multiple Advisors, but the quality of the collective reasoning that emerges from their interaction.

The Collective Intelligence Layer formalizes this principle as an independent architectural concern.

Rather than embedding increasingly sophisticated logic inside the Chairman, the architecture creates a dedicated layer responsible for preparing high-quality executive context while preserving the Chairman as a focused decision-making component.

This approach supports long-term scalability, clearer responsibilities, simpler testing and lower architectural coupling.

---

# 11. Decision

**Accepted.**

The Prodignus Council shall evolve from a multi-agent orchestration architecture into a layered collective intelligence architecture.

Beginning with Sprint 6, every enhancement related to consensus, evidence synthesis, confidence, historical reasoning or collective memory shall be implemented through the Collective Intelligence Layer unless a documented architectural decision explicitly states otherwise.

This ADR becomes the architectural foundation for the ChairmanContextBuilder specified in ENG-0002 and for all subsequent Collective Intelligence capabilities.

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [ARR-0001 — Architecture Readiness Review](../arr/ARR-0001-architecture-readiness-review.md)
- [IMP-0002 — ChairmanContextBuilder Implementation Plan](../imp/IMP-0002-chairman-context-builder-implementation-plan.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
- [Documentation Index](../README.md)
