# ADR-0005: Decision Council Advisors v1.0

**Related Operations Standard:** OPS-0001 — Engineering Workflow Standard

## Status

Accepted

## Date

2026-07-20

## Context

The Advisor layer has completed engineering stabilization after the successful completion of ENG-0009 and ENG-0010.

Reliability defects were traced to prompt/schema alignment rather than parser architecture.

Regression coverage has been implemented.

Engineering Gate approval has been completed.

## Decision

The Advisor layer is now considered Version 1.0.

The following components are frozen except for bug fixes:

- Advisor prompts
- Response contracts
- Structured output schemas
- Parser architecture
- Advisor routing

Future functional improvements should be implemented primarily in the Chairman layer rather than through architectural changes to individual Advisors.

## Consequences

### Positive

- Stable architecture
- Predictable contracts
- Reliable structured output
- Safe foundation for Chairman Intelligence

### Negative

- New Advisor capabilities now require architectural review.

## Future Work

### Sprint 6 — Chairman Intelligence

## Advisor Layer Status

Version 1.0

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0003 — Collective Intelligence Layer](../adr/ADR-0003-collective-intelligence-layer.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [ARR-0001 — Architecture Readiness Review](../arr/ARR-0001-architecture-readiness-review.md)
- [IMP-0002 — ChairmanContextBuilder Implementation Plan](../imp/IMP-0002-chairman-context-builder-implementation-plan.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
- [Documentation Index](../README.md)
