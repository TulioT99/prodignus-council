# WP-05D — Chairman Decision Policy Enforcement

**Status:** Published — WP-05D Canonical Implementation Baseline  
**Governing specification:** ENG-0007 §8 Decision Policy / AC-CH-15 (Approved v1.0)  
**Predecessor baseline:** WP-05C @ `9a2c01823c8bd64e3252e19fd1e5c6bcf9e86c70`

## Purpose

Introduce an explicit **Decision Policy Engine** that evaluates a completed Chairman decision against deterministic engineering rules **after reasoning** and **before publication**.

The Chairman remains responsible for reasoning. The Policy Engine remains responsible for governance. Policy is never embedded in prompts and never depends on LLM interpretation.

## Policy Engine architecture

| Component                                                | Responsibility                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DecisionPolicyCandidate`                                | Immutable inputs for evaluation (metadata, confidence, uncertainty, consensus) |
| `DecisionPolicyRuleDefinition`                           | Extensible rule registry entry                                                 |
| `evaluateDecisionPolicy`                                 | Deterministic evaluation producing `DecisionPolicyResult`                      |
| `validateDecisionPolicyResult` / `runDecisionPolicyGate` | Structural validation + publication gate                                       |

Evaluator identity: `chairman-decision-policy-engine`  
Policy version: `1.0`

## Policy outcomes

| Status               | Meaning                                         | Publication                                                               |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `Approved`           | All hard rules passed; no escalation            | Publish success                                                           |
| `EscalationRequired` | Soft governance signal (e.g. degraded coverage) | Publish success **with explicit escalation status** (not auto-actionable) |
| `Rejected`           | Hard policy violation                           | **Block** success publication → `ChairmanFailed`                          |

## Rule model

Each evaluated rule includes:

- `ruleId` / `ruleName`
- `outcome`: `Pass` | `EscalationRequired` | `Fail`
- `explanation`

Violations (when present) include:

- `violationId` / `ruleId`
- `severity`: `critical` | `major` | `escalation`
- `message`
- `governingSpecification`: always `ENG-0007`

## Initial rule set

| Rule     | Intent                                                        |
| -------- | ------------------------------------------------------------- |
| `DP-R01` | Metadata, Confidence, and Uncertainty must be present         |
| `DP-R02` | Recommendation confidence must not exceed evidence confidence |
| `DP-R03` | Decision must reference a valid Consensus Package             |
| `DP-R04` | Mandatory upstream validation must not have failed            |
| `DP-R05` | Failure-shaped candidates cannot publish recommendations      |
| `DP-R06` | Metadata and confidence must be internally consistent         |
| `DP-R07` | Degraded coverage / incomplete consensus requires escalation  |

Future rules are added to `INITIAL_DECISION_POLICY_RULES` (or injected via `rules` override in tests). Do not hardcode policy branches in the Chairman runner beyond invoking the gate.

## Evaluation lifecycle

```text
Consensus Package
        ↓
Contract Validation (WP-05A)
        ↓
Chairman Reasoning
        ↓
Decision Metadata (WP-05B)
        ↓
Confidence & Uncertainty (WP-05C)
        ↓
Decision Policy Evaluation (WP-05D)
        ↓
Published Decision  (Approved or EscalationRequired)
   or ChairmanFailed (Rejected / invalid policy artifact)
```

The Policy Engine never modifies reasoning artifacts.

## Extension strategy

1. Add a new `DecisionPolicyRuleDefinition` to the registry.
2. Keep rule logic pure and deterministic (no I/O, no LLM).
3. Prefer new `ruleId` values (`DP-R08`…) over rewriting existing semantics.
4. Cover the rule with fixture tests in `tests/chairman-decision-policy.test.mjs`.

## Module map

| Path                                          | Responsibility                                   |
| --------------------------------------------- | ------------------------------------------------ |
| `src/lib/council/chairman-decision-policy.ts` | Policy engine + initial rules + gate             |
| `src/types/council.ts`                        | `DecisionPolicyResult` and related types         |
| `src/lib/council/chairman-runner.ts`          | Invoke gate after confidence, before publish     |
| `src/lib/council/council-display.ts`          | Policy presentation helpers                      |
| `src/components/chairman-card.tsx`            | Surfaces policy status / escalation / violations |

## Out of scope (later WP-05 slices)

- Conformance testing & final publication (WP-05F)
- Conformance pack & final publication (WP-05F)
- Human workflow / notification systems for escalation
