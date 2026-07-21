# ENG-0002 — ChairmanContextBuilder Technical Specification

**Status:** Approved for Implementation — Revision 1
**Document Type:** Engineering Specification
**Related ADR:** ADR-0003 — Collective Intelligence Layer
**Revision Basis:** ARR-0001 Architecture Readiness Review
**Sprint:** Sprint 6
**Implementation PR:** PR-2 — Introduce ChairmanContextBuilder
**Authors:** Tulio Tavernaro, ChatGPT
**Target Repository:** `prodignus-council`
**Related Operations Standard:** OPS-0001 — Engineering Workflow Standard

---

## 0. Traceability

This specification implements ADR-0003. Every engineering requirement below traces to an ADR decision or principle.

### 0.1 ADR-0003 to engineering requirements

| ADR-0003 reference | Engineering requirement | ENG section |
| ------------------ | ----------------------- | ----------- |
| §3 Decision — Collective Intelligence Layer | Introduce `ChairmanContextBuilder` as first layer component | §1, §5, §6 |
| §4 Responsibilities — preserve Advisor outputs | Full `AdvisorResult` preservation via composite input | §7, §8, §9, INV-001, INV-002 |
| §4 Responsibilities — organize execution metadata | `ChairmanExecutionMetadata`, `ChairmanAdvisorExecutionMetadata` | §7.5, §7.6, §9 |
| §4 Responsibilities — expose stable Chairman context | Versioned `ChairmanContext` contract | §7.2, §20 |
| §4 Responsibilities — extension point | Empty `collectiveIntelligence` in PR-2 | §7.7, §21 |
| §4 Prohibitions — no summarization, ranking, consensus | Builder must not transform Advisor content | §4, §5, INV-006 |
| §5.1 Separation of Concerns | Builder prepares; prompt builder serializes; Chairman deliberates | §3.2, §12, §28 |
| §5.2 Information Preservation | Complete field mapping; no silent omission | §9, §14, INV-002 |
| §5.3 Extensibility | `collectiveIntelligence` section | §7.7, §21 |
| §5.4 Backward Compatibility | No Advisor, orchestrator, or routing changes | §2.2, §12.4, §12.5 |
| §5.5 Deterministic Context | Synchronous builder; injected clock for timestamps | §4.3, §10, INV-007 |
| §8 Sprint 6 scope | ChairmanContextBuilder only; no future capabilities | §2 |

### 0.2 Requirements to invariants to test cases

| Requirement | Invariant | Test case |
| ----------- | --------- | --------- |
| Composite input (DecisionContext + advisors) | INV-001 | TC-001, TC-014 |
| Full AdvisorResult preservation | INV-002 | TC-002, TC-003, TC-012 |
| Canonical Advisor ordering | INV-003 | TC-004, TC-016 |
| Input immutability | INV-004 | TC-005 |
| Output independence | INV-005 | TC-005 |
| No semantic transformation | INV-006 | TC-002, TC-010 |
| No provider dependency | INV-007 | TC-006 |
| Stable Chairman contract | INV-008 | TC-011 |
| Generic Advisor support | INV-009 | TC-010, TC-016 |
| Explicit build failure | INV-010 | TC-008, TC-009, TC-017 |
| Error graceful degradation | ERR-001 | TC-017, TC-018 |
| Behavioral equivalence rules | BEH-001 – BEH-004 | TC-015, TC-019 |
| DecisionContext field coverage | MAP-001 | TC-020 |
| Attachment and language preservation | MAP-001 | TC-020 |

---

## 1. Purpose

This document specifies the technical design of the `ChairmanContextBuilder`, the first concrete component of the Prodignus Council Collective Intelligence Layer defined in ADR-0003.

The component introduces a stable architectural boundary between:

* execution state (`DecisionContext`) and Advisor outputs (`AdvisorResult[]`);
* Chairman context preparation;
* Chairman prompt generation;
* executive reasoning.

This specification defines:

* responsibilities;
* interfaces;
* contracts;
* field-level mapping rules;
* integration flow;
* invariants;
* error propagation;
* behavioral equivalence rules;
* testing requirements;
* observability expectations;
* extension points.

This implementation is an architectural refactoring.

It must not intentionally change orchestration behavior, council session semantics, or Chairman failure handling.

Chairman output text may vary when prompt enrichment exposes previously omitted Advisor fields. That variation is acceptable and expected (see §15.5).

---

## 2. Scope

### 2.1 In scope

The implementation shall:

* introduce a dedicated `ChairmanContextBuilder`;
* define the `ChairmanContextBuildInput` and `ChairmanContext` contracts;
* consume `DecisionContext` and `AdvisorResult[]` as separate inputs (not embedded in `DecisionContext`);
* move Chairman-specific context preparation into the builder;
* preserve complete `AdvisorResult` objects;
* organize decision and execution metadata;
* update the Chairman pipeline to consume `ChairmanContext`;
* preserve existing orchestration and Chairman failure behavior;
* add unit and integration tests under `tests/*.test.mjs`;
* document the resulting flow.

### 2.2 Out of scope

This specification does not include:

* consensus detection;
* conflict identification;
* evidence ranking;
* collective confidence calculation;
* Advisor scoring or reputation;
* output summarization;
* token compression;
* historical decision retrieval;
* persistent memory;
* Chairman system-prompt redesign;
* Advisor prompt changes;
* routing changes;
* changes to execution order;
* CI/CD implementation;
* embedding Advisor results inside `DecisionContext`.

These capabilities may extend the Collective Intelligence Layer in future PRs.

---

## 3. Architectural Context

### 3.1 Current flow (repository baseline)

```text
User Request
      │
      ▼
Orchestrator (runCouncil)
      │
      ├──► createDecisionContext(decision) ──► DecisionContext
      │
      ├──► runAdvisor(...) × N ──► AdvisorResult[]
      │
      └──► runChairman(decisionContext, advisors)
                │
                └──► buildChairmanPrompts(decisionContext, advisors)
                          │
                          ▼
                     Chairman (OpenRouter)
                          │
                          ▼
                     ChairmanResult
```

In the current repository (`src/lib/council/orchestrator.ts`, `chairman-runner.ts`, `chairman-prompt.ts`), Chairman-specific data preparation and Advisor result selection occur inside `buildChairmanPrompts`, which receives `DecisionContext` and `AdvisorResult[]` separately.

The current prompt builder formats only a subset of each `AdvisorResult` (for example, it omits `keyArguments`, `unknowns`, and advisor-specific structured fields).

### 3.2 Target flow

```text
User Request
      │
      ▼
Orchestrator (runCouncil)
      │
      ├──► DecisionContext
      │
      ├──► AdvisorResult[]   (canonical order: ADVISOR_EXECUTION_ORDER)
      │
      └──► runChairman(decisionContext, advisors)
                │
                ├──► ChairmanContextBuilder.build({ decisionContext, advisors })
                │         │
                │         ▼
                │    ChairmanContext
                │
                ├──► buildChairmanPrompts(chairmanContext)
                │
                └──► Chairman (OpenRouter)
                          │
                          ▼
                     ChairmanResult
```

The `ChairmanContextBuilder` becomes the exclusive component responsible for transforming the canonical execution bundle into the structured context consumed by the Chairman prompt builder.

Advisor results remain outside `DecisionContext`, consistent with ADR-0003 Alternative B (rejected: expand `DecisionContext` with collective intelligence).

---

## 4. Design Principles

### 4.1 Single responsibility

The builder prepares and organizes information.

It does not deliberate, rank, summarize, interpret, or decide.

### 4.2 Information preservation

Every field available in the input `DecisionContext` and each input `AdvisorResult` must remain accessible in the generated `ChairmanContext`.

No field may be silently removed.

### 4.3 Determinism

Given the same valid `ChairmanContextBuildInput` and the same clock value, the builder must produce the same `ChairmanContext`.

The builder must not call an LLM, external API, database, or other nondeterministic service.

`contextBuiltAt` is time-derived. Determinism assertions in tests must use an injected clock (see §10).

### 4.4 Immutability

The builder must not mutate:

* `DecisionContext`;
* `AdvisorResult` objects;
* the input advisors array;
* nested persona, analysis, or optional field structures.

The resulting `ChairmanContext` should be treated as immutable (`Object.freeze` or equivalent, matching repository conventions in `decision-context.ts`).

### 4.5 Generic implementation

The builder must not contain special handling for individual Advisors.

The implementation must support new Advisors without builder changes.

### 4.6 Future extensibility

New collective intelligence sections must be addable through `collectiveIntelligence` without breaking the core context structure.

### 4.7 Backward compatibility

Existing Advisors, orchestration logic, execution order, and council session status rules must remain unchanged.

---

## 5. Component Responsibilities

The `ChairmanContextBuilder` shall:

1. Receive a complete and valid `ChairmanContextBuildInput`.
2. Preserve the original decision question and all `DecisionContext` fields via §9 mapping.
3. Preserve all `AdvisorResult` objects in input order.
4. Preserve Advisor identity and role metadata derivable from each `AdvisorResult.persona`.
5. Preserve execution metadata derivable from each `AdvisorResult`.
6. Create a structured, versioned `ChairmanContext`.
7. Validate mandatory build inputs.
8. Return a deterministic result.
9. Expose a stable interface for Chairman execution.
10. Prepare the `collectiveIntelligence` extension point as an empty object in PR-2.

The builder shall not:

* execute Advisors;
* call providers;
* alter Advisor responses;
* infer missing conclusions;
* normalize Advisor opinions semantically;
* resolve disagreements;
* calculate confidence;
* create a final decision;
* optimize or truncate content;
* serialize the final prompt;
* embed Advisor results into `DecisionContext`.

---

## 6. Module Structure

Implementation must follow existing repository organization.

```text
src/lib/council/
  chairman-context-builder.ts      # DefaultChairmanContextBuilder
  chairman-context.types.ts        # ChairmanContextBuildInput, ChairmanContext, interfaces
  chairman-context.errors.ts         # ChairmanContextBuildError (optional, see §11)
  chairman-prompt.ts                 # Updated: accepts ChairmanContext
  chairman-runner.ts                 # Updated: invokes builder then prompt builder

tests/
  chairman-context-builder.test.mjs
  chairman-prompt.test.mjs           # Updated integration assertions
  chairman-runner.test.mjs           # Updated pipeline assertions
```

Types shared with the broader council domain remain in `src/types/council.ts` only when they represent canonical domain contracts already used outside the Chairman pipeline.

Chairman-specific context types may live in `chairman-context.types.ts` and import `DecisionContext`, `AdvisorResult`, and related types from `@/types/council`.

Do not create a parallel `src/chairman/` tree.

Do not introduce a new test framework. Use the repository's Node native test runner (`node --test` via `tests/*.test.mjs`).

---

## 7. Core Interfaces

The implementation must reuse existing repository types from `src/types/council.ts`.

Do not duplicate canonical contracts solely to match this specification.

### 7.1 Build input (composite contract)

The builder consumes execution state and Advisor outputs as **separate inputs**. Advisor results are not part of `DecisionContext` in the current repository and must not be added in PR-2.

```typescript
import type { AdvisorResult, DecisionContext } from "@/types/council";

export interface ChairmanContextBuildInput {
  readonly decisionContext: DecisionContext;
  readonly advisors: readonly AdvisorResult[];
}
```

Validation rules:

* `decisionContext` must be defined;
* `advisors` must be defined (may be an empty array only if the current pipeline allows it; today the orchestrator always supplies five results);
* each advisor entry must include a stable identifier via `advisor.persona.id`.

### 7.2 Builder interface

```typescript
export interface ChairmanContextBuilder {
  build(input: ChairmanContextBuildInput): ChairmanContext;
}
```

Synchronous implementation is required for PR-2 because the builder performs no I/O.

The builder must not expose overloads accepting bare `DecisionContext` without `advisors`.

### 7.3 Chairman context

```typescript
export interface ChairmanContext {
  readonly schemaVersion: "1.0";
  readonly request: ChairmanRequestContext;
  readonly advisors: readonly ChairmanAdvisorContext[];
  readonly metadata: ChairmanExecutionMetadata;
  readonly collectiveIntelligence: CollectiveIntelligenceContext;
}
```

### 7.4 Request context

Maps from `DecisionContext`. Uses repository field names and types.

```typescript
import type {
  DecisionContextAttachment,
  DecisionStatus,
} from "@/types/council";

export interface ChairmanRequestContext {
  readonly executionId: string;
  readonly decisionId: string;
  readonly title: string;
  readonly question: string;
  readonly language: string;
  readonly context: string;
  readonly constraints: string;
  readonly objectives?: string;
  readonly attachments: readonly DecisionContextAttachment[];
  readonly timestamp: string;
  readonly status: DecisionStatus;
  readonly owner?: string;
}
```

The builder must copy these fields from `input.decisionContext` without transformation.

Do not invent fields absent from the repository (for example, `originalInput`).

### 7.5 Advisor context

```typescript
import type { AdvisorResult } from "@/types/council";

export interface ChairmanAdvisorContext {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly thinkingLens: AdvisorResult["persona"]["thinkingLens"];
  readonly result: Readonly<AdvisorResult>;
  readonly execution: ChairmanAdvisorExecutionMetadata;
}
```

Rules:

* `advisorId` = `result.persona.id`
* `advisorName` = `result.persona.displayName`
* `thinkingLens` = `result.persona.thinkingLens`
* `result` = the complete `AdvisorResult` reference (not a reconstructed subset)

### 7.6 Advisor execution metadata

Derived only from fields that exist on `AdvisorResult`. Do not fabricate provider runtime metadata.

```typescript
import type { AdvisorResult, AdvisorSource, AdvisorStatus } from "@/types/council";

export interface ChairmanAdvisorExecutionMetadata {
  readonly status: AdvisorStatus;
  readonly source: AdvisorSource;
  readonly executionId: string;
  readonly durationMs: number;
  readonly totalTokens: number;
  readonly configuredModel: string;
  readonly errorMessage?: string;
}
```

Mapping:

| Source (`AdvisorResult`) | Target |
| ------------------------ | ------ |
| `status` | `execution.status` |
| `source` | `execution.source` |
| `executionId` | `execution.executionId` |
| `durationMs` | `execution.durationMs` |
| `totalTokens` | `execution.totalTokens` |
| `persona.model` | `execution.configuredModel` |
| `errorMessage` | `execution.errorMessage` |

Runtime provider model identifiers are not available on `AdvisorResult` and are intentionally omitted.

### 7.7 Execution metadata

```typescript
export interface ChairmanExecutionMetadata {
  readonly executionId: string;
  readonly decisionId: string;
  readonly advisorCount: number;
  readonly createdAt: string;
  readonly contextBuiltAt: string;
  readonly pipelineVersion: string;
  readonly language: string;
}
```

Mapping:

| Source | Target |
| ------ | ------ |
| `decisionContext.executionId` | `metadata.executionId` |
| `decisionContext.decisionId` | `metadata.decisionId` |
| `decisionContext.timestamp` | `metadata.createdAt` |
| `decisionContext.language` | `metadata.language` |
| `input.advisors.length` | `metadata.advisorCount` |
| Injected clock | `metadata.contextBuiltAt` |
| `councilConfig.version` | `metadata.pipelineVersion` |

### 7.8 Collective intelligence extension point

```typescript
export interface CollectiveIntelligenceContext {
  readonly consensus?: unknown;
  readonly conflicts?: unknown;
  readonly evidence?: unknown;
  readonly confidence?: unknown;
  readonly openQuestions?: unknown;
  readonly extensions?: Readonly<Record<string, unknown>>;
}
```

For PR-2:

```typescript
collectiveIntelligence: {}
```

Do not implement future reasoning capabilities in this PR.

---

## 8. Contract Invariants

### INV-001 — Complete Advisor preservation

For each `AdvisorResult` in `input.advisors`, exactly one corresponding entry must exist in `ChairmanContext.advisors`.

### INV-002 — No silent field loss

Every enumerable field on each input `AdvisorResult`, including optional advisor-specific fields and unknown future fields, must remain accessible through:

```typescript
chairmanContext.advisors[index].result
```

Every field on `input.decisionContext` must remain accessible through `chairmanContext.request` or `chairmanContext.metadata` per §9.

### INV-003 — Advisor ordering

The output Advisor collection must preserve the order of `input.advisors`.

The orchestrator supplies advisors in `ADVISOR_EXECUTION_ORDER`. The builder must not reorder, sort, or rank Advisors.

### INV-004 — Input immutability

The builder must not mutate `input`, `input.decisionContext`, any `AdvisorResult`, or nested structures.

### INV-005 — Output independence

Modifications attempted against the generated `ChairmanContext` must not mutate the original `DecisionContext` or `AdvisorResult` objects.

Use shallow structural wrapping with frozen objects where sufficient. Avoid unnecessary deep cloning unless required for isolation.

### INV-006 — No semantic transformation

Advisor and decision content must not be summarized, rewritten, translated, or interpreted by the builder.

### INV-007 — No provider dependency

The builder must not invoke any LLM provider or external service.

### INV-008 — Stable contract

The Chairman runner and prompt builder must depend on `ChairmanContext`, not on builder internals.

### INV-009 — Generic Advisor support

A new valid `AdvisorResult` with an unknown `persona.id` must flow through the builder without Advisor-specific conditionals.

### INV-010 — Explicit failure

Missing mandatory build input must produce a clear domain error rather than malformed `ChairmanContext`.

---

## 9. Field Mapping Specification

### 9.1 DecisionContext → ChairmanContext

| `DecisionContext` field | Type | Target | Rule |
| ----------------------- | ---- | ------ | ---- |
| `executionId` | `string` | `request.executionId`, `metadata.executionId` | Copied verbatim to both locations for prompt and traceability access |
| `decisionId` | `string` | `request.decisionId`, `metadata.decisionId` | Copied verbatim to both locations |
| `title` | `string` | `request.title` | Copied verbatim |
| `question` | `string` | `request.question` | Copied verbatim |
| `language` | `string` | `request.language`, `metadata.language` | Copied verbatim |
| `context` | `string` | `request.context` | Copied verbatim |
| `constraints` | `string` | `request.constraints` | Copied verbatim (repository uses a string, not an array) |
| `objectives` | `string \| undefined` | `request.objectives` | Copied when defined |
| `attachments` | `readonly DecisionContextAttachment[]` | `request.attachments` | Copied by reference or shallow copy; must remain readable |
| `timestamp` | `string` | `request.timestamp`, `metadata.createdAt` | Same value in both fields |
| `status` | `DecisionStatus` | `request.status` | Copied verbatim |
| `owner` | `string \| undefined` | `request.owner` | Copied when defined |

**Intentionally omitted from ChairmanContext top-level:** none. Every `DecisionContext` field has a defined destination.

**Not sourced from DecisionContext:** `advisors` (supplied separately in `ChairmanContextBuildInput`).

### 9.2 AdvisorResult → ChairmanContext.advisors[]

Each input `AdvisorResult` produces one `ChairmanAdvisorContext`:

| Source | Target | Rule |
| ------ | ------ | ---- |
| Entire `AdvisorResult` object | `advisors[].result` | Preserve complete object by reference |
| `persona.id` | `advisors[].advisorId` | Denormalized for stable access |
| `persona.displayName` | `advisors[].advisorName` | Denormalized for stable access |
| `persona.thinkingLens` | `advisors[].thinkingLens` | Denormalized for stable access |
| `status` | `advisors[].execution.status` | Copied verbatim |
| `source` | `advisors[].execution.source` | Copied verbatim |
| `executionId` | `advisors[].execution.executionId` | Copied verbatim |
| `durationMs` | `advisors[].execution.durationMs` | Copied verbatim |
| `totalTokens` | `advisors[].execution.totalTokens` | Copied verbatim |
| `persona.model` | `advisors[].execution.configuredModel` | Copied verbatim |
| `errorMessage` | `advisors[].execution.errorMessage` | Copied when defined |

**Preserved inside `advisors[].result` without separate mapping:**

| `AdvisorResult` field | Notes |
| --------------------- | ----- |
| `persona` (full object) | Includes `expertise`, `background`, `mission`, etc. |
| `summary` | Required |
| `analysis` | Required |
| `assumptions` | Required |
| `risks` | Required |
| `recommendation` | Required |
| `confidence` | Required |
| `keyArguments` | Optional |
| `unknowns` | Optional |
| `accessibilityConcerns` | Optional (ADV-003) |
| `journeyBarriers` | Optional (ADV-003) |
| `engineeringConcerns` | Optional (ADV-004) |
| `operationalConcerns` | Optional (ADV-004) |
| `technicalAlternatives` | Optional (ADV-004) |
| `humanImpact` | Optional (ADV-005) |
| `ethicalConcerns` | Optional (ADV-005) |
| `inclusionConcerns` | Optional (ADV-005) |
| `longTermEffects` | Optional (ADV-005) |
| Unknown future fields | Must pass through via complete `result` reference |

**Intentionally omitted as top-level Chairman fields:** persona subfields beyond the three denormalized identifiers (they remain inside `result.persona`).

### 9.3 Build input → collectiveIntelligence

| Source | Target | PR-2 rule |
| ------ | ------ | --------- |
| N/A | `collectiveIntelligence` | `{}` |

### 9.4 Mapping invariants

* MAP-001: Every repository field listed in §9.1 and §9.2 has a defined destination.
* No source field may be dropped unless explicitly listed as intentionally omitted.
* Denormalized Advisor identity fields must match their `result.persona` counterparts.

---

## 10. Dependency and Construction Model

```typescript
export interface Clock {
  now(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};

export class DefaultChairmanContextBuilder implements ChairmanContextBuilder {
  constructor(private readonly clock: Clock = systemClock) {}

  build(input: ChairmanContextBuildInput): ChairmanContext {
    // validate input
    // map decisionContext → request, metadata
    // map advisors → advisors[]
    // return frozen ChairmanContext
  }
}
```

Avoid introducing a dependency injection framework.

---

## 11. Validation and Error Handling

### 11.1 Mandatory validations

The builder must validate at least:

* `input` is defined;
* `input.decisionContext` is defined;
* `input.decisionContext.question` is non-empty;
* `input.advisors` is defined;
* each advisor has `persona.id`;
* each advisor with `status === "success"` has required success fields already enforced by advisor parsers (`summary`, `analysis`, etc.).

The builder must not re-validate Advisor JSON schema. It trusts upstream advisor parsers.

### 11.2 Partial Advisor failures

Preserve current repository behavior.

Failed Advisors (`status === "failed"`) must appear in `ChairmanContext.advisors` with their existing failure representation, including `errorMessage` when present.

The builder must not invent successful content for failed Advisors.

Do not change the system's tolerance for partial failures in this PR.

### 11.3 Domain error

Follow the repository's existing domain-error pattern (`CouncilConfigurationError`, `InvalidModelOutputError` in `src/lib/council/errors.ts`).

```typescript
export type ChairmanContextBuildErrorCode =
  | "INVALID_BUILD_INPUT"
  | "MISSING_DECISION_CONTEXT"
  | "MISSING_QUESTION"
  | "MISSING_ADVISORS"
  | "MISSING_ADVISOR_ID";

export class ChairmanContextBuildError extends Error {
  readonly code: ChairmanContextBuildErrorCode;
  readonly safeMessage: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: ChairmanContextBuildErrorCode,
    safeMessage: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(safeMessage);
    this.name = "ChairmanContextBuildError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.details = details;
  }
}
```

Error messages and logs must not include complete Advisor reasoning, user context, or provider secrets.

### 11.4 Error propagation (ERR-001)

Chairman context build failures must follow the same graceful degradation model as existing Chairman failures in `runChairman`.

| Failure type | Builder behavior | Chairman runner behavior | Orchestrator behavior |
| ------------ | ---------------- | ------------------------ | --------------------- |
| Validation failure (`ChairmanContextBuildError`) | Throw domain error with `safeMessage` | Catch; return `createFailedChairmanResult(executionId, safeMessage)` | Unchanged: council completes with failed Chairman |
| Unexpected exception during build | Propagate or wrap as internal build error | Catch; return failed `ChairmanResult` via `toAdvisorSafeMessage` | Unchanged |
| Successful build | Return `ChairmanContext` | Continue to prompt builder and provider | Unchanged |

Rules:

* Build failures must **not** throw out of `runCouncil`.
* Build failures must **not** change HTTP status semantics.
* Build failures must **not** change `determineCouncilSessionStatus` inputs beyond the existing failed Chairman case.
* Build failures must **not** produce HTTP 500 from the council route unless the current Chairman path already would.

This preserves ADR-0003 §5.4 backward compatibility.

---

## 12. Integration Requirements

### 12.1 Chairman runner

Update `runChairman` in `src/lib/council/chairman-runner.ts`:

```typescript
const chairmanContext = chairmanContextBuilder.build({
  decisionContext,
  advisors,
});

const { systemPrompt, userPrompt } = buildChairmanPrompts(chairmanContext);
```

The runner owns wiring. It must not assemble raw Advisor data for prompt construction.

### 12.2 Prompt builder

Update `buildChairmanPrompts` to accept `ChairmanContext`:

```typescript
export function buildChairmanPrompts(
  chairmanContext: ChairmanContext,
): {
  systemPrompt: string;
  userPrompt: string;
};
```

The prompt builder must:

* read decision fields from `chairmanContext.request`;
* read advisors from `chairmanContext.advisors`;
* serialize complete `AdvisorResult` content (including optional and unknown fields);
* no longer accept separate `DecisionContext` and `AdvisorResult[]` parameters.

Executive instructions in the system prompt must remain semantically equivalent to the current repository baseline.

### 12.3 DecisionContext

Do not modify `DecisionContext` in PR-2.

Do not embed Advisor results in `DecisionContext`.

### 12.4 Advisors

No Advisor implementation, prompt, parser, or router changes.

### 12.5 Orchestrator and router

`runCouncil` continues to call `runChairman(decisionContext, advisorResults)`.

No routing, sequencing, or parallel execution changes.

---

## 13. Serialization Strategy

The builder produces a domain object only.

The prompt builder serializes `ChairmanContext` into prompt text.

Requirements:

* preserve nested `AdvisorResult` fields in the user prompt;
* include optional advisor-specific fields when present;
* avoid manual allowlists that discard future fields;
* avoid `[object Object]` serialization;
* preserve arrays and nested metadata;
* handle `undefined` optional fields according to existing prompt conventions;
* prevent circular references from reaching prompt construction.

PR-2 prompt changes are limited to **data payload enrichment**. The Chairman response JSON schema and system-level executive instructions must not change.

---

## 14. Information Fidelity Strategy

For PR-2, correctness takes precedence over token optimization.

The builder must not truncate, summarize, or omit Advisor or decision fields.

The prompt builder must expose at least all fields currently rendered in `chairman-prompt.ts`, plus previously omitted `AdvisorResult` fields.

Context-window optimization is out of scope.

---

## 15. Testing Strategy

Tests use repository types from `src/types/council.ts` and fixtures reflecting real advisor contracts.

### 15.1 Representative AdvisorResult fixture

Use this baseline fixture in TC-002 and TC-003:

```typescript
const deliveryEngineeringAdvisorResult: AdvisorResult = {
  persona: {
    id: "ADV-004",
    displayName: "The Delivery Engineering Advisor",
    thinkingLens: "delivery-engineering",
    expertise: "Delivery and engineering",
    background: "Engineering leadership",
    yearsExperience: 15,
    mission: "Assess delivery risk",
    decisionStyle: "Pragmatic",
    coreBeliefs: ["Reliability matters"],
    model: "anthropic/claude-3.5-sonnet",
  },
  source: "live",
  status: "success",
  executionId: "exec-adv-004",
  summary: "Phased rollout reduces delivery risk.",
  analysis: [
    { title: "Operational impact", description: "Requires monitoring." },
  ],
  assumptions: ["Team capacity is stable"],
  risks: ["Integration complexity"],
  recommendation: "proceed_with_conditions",
  confidence: 0.72,
  keyArguments: ["Incremental delivery de-risks rollout"],
  unknowns: ["Production traffic profile"],
  engineeringConcerns: ["Service coupling"],
  operationalConcerns: ["On-call load"],
  technicalAlternatives: ["Batch import instead of live upload"],
  durationMs: 1200,
  totalTokens: 850,
};
```

For TC-003 (unknown future fields), extend the fixture at runtime:

```typescript
const extendedResult = {
  ...deliveryEngineeringAdvisorResult,
  experimentalField: { enabled: true, version: 1 },
};
```

### 15.2 Unit tests — builder

#### TC-001 — Builds valid Chairman context

Given a valid `ChairmanContextBuildInput` with multiple advisors, the builder returns a valid `ChairmanContext`.

Assertions:

* `request.question` preserved;
* `advisors.length` matches input;
* `metadata.advisorCount` correct;
* `collectiveIntelligence` is `{}`;
* no exception thrown.

#### TC-002 — Preserves complete AdvisorResult

Given `deliveryEngineeringAdvisorResult`, every defined field remains accessible on `chairmanContext.advisors[0].result`, including optional engineering fields.

#### TC-003 — Preserves unknown future fields

Given an extended result with `experimentalField`, the field remains on `result` without Advisor-specific builder logic.

#### TC-004 — Preserves Advisor ordering

Given advisors A, B, C in input order, output order is unchanged.

#### TC-005 — Does not mutate input

After `build(input)`, `input.decisionContext` and each `AdvisorResult` are unchanged (deep equality on sampled nested values).

#### TC-006 — Deterministic output

With a fixed clock, repeated builds of the same input produce deeply equal outputs.

#### TC-007 — Supports partial failure representation

Given a failed advisor with `status: "failed"` and `errorMessage`, the builder includes it without inventing success fields.

#### TC-008 — Rejects missing decision context

Given `{ advisors: [] }` without `decisionContext`, throws `ChairmanContextBuildError` with code `MISSING_DECISION_CONTEXT`.

#### TC-009 — Rejects missing advisor identity

Given an advisor without `persona.id`, throws `ChairmanContextBuildError` with code `MISSING_ADVISOR_ID`.

#### TC-010 — No Advisor-specific logic

Process an advisor with id `ADV-999` without special-case branches.

#### TC-020 — Preserves all DecisionContext fields

Given a fully populated `DecisionContext` including attachments and `owner`, every §9.1 field is present on `request` or `metadata`.

### 15.3 Unit tests — prompt builder integration

#### TC-011 — Prompt builder receives ChairmanContext

`buildChairmanPrompts` is invoked with `ChairmanContext`, not raw `DecisionContext` and `AdvisorResult[]`.

#### TC-012 — Full result reaches serialization

Optional fields such as `technicalAlternatives` and `keyArguments` appear in the serialized user prompt.

#### TC-013 — No malformed object serialization

Structured data does not appear as `[object Object]`.

### 15.4 Integration tests

#### TC-014 — End-to-end Chairman pipeline

With mocked provider:

* builder invoked once with composite input;
* prompt builder receives `ChairmanContext`;
* provider receives generated prompts;
* pipeline returns `ChairmanResult`.

#### TC-016 — Multiple Advisors

Validate with one, five, and six advisors (including an arbitrary additional advisor), plus mixed success and failure statuses.

#### TC-017 — Build failure degrades gracefully

When the builder throws `ChairmanContextBuildError`, `runChairman` returns a failed `ChairmanResult` and does not throw to the orchestrator.

#### TC-018 — Build failure preserves council session semantics

Council session status determination behaves identically to an existing Chairman provider failure for the same advisor set.

### 15.5 Behavioral equivalence and regression (TC-015, TC-019)

Behavior preservation is **not** byte-for-byte equality of Chairman output.

Define four layers:

| Layer | PR-2 expectation | Verification method |
| ----- | ---------------- | ------------------- |
| **BEH-001 — Orchestration** | Identical | Orchestrator still calls `runChairman(decisionContext, advisors)`; council status rules unchanged | TC-018 |
| **BEH-002 — Chairman failure handling** | Identical | Build errors produce failed `ChairmanResult`, not route/orchestrator exceptions | TC-017 |
| **BEH-003 — Executive instructions** | Identical intent | System prompt semantic parity with current baseline (role, responsibilities, JSON-only output) | TC-019 |
| **BEH-004 — Prompt payload** | Superset enrichment allowed | User prompt must contain all decision fields currently rendered; all previously rendered advisor fields; additionally include previously omitted optional `AdvisorResult` fields | TC-015, TC-012 |

**Acceptable changes:**

* User prompt structure may change to expose additional Advisor fields.
* Chairman output text may vary because the LLM receives richer input and is non-deterministic (`temperature: 0.3`).
* Internal processing gains a builder step.

**Not acceptable:**

* System prompt executive instructions removed or materially weakened.
* Previously rendered decision or advisor fields removed from the user prompt.
* Orchestrator, API, or session status behavior changes.
* Advisor layer changes.

#### TC-015 — Prompt payload superset equivalence

Compare pre-refactor and post-refactor user prompts using fixtures:

* Assert every decision field currently in `chairman-prompt.ts` is present post-refactor.
* Assert every advisor field currently formatted (summary, analysis, assumptions, risks, recommendation, confidence, failure error) is present post-refactor.
* Assert at least one previously omitted optional field (for example, `technicalAlternatives`) is present post-refactor.

Document structural differences in the implementation report.

#### TC-019 — System prompt parity

Assert the post-refactor system prompt preserves all current executive responsibility bullets and JSON-only requirement.

Do not require byte-for-byte match if whitespace differs.

### 15.6 Regression tests

All existing test suites must pass without Advisor semantic changes.

Prompt snapshot updates are permitted only for user-prompt enrichment and must be reviewed against TC-015 rules.

---

## 16. Test Fixtures

Fixtures must include:

* fully populated `DecisionContext` with attachments;
* successful and failed `AdvisorResult` objects;
* optional advisor-specific fields from ADV-003, ADV-004, ADV-005;
* an extension field for forward compatibility;
* deterministic clock double;
* composite `ChairmanContextBuildInput` bundles.

Prefer fixtures extracted from existing tests in `tests/chairman-prompt.test.mjs` and advisor reliability tests where available.

---

## 17. Observability

Do not introduce a full logging framework.

If logging is added, emit low-noise events only:

```text
chairman_context.build.started
chairman_context.build.completed
chairman_context.build.failed
```

Log fields: `executionId`, `advisorCount`, `schemaVersion`, `errorCode`.

Do not log complete Advisor reasoning, user context, credentials, or full prompts.

---

## 18. Performance Requirements

Time complexity: `O(total input size)`.

Avoid repeated deep cloning, redundant serialization, and unnecessary JSON cycles.

Performance optimization must not reduce information fidelity.

---

## 19. Security and Privacy

Preserve existing access boundaries.

Do not add persistence or log complete context.

Preserve existing redaction behavior.

---

## 20. Schema Versioning

Initial value:

```typescript
schemaVersion: "1.0"
```

Increment guidance:

* patch-level implementation changes: no schema increment;
* backward-compatible optional section: minor version;
* breaking contract change: major version.

No migration framework in PR-2.

---

## 21. Future Extension Model

Future capabilities extend `collectiveIntelligence` per ADR-0003 §8.

Core fields `request`, `advisors`, and `metadata` remain stable.

Derived intelligence must remain distinguishable from source `AdvisorResult` data.

---

## 22. Implementation Sequence

1. Inspect `DecisionContext`, `AdvisorResult`, `runChairman`, and `buildChairmanPrompts`.
2. Document current information-loss points in the implementation report.
3. Implement `ChairmanContextBuildInput` and `ChairmanContext` types.
4. Implement `DefaultChairmanContextBuilder` with §9 mappings.
5. Add builder unit tests (TC-001 – TC-010, TC-020).
6. Update prompt builder to accept `ChairmanContext`.
7. Update chairman runner wiring and error propagation (ERR-001).
8. Add integration and equivalence tests (TC-011 – TC-019).
9. Run full test suite, lint, and build.
10. Update architecture documentation (README flow diagram).
11. Produce implementation report with deviations.
12. Commit after all gates pass.

---

## 23. Engineering Gates

### Gate 1 — Architecture

Pass when:

* builder consumes composite input;
* chairman runner no longer prepares raw context;
* prompt builder no longer accepts separate `DecisionContext` and `AdvisorResult[]`;
* no Advisor-specific branches exist.

### Gate 2 — Fidelity

Pass when:

* all §9.1 and §9.2 fields reach `ChairmanContext`;
* optional and unknown Advisor fields preserved;
* no truncation or summarization occurs.

### Gate 3 — Compatibility

Pass when:

* Advisors unchanged;
* orchestrator behavior unchanged;
* Chairman failure degradation unchanged;
* existing tests pass.

### Gate 4 — Quality

Pass when:

* new tests pass;
* lint and type-check pass;
* no unjustified unsafe casts;
* no duplicated canonical contracts.

### Gate 5 — Documentation

Pass when:

* flows documented;
* deviations recorded;
* ADR-0003 and ENG-0002 referenced;
* ARR-0001 blocking items resolved.

---

## 24. Definition of Done

PR-2 is complete only when:

* `ChairmanContextBuilder` exists with composite input contract;
* `ChairmanContext` is versioned;
* complete `AdvisorResult` objects are preserved;
* all `DecisionContext` fields are mapped per §9.1;
* chairman pipeline consumes `ChairmanContext`;
* build failures degrade to failed `ChairmanResult`;
* no Advisor implementation changed;
* no orchestrator routing changed;
* all new and existing tests pass;
* lint and type-check pass;
* TC-015 superset equivalence demonstrated;
* architecture documentation updated;
* working tree clean;
* implementation committed with traceable message.

---

## 25. Acceptance Criteria

The implementation is accepted when the following statements are demonstrably true:

1. **Composite input:** The builder accepts `{ decisionContext, advisors }` and never requires Advisor data inside `DecisionContext`.

2. **Information preservation:** Given any valid `AdvisorResult` currently supported by the repository, including optional and unknown fields, the complete object remains accessible at `chairmanContext.advisors[i].result` without semantic transformation or Advisor-specific logic.

3. **Decision preservation:** Every `DecisionContext` field is accessible through `chairmanContext.request` or `chairmanContext.metadata`.

4. **Failure compatibility:** Build failures produce the same class of degraded council outcome as existing Chairman failures.

5. **Prompt superset:** The user prompt contains at least all information currently rendered by `chairman-prompt.ts`, plus previously omitted optional Advisor fields.

---

## 26. Expected Commit

Preferred message (matches repository convention):

```text
feat(council): introduce Chairman context builder
```

Alternative:

```text
refactor(council): isolate Chairman context construction
```

---

## 27. Implementation Report Requirements

At completion, produce a report containing:

1. Current architecture discovered.
2. Files created.
3. Files modified.
4. Contracts introduced.
5. Previous information-loss points.
6. How complete Advisor information is now preserved.
7. Test cases added.
8. Test, lint, and type-check results.
9. Deviations from ENG-0002.
10. Risks or follow-up recommendations.
11. Commit hash.
12. Push status.
13. Working-tree status.
14. TC-015 structural prompt differences.

---

## 28. Final Architectural Rule

After PR-2:

```text
DecisionContext + AdvisorResult[]
      │
      ▼
ChairmanContextBuilder
      │
      ▼
ChairmanContext
      │
      ▼
Chairman Prompt Builder
      │
      ▼
Chairman
```

No component may bypass this flow when preparing the Chairman's decision context.

Advisor results remain outside `DecisionContext`.

Collective intelligence capabilities defined in ADR-0003 §8 extend the layer through `collectiveIntelligence` without modifying this flow's core contracts.

---

## 29. Governance Note — ADR-0005 Relationship

ADR-0005 states that future improvements should be implemented primarily in the Chairman layer.

ADR-0003 supersedes that guidance for collective intelligence concerns.

PR-2 implements ADR-0003 by introducing the Collective Intelligence Layer. No ADR-0005 amendment is required for implementation to proceed. Future collective intelligence work belongs in this layer, not in Advisor or Chairman components.

---

## 30. Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0003 — Collective Intelligence Layer](../adr/ADR-0003-collective-intelligence-layer.md)
- [ARR-0001 — Architecture Readiness Review](../arr/ARR-0001-architecture-readiness-review.md)
- [IMP-0002 — ChairmanContextBuilder Implementation Plan](../imp/IMP-0002-chairman-context-builder-implementation-plan.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
- [Documentation Index](../README.md)
