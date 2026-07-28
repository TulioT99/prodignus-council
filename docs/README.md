# Prodignus Council — Documentation Index

All engineering documentation in this repository follows the [OPS-0001 — Engineering Workflow Standard](ops/OPS-0001-engineering-workflow-standard.md).

## Documentation Hierarchy

| Type                                | Location             | Identifier pattern   | Purpose                                                   |
| ----------------------------------- | -------------------- | -------------------- | --------------------------------------------------------- |
| Operations                          | `docs/ops/`          | `OPS-NNNN-*`         | Engineering workflow, standards, and operating procedures |
| Architecture Decision Records       | `docs/adr/`          | `ADR-NNNN-*`         | Architectural decisions and rationale                     |
| Engineering Specifications          | `docs/eng/`          | `ENG-NNNN-*`         | Implementation contracts, interfaces, and invariants      |
| Architecture Readiness Reviews      | `docs/arr/`          | `ARR-NNNN-*`         | Pre-implementation governance checkpoints                 |
| Architecture Assessments            | `docs/assessments/`  | Descriptive filename | Historical read-only architecture baselines               |
| Architecture (informative)          | `docs/architecture/` | Descriptive filename | Living architecture descriptions (non-ADR)                |
| Implementation Plans                | `docs/imp/`          | `IMP-NNNN-*`         | Execution strategy and validation gates                   |
| Architecture Implementation Reviews | `docs/air/`          | `AIR-NNNN-*`         | Post-implementation architectural compliance assessment   |
| Implementation Completion Reports   | `docs/icr/`          | `ICR-NNNN-*`         | Implementation delivery certification                     |

## Operations

| Document                                                  | Title                         | Status   |
| --------------------------------------------------------- | ----------------------------- | -------- |
| [OPS-0001](ops/OPS-0001-engineering-workflow-standard.md) | Engineering Workflow Standard | Approved |

## Architecture Decision Records

| Document                                                              | Title                                     | Status   |
| --------------------------------------------------------------------- | ----------------------------------------- | -------- |
| [ADR-0003](adr/ADR-0003-collective-intelligence-layer.md)             | Collective Intelligence Layer             | Accepted |
| [ADR-0005](adr/ADR-0005-decision-council-advisors-v1.md)              | Decision Council Advisors v1.0            | Accepted |
| [ADR-0006](adr/ADR-0006-sprint-1-architecture-validation-strategy.md) | Sprint 1 Architecture Validation Strategy | Accepted |

## Engineering Specifications

| Document                                                                     | Title                                          | Status                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| [ENG-0002](eng/ENG-0002-chairman-context-builder-technical-specification.md) | ChairmanContextBuilder Technical Specification | Approved for Implementation — Revision 1 |
| [ENG-0003](eng/ENG-0003-sprint-1-execution-architecture.md)                  | Sprint 1 Execution Architecture                | Proposed                                 |

## Architecture Readiness Reviews

| Document                                                           | Title                                    | Outcome                   |
| ------------------------------------------------------------------ | ---------------------------------------- | ------------------------- |
| [ARR-0001](arr/ARR-0001-architecture-readiness-review.md)          | Architecture Readiness Review (Sprint 6) | PASS WITH RECOMMENDATIONS |
| [ARR-0002](arr/ARR-0002-sprint-1-architecture-readiness-review.md) | Sprint 1 Architecture Readiness Review   | PASS WITH OBSERVATIONS    |

## Architecture Assessments

| Document                                                                                               | Title                                                        | Status                                         |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| [decision-council-architecture-assessment.md](assessments/decision-council-architecture-assessment.md) | Decision Council Architecture Assessment                     | Historical (baseline `cc90061`)                |
| [WP-04-IMPLEMENTATION-BASELINE.md](assessments/WP-04-IMPLEMENTATION-BASELINE.md)                       | WP-04 Canonical Implementation Baseline — Consensus Engine   | Published (Consensus Engine baseline)          |
| [WP-05A-IMPLEMENTATION-BASELINE.md](assessments/WP-05A-IMPLEMENTATION-BASELINE.md)                     | WP-05A Canonical Implementation Baseline — Chairman Contract | Published (Chairman contract baseline)         |
| [WP-05B-IMPLEMENTATION-BASELINE.md](assessments/WP-05B-IMPLEMENTATION-BASELINE.md)                     | WP-05B Canonical Implementation Baseline — Decision Metadata | Published (superseded by WP-05C)               |
| [WP-05C-IMPLEMENTATION-BASELINE.md](assessments/WP-05C-IMPLEMENTATION-BASELINE.md)                     | WP-05C Canonical Implementation Baseline — Confidence Triad  | Published (superseded by WP-05D)               |
| [WP-05D-IMPLEMENTATION-BASELINE.md](assessments/WP-05D-IMPLEMENTATION-BASELINE.md)                     | WP-05D Canonical Implementation Baseline — Decision Policy   | Published (current Decision Policy baseline)   |

## Architecture (informative)

| Document                                                                    | Title                                                          | Status      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| [RUNTIME_CONFIGURATION.md](architecture/RUNTIME_CONFIGURATION.md)           | Runtime Configuration Architecture (WP-07 Configuration Slice) | Informative |
| [CONSENSUS_ENGINE.md](architecture/CONSENSUS_ENGINE.md)                     | Consensus Engine Implementation Notes (WP-04)                  | Informative |
| [CHAIRMAN_DECISION_METADATA.md](architecture/CHAIRMAN_DECISION_METADATA.md) | Chairman Decision Metadata & Traceability (WP-05B)             | Informative |
| [CHAIRMAN_CONFIDENCE_MODEL.md](architecture/CHAIRMAN_CONFIDENCE_MODEL.md)   | Chairman Confidence Triad & Uncertainty (WP-05C)               | Informative |
| [CHAIRMAN_DECISION_POLICY.md](architecture/CHAIRMAN_DECISION_POLICY.md)     | Chairman Decision Policy Enforcement (WP-05D)                  | Informative |

## Implementation Plans

| Document                                                                 | Title                                      | Status                      |
| ------------------------------------------------------------------------ | ------------------------------------------ | --------------------------- |
| [IMP-0002](imp/IMP-0002-chairman-context-builder-implementation-plan.md) | ChairmanContextBuilder Implementation Plan | Approved for Implementation |

## Architecture Implementation Reviews

| Document                                                                                | Title                                                     | Outcome  |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| [AIR-0001](air/AIR-0001-chairman-context-builder-architecture-implementation-review.md) | ChairmanContextBuilder Architecture Implementation Review | APPROVED |

## Implementation Completion Reports

| Document                                                                              | Title                                                   | Status    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------- |
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
