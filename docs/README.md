# Prodignus Council — Documentation Index

All engineering documentation in this repository follows the [OPS-0001 — Engineering Workflow Standard](ops/OPS-0001-engineering-workflow-standard.md).

## Documentation Hierarchy

| Type | Location | Identifier pattern | Purpose |
| ---- | -------- | ------------------ | ------- |
| Operations | `docs/ops/` | `OPS-NNNN-*` | Engineering workflow, standards, and operating procedures |
| Architecture Decision Records | `docs/adr/` | `ADR-NNNN-*` | Architectural decisions and rationale |
| Engineering Specifications | `docs/eng/` | `ENG-NNNN-*` | Implementation contracts, interfaces, and invariants |
| Architecture Readiness Reviews | `docs/arr/` | `ARR-NNNN-*` | Pre-implementation governance checkpoints |
| Implementation Plans | `docs/imp/` | `IMP-NNNN-*` | Execution strategy and validation gates |
| Architecture Implementation Reviews | `docs/air/` | `AIR-NNNN-*` | Post-implementation architectural compliance assessment |
| Implementation Completion Reports | `docs/icr/` | `ICR-NNNN-*` | Implementation delivery certification |

## Operations

| Document | Title | Status |
| -------- | ----- | ------ |
| [OPS-0001](ops/OPS-0001-engineering-workflow-standard.md) | Engineering Workflow Standard | Approved |

## Architecture Decision Records

| Document | Title | Status |
| -------- | ----- | ------ |
| [ADR-0003](adr/ADR-0003-collective-intelligence-layer.md) | Collective Intelligence Layer | Accepted |
| [ADR-0005](adr/ADR-0005-decision-council-advisors-v1.md) | Decision Council Advisors v1.0 | Accepted |

## Engineering Specifications

| Document | Title | Status |
| -------- | ----- | ------ |
| [ENG-0002](eng/ENG-0002-chairman-context-builder-technical-specification.md) | ChairmanContextBuilder Technical Specification | Approved for Implementation — Revision 1 |

## Architecture Readiness Reviews

| Document | Title | Outcome |
| -------- | ----- | ------- |
| [ARR-0001](arr/ARR-0001-architecture-readiness-review.md) | Architecture Readiness Review (Sprint 6) | PASS WITH RECOMMENDATIONS |

## Implementation Plans

| Document | Title | Status |
| -------- | ----- | ------ |
| [IMP-0002](imp/IMP-0002-chairman-context-builder-implementation-plan.md) | ChairmanContextBuilder Implementation Plan | Approved for Implementation |

## Architecture Implementation Reviews

| Document | Title | Outcome |
| -------- | ----- | ------- |
| [AIR-0001](air/AIR-0001-chairman-context-builder-architecture-implementation-review.md) | ChairmanContextBuilder Architecture Implementation Review | APPROVED |

## Implementation Completion Reports

| Document | Title | Status |
| -------- | ----- | ------ |
| [ICR-0002](icr/ICR-0002-chairman-context-builder-implementation-completion-report.md) | ChairmanContextBuilder Implementation Completion Report | Published |

## Sprint 6 Traceability Chain

```text
OPS-0001 (workflow)
      │
      ▼
ADR-0003 (Collective Intelligence Layer)
      │
      ▼
ENG-0002 Rev.1 (ChairmanContextBuilder)
      │
      ▼
ARR-0001 (Architecture Readiness Review)
      │
      ▼
IMP-0002 (Implementation Plan)
      │
      ▼
Implementation (PR-2)
      │
      ▼
AIR-0001 (Architecture Implementation Review)
      │
      ▼
ICR-0002 (Implementation Completion Report)
```

## Related Repository Documentation

- [Project README](../README.md)
