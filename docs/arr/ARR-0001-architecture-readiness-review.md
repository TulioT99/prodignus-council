# ARR-0001 — Architecture Readiness Review

**Review type:** Pre-implementation governance checkpoint  
**Sprint:** Sprint 6  
**Reviewer role:** Principal Software Architect  
**Documents reviewed:**
- `docs/adr/ADR-0003-collective-intelligence-layer.md`
- `docs/eng/ENG-0002-chairman-context-builder-technical-specification.md`

**Repository context used for consistency checks only** (not implementation review): current Chairman pipeline in `src/lib/council/chairman-runner.ts`, `chairman-prompt.ts`, `decision-context.ts`, and `src/types/council.ts`.

---

## Executive Summary

ADR-0003 and ENG-0002 are **architecturally aligned** on the core decision: introduce a Collective Intelligence Layer, begin with `ChairmanContextBuilder`, preserve Advisor information, keep the Chairman focused on executive reasoning, and defer consensus/conflict/confidence capabilities to later sprints.

The documents are **substantially implementation-ready**. Scope is controlled, responsibilities are well separated in intent, interfaces are thoughtfully designed, and the testing/governance framework is unusually thorough for a Sprint 6 refactor.

However, several **specification–repository mismatches** must be resolved before coding begins. The most important is that ENG-0002 models Advisor results as part of `DecisionContext`, while the current repository passes `DecisionContext` and `AdvisorResult[]` separately to the Chairman. Secondary gaps include incomplete mapping from the real `DecisionContext` shape, test fixtures that do not match actual `AdvisorResult` fields, and a latent conflict with ADR-0005’s “implement in the Chairman layer” guidance.

None of these invalidate the architecture. They create **implementation ambiguity** that could cause incorrect contracts, accidental behavior change, or rework if not clarified at Step 1 of the implementation sequence.

**Recommendation:** **PASS WITH RECOMMENDATIONS** — implementation may begin after resolving the blocking recommendations below, ideally as a short pre-implementation clarification pass on ENG-0002 §7 and §9 (no architectural change required).

---

## Strengths

1. **Clear architectural boundary.** ADR-0003 cleanly separates execution state (`DecisionContext`), collective intelligence preparation, prompt construction, and Chairman deliberation. This directly addresses the known coupling in the current pipeline, where `buildChairmanPrompts(decisionContext, advisors)` both locates Advisor data and formats the executive prompt.

2. **Scope discipline.** Both documents explicitly exclude consensus, conflict detection, evidence ranking, confidence aggregation, reputation, memory, and token optimization from PR-2. The Sprint 7–12 roadmap gives future capabilities a home without pulling them into Sprint 6.

3. **Strong information-preservation doctrine.** ADR §5.2 and ENG invariants INV-001 through INV-006 directly target the repository’s most important known weakness: `chairman-prompt.ts` currently formats only a subset of `AdvisorResult` (e.g. `assumptions`, `risks`) and omits advisor-specific structured fields such as `keyArguments`, `unknowns`, `technicalAlternatives`, and domain-specific concern arrays.

4. **Extensibility without over-engineering.** `collectiveIntelligence: {}` as a neutral extension point in PR-2 is the right minimal design. It satisfies ADR §5.3 without implementing speculative features.

5. **Implementation governance.** ENG-0002’s invariants, engineering gates, definition of done, acceptance criteria, and 16 test cases provide unusually strong traceability from architecture to verification.

6. **Repository-aware flexibility.** ENG §6 explicitly defers module placement to existing conventions (`src/lib/council/` rather than the conceptual `src/chairman/` tree), and §12.3 avoids unnecessary `DecisionContext` modification — consistent with ADR Alternative B rejection.

---

## Findings

### Critical

| ID | Finding |
|----|---------|
| **C-01** | **Builder input contract does not match repository reality.** ENG §7.1 defines `build(decisionContext: DecisionContext)`, and INV-001 states Advisor results are “present in `DecisionContext`.” In the current repository, `DecisionContext` contains no Advisor results; `runChairman(decisionContext, advisors)` receives them separately. Implementing the interface literally would block compilation or force an undocumented `DecisionContext` extension contrary to ADR Alternative B and ENG §12.3. |
| **C-02** | **Internal ENG inconsistency on data source.** §5.1/§7 require preserving Advisor results from `DecisionContext`; §12.1 shows a builder fed only `decisionContext`; §9 mapping table sources “Advisor results” independently of request metadata. The implementer must infer a composite input type not formally specified. |

### Major

| ID | Finding |
|----|---------|
| **M-01** | **`ChairmanRequestContext` mapping is incomplete.** ENG §7.3 defines `id`, `question`, `originalInput`, `constraints[]`, and `metadata`. The repository’s `DecisionContext` includes `executionId`, `decisionId`, `title`, `language`, `context`, `constraints` (string), `objectives`, `attachments`, `timestamp`, `status`, and `owner`. No mapping rules specify where `title`, `language`, `context`, `objectives`, `attachments`, or `executionId` land in `ChairmanContext`. Silent omission would violate ADR §5.2 and ENG §4.2. |
| **M-02** | **Test fixtures in TC-002 do not reflect repository contracts.** Example fields (`reasoning`, `evidence`, `alternatives`, `citations`, `nestedMetadata`) are not part of current `AdvisorResult`. This conflicts with ENG §16 (“reflect real repository contracts”). Implementers may optimize tests for the wrong shape and miss fidelity gaps on real fields like `keyArguments`, `unknowns`, `technicalAlternatives`, and advisor-specific concern arrays. |
| **M-03** | **ADR-0005 conflicts with ADR-0003 on evolution path.** ADR-0005 states future improvements should be implemented “primarily in the Chairman layer.” ADR-0003 mandates collective intelligence features live in the Collective Intelligence Layer. For Sprint 6 this is reconcilable (ADR-0003 is newer and more specific), but governance traceability is broken until ADR-0005 is annotated or superseded. |
| **M-04** | **Behavior preservation vs. information fidelity tension.** ENG §1 and §2 require preserving semantic Chairman behavior, while §14 and acceptance criteria require exposing previously omitted Advisor fields to prompt generation. Given current prompt truncation, TC-015 “functional equivalence” plus improved fidelity may produce different Chairman outputs. The spec acknowledges this partially (TC-015) but does not define the acceptance threshold for “semantic equivalence” when prompt content expands. |
| **M-05** | **Error propagation strategy undefined.** ENG §11.3 introduces domain errors for invalid build input, but does not specify whether `ChairmanContextBuildError` fails the council session, produces a failed Chairman result, or surfaces as HTTP 500. Current Chairman failures degrade gracefully to `ChairmanResult.status = "failed"`. A new hard failure mode would change orchestration behavior unless explicitly aligned. |

### Minor

| ID | Finding |
|----|---------|
| **m-01** | **ADR target flow omits `ChairmanContext`.** ADR §3 and §9 show “Collective Intelligence Layer → Chairman Prompt Builder” without naming the intermediate contract object that ENG-0002 makes central. Conceptually consistent, but diagrammatically incomplete. |
| **m-02** | **ADR heading/format inconsistency.** ADR-0003 uses em dash and numbered `# 1.` sections; ADR-0005 uses colon and `## Status`. Does not block implementation but weakens documentation cohesion. |
| **m-03** | **Determinism vs. timestamp generation.** ADR §5.5 and ENG §4.3 require deterministic output; ENG §7.6 requires `contextBuiltAt`. Production builds using a real clock are deterministic only modulo time. Acceptable if documented; currently implicit. |
| **m-04** | **Module example uses `.spec.ts`; repository uses `.test.mjs`.** ENG §6 shows Jest-style naming; repo convention is Node native tests under `tests/`. ENG §6 allows adaptation, but implementers should not introduce a second test framework. |
| **m-05** | **“Executive Briefing” appears in ADR §9 vision but is undefined.** Not in Sprint 6 scope; future ADR/ENG will be needed before implementation. |

### Observations

| ID | Finding |
|----|---------|
| **O-01** | ENG includes detailed observability, performance, security, and schema-versioning sections not mirrored in ADR-0003. Acceptable as engineering elaboration. |
| **O-02** | ADR numbering gap (0003 exists; 0001, 0002, 0004 absent). Governance cosmetic issue only. |
| **O-03** | ENG Gate 5 requires architecture documentation updates; README currently describes pre–Collective Intelligence Layer flow. Expected post-implementation work. |
| **O-04** | `collectiveIntelligence` fields typed as `unknown` are appropriate for PR-2 but will require typed sub-ENG specs before Sprint 7. |

---

## Recommendations

### Blocking (resolve before or at the start of implementation)

1. **Clarify builder input signature in ENG-0002.** Specify an explicit input such as:
   ```typescript
   build(input: { decisionContext: DecisionContext; advisors: readonly AdvisorResult[] }): ChairmanContext
   ```
   Update INV-001 wording accordingly. Do not embed Advisor results in `DecisionContext` (consistent with ADR Alternative B rejection).

2. **Publish a complete field mapping table** from repository `DecisionContext` and `AdvisorResult` to `ChairmanContext` sub-objects. Every current field should have a defined target (`request`, `metadata`, or `advisors[].result`).

3. **Replace TC-002 fixture fields** with the actual `AdvisorResult` shape, including optional advisor-specific fields and a representative `experimentalField` extension for TC-003.

4. **Define TC-015 equivalence criteria.** State explicitly whether expanded prompt content that preserves more Advisor data is allowed to change Chairman output, and how regression will be measured (structural prompt diff, field-presence assertions, mocked provider snapshot).

5. **Define error propagation.** Specify that builder validation failures follow existing Chairman graceful-degradation semantics unless a deliberate orchestrator change is approved.

6. **Reconcile ADR-0005 with ADR-0003.** Add a short “Supersedes / clarifies” note in ADR-0005 Future Work or a cross-reference in ADR-0003 stating collective intelligence evolution occurs in the Collective Intelligence Layer, not by expanding Chairman responsibilities.

### Non-blocking

1. Update ADR §3 target-flow diagram to include `ChairmanContext`.
2. Standardize ADR document format (title delimiter, section heading levels).
3. Add a note that production `contextBuiltAt` is time-derived and excluded from determinism assertions unless clock is injected.
4. Plan ENG-0003 (or equivalent) for Sprint 7 consensus/conflict pipeline composition — i.e., whether future analyzers wrap, enrich, or replace builder stages.
5. Add TC-017 for empty Advisor list and TC-018 for full `DecisionContext` attachment/objective preservation.

---

## Architecture Scores

| Dimension | Score | Justification |
|-----------|-------|---------------|
| **Architecture (ADR-0003)** | **8/10** | Sound layered model, clear principles, good alternatives analysis, credible long-term vision. Deductions for ADR-0005 conflict, missing intermediate contract in diagrams, and undefined future sub-components beyond the builder. |
| **Engineering Specification (ENG-0002)** | **8/10** | Comprehensive contracts, invariants, gates, and tests. Deductions for input-contract ambiguity, incomplete mapping, and fixture mismatch with repository types. |
| **Modularity** | **8/10** | Clean separation of builder, context, prompt builder, and runner. Slight overlap risk if `ChairmanRequestContext` duplicates much of `DecisionContext`. |
| **Maintainability** | **8/10** | Documents are readable and discoverable under `docs/adr/` and `docs/eng/`. Module-path example could mislead; ADR format inconsistency adds minor onboarding friction. |
| **Extensibility** | **9/10** | `collectiveIntelligence` extension point and stable core fields support Sprints 7–12 without Chairman changes. Future pipeline composition among multiple layer components still needs design. |
| **Scalability** | **8/10** | Linear in-memory builder scales for more Advisors and richer outputs. Memory, history, reputation, and multi-Chairman scenarios will require additional ADRs and persistence design not yet specified. |
| **Testability** | **8/10** | Strong unit/integration/regression plan with determinism and immutability cases. Missing real-type fixtures, equivalence methodology, and builder-error propagation tests. |
| **Governance** | **7/10** | Good ADR↔ENG linkage and engineering gates. Weakened by ADR numbering gaps, ADR-0005 conflict, and absence of formal trace IDs from invariants to test cases. |
| **Documentation** | **8/10** | Both documents are thorough and internally structured. Need alignment with existing repo types and prior ADRs. |
| **Overall Readiness** | **7.5/10** | Architecture is approved-quality; engineering contract needs targeted clarification on inputs and mapping before coding to avoid rework or accidental behavior change. |

---

## Detailed Review by Criterion

### 1. Architectural Consistency

ENG-0002 implements ADR-0003’s first Sprint 6 deliverable faithfully. No engineering requirement contradicts ADR prohibitions on summarization, ranking, consensus, or Chairman reasoning replacement.

Gaps are **specification accuracy** issues (C-01, C-02, M-01), not architectural opposition. No ADR decision is missing from ENG except diagram-level naming of `ChairmanContext` (m-01).

### 2. Scope Validation

PR-2 scope is appropriate and well bounded. Explicit exclusions match the review checklist. No scope creep detected in either document.

**Risk note:** Improved information fidelity in prompt serialization may feel like “Chairman prompt redesign.” It remains in scope if framed as contract refactor preserving executive instructions while expanding data payload — but M-04 should be managed explicitly.

### 3. Responsibility Analysis

Target responsibility chain is correct:

```text
DecisionContext + AdvisorResults
      ↓
ChairmanContextBuilder
      ↓
ChairmanContext
      ↓
ChairmanPromptBuilder
      ↓
Chairman
```

No duplicated deliberation responsibility. Current duplication of context assembly in `chairman-prompt.ts` is correctly assigned to the builder in the target model.

**Duplication risk:** `ChairmanRequestContext` vs. `DecisionContext` unless mapping is minimal and purposeful (executive-facing slice vs. execution record).

### 4. Coupling Analysis

Coupling is reduced relative to today: prompt builder should depend on `ChairmanContext`, not on raw orchestration artifacts.

**Hidden coupling to resolve:** Advisor ordering comes from `ADVISOR_EXECUTION_ORDER` in the orchestrator, not from `DecisionContext`. Builder must receive advisors in canonical order; ENG INV-003 covers this if input array order is defined as canonical.

**Fragility risk:** Prompt serialization remains the fidelity bottleneck after the builder. Builder correctness alone does not guarantee ADR §5.2 compliance unless prompt builder also removes field allowlists — ENG §13 addresses this but spans two components.

### 5. Interface Review

Interfaces are cohesive, immutable-oriented, versioned, and extensible. Naming is mostly consistent with repository conventions (`DecisionContext`, `AdvisorResult`).

**Missing interface element:** formal builder input bundle (Critical).

**Potentially unnecessary element:** `originalInput?: unknown` in `ChairmanRequestContext` unless mapped to an existing repository field.

### 6. Extensibility Review

Architecture supports future consensus, conflict, evidence, confidence, reputation, memory, and history through `collectiveIntelligence` and incremental layer expansion without Chairman contract changes.

**Future risk:** ADR §9 lists many sub-components inside one layer box. Sprint 7+ may need a pipeline pattern (builder → analyzers → enriched context) vs. a monolithic builder — not a Sprint 6 blocker.

### 7. SOLID Evaluation

| Principle | Score | Assessment |
|-----------|-------|------------|
| **Single Responsibility** | **9/10** | Builder prepares context; prompt builder serializes; Chairman deliberates. Clear boundaries. |
| **Open/Closed** | **8/10** | Core context stable; extensions via `collectiveIntelligence`. Prompt builder may need careful OCP if serialization format is rigid. |
| **Liskov Substitution** | **8/10** | `ChairmanContextBuilder` interface supports alternate implementations (e.g. test doubles). Not yet applied in repo. |
| **Interface Segregation** | **7/10** | `ChairmanContext` is moderately broad but justified as an executive briefing aggregate. |
| **Dependency Inversion** | **7/10** | Clock injection recommended; runner should depend on builder and prompt abstractions. Current code uses concrete functions — acceptable if PR-2 introduces injectable defaults without a DI framework. |

### 8. Maintainability — **8/10**

See scores above. Primary onboarding friction is reconciling ENG conceptual types with `src/types/council.ts`.

### 9. Testability

ENG-0002 testing guidance is strong: 16 cases covering preservation, ordering, immutability, determinism, partial failure, integration, and regression.

**Missing scenarios:**
- Real `AdvisorResult` optional fields (M-02)
- Full `DecisionContext` preservation
- Builder error → Chairman failure path (M-05)
- Empty advisor collection
- Attachment and language fields reaching prompt output

### 10. Implementation Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong builder input contract | **High** | Clarify composite input before coding (Blocking #1) |
| Accidental Chairman behavior change via richer prompts | **High** | Define TC-015 equivalence rules (Blocking #4) |
| Incomplete DecisionContext mapping | **Medium** | Complete mapping table (Blocking #2) |
| ADR-0005 misdirects future work to Chairman layer | **Medium** | Cross-reference/supersede note (Blocking #6) |
| Builder errors change session semantics | **Medium** | Align with graceful Chairman failure (Blocking #5) |
| Module/test convention drift | **Low** | Follow `src/lib/council/` and `tests/*.test.mjs` |

### 11. Future Scalability

| Scenario | Validity |
|----------|----------|
| Advisor count doubles | **Valid** — linear builder, no advisor-specific logic |
| Chairman evolves | **Valid** — consumes stable `ChairmanContext` |
| Memory introduced | **Partially valid** — needs persistence ADR; extension point exists |
| Consensus engine | **Valid** — fits `collectiveIntelligence`; pipeline composition TBD |
| Reputation system | **Valid** — likely metadata/history extension |
| Multiple Chairmen | **Not yet addressed** — would need Chairman persona dimension on context |
| Parallel execution | **Valid** — builder is synchronous and side-effect free |

### 12. Traceability

```text
ADR-0003 (layer decision, principles, Sprint 6 scope)
      ↓
ENG-0002 (builder contract, invariants, tests, gates)
      ↓
Implementation (PR-2 — not yet started)
      ↓
Tests (TC-001–TC-016 defined)
      ↓
Review (this ARR)
```

**Traceability gaps:**
- Invariants lack IDs cross-linked to test case IDs in a matrix
- ADR-0005 not updated to reference ADR-0003
- Sprint 7–12 ADR capabilities lack downstream ENG documents
- ARR-0001 itself is not yet filed in `docs/` (acceptable for this review pass)

---

## 13. Readiness Assessment

| Question | Assessment |
|----------|------------|
| Are implementation requirements complete? | **Mostly yes**, with input-contract and mapping gaps |
| Is architecture sufficiently stable? | **Yes** |
| Is implementation ambiguity minimal? | **Moderate** — concentrated in §7 input model and §9 mapping |
| Is additional design work necessary? | **Minimal clarification only**, not a new ADR |

Implementation should begin **after** the blocking recommendations are addressed in ENG-0002 (or a short addendum / implementation brief). No fundamental redesign is required.

---

## Final Decision

## **PASS WITH RECOMMENDATIONS**

**Justification:** ADR-0003 establishes a sound, necessary architectural layer. ENG-0002 provides a strong implementation contract with excellent test and gate coverage. The identified issues are **specification precision problems** aligned with known repository realities, not flaws in the architectural direction. They can be resolved quickly without reopening ADR-0003.

Implementation should **not** proceed on the literal `build(decisionContext: DecisionContext)` signature or INV-001 wording without correction — that is the sole reason this is not a clean **PASS**.

A **FAIL** is not warranted: no contradictory architectural decision, no scope explosion, and no missing layer concept would force redesign.

---

## Readiness Checklist

```text
ADR approved                      ✅
ENG complete                      ⚠️  (complete with clarifications needed)
Scope controlled                  ✅
Interfaces defined                ⚠️  (builder input bundle underspecified)
Testing defined                   ✅
Coupling acceptable               ✅
Extensibility acceptable          ✅
Implementation ambiguity          Moderate
Ready for implementation          YES, after blocking recommendations
```

---

*This review evaluated architecture and specifications only. No implementation code was assessed. Documents were not modified.*

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](../ops/OPS-0001-engineering-workflow-standard.md)
- [ADR-0003 — Collective Intelligence Layer](../adr/ADR-0003-collective-intelligence-layer.md)
- [ENG-0002 — ChairmanContextBuilder Technical Specification](../eng/ENG-0002-chairman-context-builder-technical-specification.md)
- [IMP-0002 — ChairmanContextBuilder Implementation Plan](../imp/IMP-0002-chairman-context-builder-implementation-plan.md)
- [AIR-0001 — ChairmanContextBuilder Architecture Implementation Review](../air/AIR-0001-chairman-context-builder-architecture-implementation-review.md)
- [ICR-0002 — ChairmanContextBuilder Implementation Completion Report](../icr/ICR-0002-chairman-context-builder-implementation-completion-report.md)
- [Documentation Index](../README.md)
