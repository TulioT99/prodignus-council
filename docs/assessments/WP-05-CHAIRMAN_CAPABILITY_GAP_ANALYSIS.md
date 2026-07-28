---
id: WP-05-CHAIRMAN_CAPABILITY_GAP_ANALYSIS
title: WP-05 Chairman Capability Gap Analysis
subtitle: Architecture-to-implementation gap analysis — ENG-0007 vs WP-04 Chairman baseline
version: "1.0"
status: Complete
classification: Capability Gap Analysis / Implementation Scope Contract
owner: Prodignus Architecture / Engineering
created: 2026-07-27
updated: 2026-07-27
related:
  - ENG-0007
  - ENG-0006
  - ENG-0003
  - ENG-0004
  - ADR-0002
  - ADR-0006
  - ADR-0007
  - ADR-0008
  - ARR-0004
  - IMP-0001
  - WP-04-IMPLEMENTATION-BASELINE
work_package: WP-05 Chairman Decision Engine Enhancement
imp: IMP-0001
repository: prodignus-council
verdict: Significant Gaps
---

# WP-05 — Chairman Capability Gap Analysis

## Document Control

| Field | Value |
|---|---|
| Title | WP-05 Chairman Capability Gap Analysis |
| Repository | `prodignus-council` |
| Branch | `master` |
| Mode | Read-only architecture-to-implementation gap analysis |
| Governing specification | **ENG-0007** — Chairman Decision Engine Engineering Specification (Approved v1.0) |
| Canonical source | `hercules-knowledge/engineering/ENG-0007-CHAIRMAN_DECISION_ENGINE_ENGINEERING_SPECIFICATION.md` |
| Implementation baseline | WP-04 @ `3146af80bf1455f6adede8ba6979bd11bf20818a` |
| Assessment HEAD | `f448eed364bd172c21f11a65ef18d40a6baaa4bb` (docs-only after baseline; Chairman source identical to WP-04) |
| Application code modified | **None** |
| Commits created | **None** |
| Assessment date | 2026-07-27 |

### Assessment constraints (validated)

- No source-code modifications
- No runtime behavior changes
- No prompts created or modified
- No implementation commits
- Comparison always against WP-04 canonical Chairman implementation
- Post-baseline evolution inspected: only documentation (`docs: publish WP-04 architecture evidence`); Chairman implementation files unchanged

### Evidence baseline note

ENG-0007 cites WP-04 @ `3146af8` as architectural evidence. `git diff 3146af8..HEAD` for all Chairman implementation, types, orchestrator, and Chairman tests is empty. Findings below therefore describe the WP-04 published Chairman state.

---

## A. Executive Summary

The Decision Council already has a **working Chairman stage** in the correct pipeline position: after Consensus Engine publication, before presentation. WP-04 wired a published Consensus Package into Chairman context and prompts. Schema-validated success outputs, insufficient-participation gating, UI non-render of failed Chairman recommendations, provider-bounded OpenRouter retries, and provider-independent domain types are present.

Against **ENG-0007 Approved v1.0**, the implementation remains a **pre-Decision-Engine synthesis path**, not a complete Chairman Decision Engine. The largest gaps are:

1. **Decision Policy (§8 / AC-CH-15)** — prompt guidance only; not enforceable contracts, validation, or tests.
2. **Decision metadata (§6.2 / AC-CH-10)** — required governance metadata largely absent from the published decision package.
3. **Confidence triad (§10 / AC-CH-09)** — consensus confidence exists upstream; Chairman emits a single confidence number; decision certainty is not a distinct published concept.
4. **Failure / recovery contract (FR-CH-02/03/05; AC-CH-04/05/11)** — failed results populate placeholder recommendation fields; schema-invalid generative output is not recovered under a Chairman-bounded retry; reason taxonomy remains WP-02-minimal.
5. **Test coverage (§15 / AC-CH-16)** — orchestration and parse tests exist; Decision Policy, metadata, confidence separation, and fabricated-certainty rejection are uncovered.

**Overall Readiness: Significant Gaps**

The architecture is **aligned enough to implement without redesign** (not Architecture Misalignment). Scope is ready to plan and execute WP-05 as ENG-0007-bound enhancement/stabilization — not as a greenfield rewrite.

---

## B. Capability Assessment by Area

Status values: **Fully Implemented** | **Partially Implemented** | **Missing** | **Not Applicable**

### 1. Chairman Responsibilities (§4, AC-CH-01/02/03/12/19)

| Assessment | Partially Implemented |
|---|---|

**Evidence**

- Orchestrator order is PKOS → advisors → `buildConsensusPackage` → `runChairman(..., { consensus })` → result (`src/lib/council/orchestrator.ts`).
- Context builder embeds the package into `collectiveIntelligence` (`chairman-context-builder.ts`).
- Prompt marks the package as authoritative and forbids rediscovery from prose alone (`chairman-prompt.ts` Consensus Package section).
- Chairman does not call advisors, PKOS CRE, or consensus engine code paths.
- Consensus input remains **optional** in `RunChairmanOptions` / `ChairmanContextBuildInput`; live path always passes it, but the contract does not hard-require publication (AC-CH-02 residual).

**WP-05 Action:** Enforce required Consensus Package on the governed path; keep responsibility boundaries; do not redesign Consensus/PKOS/advisors.

### 2. Decision Policy (§8, AC-CH-15)

| Assessment | Partially Implemented |
|---|---|

**Evidence**

- Informal prompt “Decision policy” exists (prefer conditions/experiment; defer rules; do not invent facts).
- Output taxonomy includes `defer` / `insufficient_information` and optional `minorityView`.
- No published field/marker for **explicit consensus divergence**.
- No contract/validator proving default consensus alignment, evidence-justified divergence, minority acknowledgement, or rejection of fabricated certainty.
- `allowInventedAdvisorContent` exists in runtime config defaults/load but is **never read** by Chairman runner/prompt/parser (inert surface).

**WP-05 Action:** Encode Decision Policy as enforceable decision-package contracts + fixture tests; keep algorithms/prompts out of ENG scope (non-prescription).

### 3. Inputs (§5)

| Assessment | Partially Implemented |
|---|---|

| Input element | Status | Evidence |
|---|---|---|
| Consensus Package | Partial | Consumed when provided; optional in types; rendered into prompt |
| PKOS context | Partial | `request.pkosEvidence` / `formatCanonicalEvidenceSection`; retrieval status signals not first-class Chairman decision fields |
| Request context | Fully | `ChairmanRequestContext` mirrors `DecisionContext` |
| Execution metadata | Partial | Advisor execution metadata + context `metadata`; incomplete relative to §5 participation/config identity as decision lineage |
| Confidence metadata | Partial | Consensus confidence + per-advisor confidence in package/prompt; not preserved as distinct decision-package concepts |
| Traceability references | Partial | `executionId` / `decisionId`; no dedicated consensus-package identity on Chairman result |
| Chairman configuration | Partial | Runtime config for min advisors, timeouts, model env; Decision Policy / fail-closed knobs incomplete |

**WP-05 Action:** Tighten required input validation; surface degradation/retrieval status into decision lineage; keep PKOS retrieval outside Chairman.

### 4. Outputs (§6.1, AC-CH-04)

| Assessment | Partially Implemented |
|---|---|

**Present:** recommendation stance/statement, rationale (`finalRecommendation` / `rationale`), disagreements, minority view, unknowns, conditions/risks/next actions, single confidence, execution telemetry (`model`, tokens, duration).

**Missing / weak relative to ENG-0007:** first-class uncertainty statement; explicit dissent acknowledgement tied to consensus minority lineage; Chairman confidence distinct from consensus confidence; decision certainty; §6.2 decision metadata; consensus-package linkage on the decision package.

**WP-05 Action:** Extend `ChairmanResult` / decision-package contract for ENG-0007 outputs without inventing a second executive reasoner in presentation.

### 5. Decision Metadata (§6.2, AC-CH-10)

| Assessment | Missing |
|---|---|

| Metadata element | Present? | Evidence |
|---|---|---|
| Decision identifier | Partial / Missing | `executionId` / `decisionId` exist; no distinct published **decision package** identity |
| Decision timestamp | Missing | No decision-publish timestamp on `ChairmanResult` (context has `contextBuiltAt` only) |
| Chairman specification version | Missing | Context `schemaVersion: "1.0"` is context schema, not Chairman Decision Engine version |
| Governing ENG version | Missing | No `ENG-0007` version on success or failure outcomes |
| Consensus Package identifier | Missing | Package uses `executionId`; Chairman result does not record consumed package identity |
| Traceability identifier | Partial | `executionId` serves correlation; not complete §6.2 set |
| Execution metadata reference | Missing | No explicit reference field on decision/failure package |

Failure outcomes also lack required identity/version/traceability metadata beyond `executionId` + `errorMessage`.

**WP-05 Action:** Implement §6.2 metadata on success and failure paths as first-class governance fields.

### 6. Confidence Model (§10, AC-CH-09)

| Assessment | Partially Implemented |
|---|---|

**Evidence**

- Consensus confidence object exists (`ConsensusPackage.confidence`) and is rendered to the Chairman prompt separately from advisor confidence mean.
- Chairman emits one `confidence` number (0–1 after parse normalization).
- Presentation shows “overall confidence” from Chairman confidence only (`council-display.ts`).
- No published **decision certainty** concept.
- No contract preventing Chairman confidence from silently exceeding justified certainty (prompt prohibition only).

**WP-05 Action:** Publish three distinct concepts; document mapping method; keep upstream consensus confidence visible.

### 7. Uncertainty Management (§11, AC-CH-06/08)

| Assessment | Partially Implemented |
|---|---|

| Scenario | Status | Evidence |
|---|---|---|
| Conflicting evidence | Partial | Consensus disagreement/unresolved conflicts in prompt; output via `disagreements` / `unknowns` — not policy-gated |
| Insufficient evidence | Partial | `insufficient_information` / `defer` taxonomy; not Decision-Policy-enforced |
| Degraded consensus | Partial | Degradation flags rendered in prompt; `reducedConfidenceSynthesis` / `missingPerspectives` on result; not full disclosure contract |
| Low confidence | Partial | Numeric confidence only; no structured certainty qualification |
| Missing advisors | Partial | Insufficient-council fail-closed; missing perspectives listed; `allowInventedAdvisorContent` unused |

**WP-05 Action:** Require uncertainty communication minimum under material uncertainty; bind degradation disclosure to decision package.

### 8. Explainability (§12)

| Assessment | Partially Implemented |
|---|---|

**Evidence**

- Rich structured fields (rationale, keyArguments, disagreements, minorityView, reversalCriteria).
- Evidence-package content enters prompts; material claims are not systematically identifier-linked in the decision package.
- Orchestration/context assembly are fixture-testable; generative text variability acknowledged.
- Audit reconstructability blocked by missing §6.2 metadata.

**WP-05 Action:** Strengthen lineage references and audit metadata; keep rationale quality under contract/tests, not prompt-only hope.

### 9. Failure Handling (§13, AC-CH-04/05/11; FR-CH-02/03/05)

| Assessment | Partially Implemented |
|---|---|

**Evidence — strengths**

- Context-build failures, missing model config, insufficient advisors, provider errors, and invalid JSON parse return `status: "failed"`.
- UI: `shouldRenderCouncilRecommendation` requires success; `ChairmanCard` failed branch shows alert only; `CouncilResults` shows failure banner (`chairman-card.tsx`, `council-display.ts`, `council-results.tsx`).
- OpenRouter provider retries are bounded via `getRuntimeConfig().retry` with chairman lifecycle diagnostics.

**Evidence — gaps**

- `createEmptyChairmanFields()` sets `decision: "insufficient_information"` and non-empty recommendation/rationale placeholders on **all** failures — operational failure payloads look like semantic Insufficient Evidence content (API returns full `result`).
- Schema-invalid generative output is parsed **after** `callOpenRouter` returns; `InvalidModelOutputError` is not re-entered into provider/Chairman recovery (FR-CH-05 / AC-CH-05 incomplete).
- Terminal reason codes remain WP-02 minimal (`CHAIRMAN_SYNTHESIS_FAILURE`, etc.); not a full Chairman reason taxonomy.
- `runChairman` does not accept `AbortSignal` (WP-03 deferred observation remains).
- No explicit `ChairmanFailed` named terminal type; status `"failed"` + session reason codes approximate it.

**WP-05 Action:** Fail-closed clean failure packages; Chairman-bounded recovery including schema invalidation; expand reason taxonomy; wire abort if in WP-05 scope.

### 10. Traceability (§6.2, §12, AC-CH-10)

| Assessment | Partially Implemented |
|---|---|

**Evidence:** Session/`executionId`/`decisionId` lineage; consensus package retained on `CouncilResult.consensus`; integrity diagnostics on decision context. Missing: decision-package identity, governing ENG/spec versions, explicit consensus-package and execution-metadata references on Chairman outcomes.

**WP-05 Action:** Complete decision lineage fields on published success and failure packages.

### 11. Extensibility (§14)

| Assessment | Partially Implemented |
|---|---|

**Evidence**

- Context builder `collectiveIntelligence.extensions` and frozen context support additive fields.
- Consensus contract is stable upstream (ENG-0006 / WP-04).
- Decision Policy, confidence triad, and metadata are not yet stable extension points — adding them now is WP-05 contract work, not redesign of Consensus/PKOS.

**WP-05 Action:** Introduce Decision Engine contracts behind stable I/O so future strategies plug in without moving synthesis into Consensus or presentation.

### 12. Testing Coverage (§15, AC-CH-16)

| Assessment | Partially Implemented |
|---|---|

| Category | Coverage |
|---|---|
| Deterministic orchestration / context | Covered (`chairman-context-builder`, `chairman-prompt`, consensus integration) |
| Schema parse / reject | Covered (`chairman-response-parser`) |
| Insufficient council / failed paths | Partially covered (`chairman-runner`, orchestrator integration) |
| UI non-render of failed recommendation | Covered (`chairman-card` / `shouldRenderCouncilRecommendation`) |
| Decision Policy conformance | **Uncovered** |
| Explicit divergence / fabricated certainty rejection | **Uncovered** |
| Decision metadata / confidence triad | **Uncovered** |
| Schema-invalid recovery budgeting | **Uncovered** |
| AC-F-05 API payload cleanliness | **Partial** (UI only) |

**WP-05 Action:** Add fixture suites mapped to §15 categories and AC-CH-*.

---

## C. Complete ENG-0007 Traceability Matrix

Every ENG-0007 acceptance criterion and normative chapter requirement appears **exactly once**. Status and WP-05 actions are evidence-based.

| ENG-0007 Requirement | Current Status | Evidence | WP-05 Action |
|---|---|---|---|
| §1.2 Sole post-consensus generative authority | Fully Implemented | Only Chairman stage invokes post-consensus LLM; Consensus Engine is non-generative (`consensus/*`, orchestrator call count tests) | Validate / regression-lock |
| §2 Evidence Before Conclusion | Partially Implemented | Prompt forbids inventing facts; PKOS evidence section present; no hard validation against fabricated evidence/citations | Enforce via contracts + tests |
| §2 Explainability principle | Partially Implemented | Structured rationale fields exist; audit metadata incomplete | Improve |
| §2 Human-Governed AI | Fully Implemented | Advisory recommendation model; presentation/briefing consume Chairman output; no institutional approval claim in domain types | None |
| §2 Separation of Reasoning Responsibilities | Fully Implemented | Advisors / Consensus / Chairman stages separated in orchestrator | Validate |
| §2 Traceability principle | Partially Implemented | `executionId`/`decisionId`/consensus on `CouncilResult`; §6.2 incomplete | Extend |
| §2 Transparency principle | Partially Implemented | Degradation/missing perspectives partially surfaced; silent inflation not contract-blocked | Enhance |
| §2 Accountability principle | Fully Implemented | Chairman owns recommendation content; UI presentation separates failure | Validate |
| §2 Deterministic Orchestration | Partially Implemented | Fixed stage order; config-governed mins/timeouts/retries; Chairman abort not wired; schema recovery not budgeted at Chairman layer | Extend |
| §2 Controlled Generative Reasoning | Partially Implemented | Generative only in Chairman after consensus on live path; optional consensus typing weakens precondition | Enforce required package |
| §2 Provider Independence | Fully Implemented | Domain types provider-agnostic; OpenRouter isolated in client | Validate |
| §2 Resilient to incomplete evidence | Partially Implemented | Insufficient-council gate; Insufficient Evidence stance possible; policy not enforced | Enhance |
| §2 Auditable | Partially Implemented | Logs + structured fields; §6.2 metadata missing | Implement metadata |
| §2 Testable | Partially Implemented | Strong unit/integration for existing behavior; ENG-0007 policy/metadata gaps untested | Extend tests |
| §2 Extensible | Partially Implemented | Extension hooks in context; Decision Engine contracts not yet stable | Establish contracts |
| §3.3 Boundary: begin only after consensus package | Partially Implemented | Live path publishes then invokes; types allow omission; prompt has “(No consensus package…)” branch | Require on governed path |
| §3.3 Boundary: no advisor invoke / no consensus recompute | Fully Implemented | `runChairman` only builds context/prompts and calls provider | Validate |
| §3.3 Boundary: no direct PKOS retrieval | Fully Implemented | Consumes attached evidence only; CRE runs in orchestrator before advisors | Validate |
| §3.3 Boundary: presentation invents no second conclusion | Fully Implemented | Presentation maps Chairman success fields; failed path blocked from recommendation render | Validate |
| §4.1 Evaluate Consensus Package | Partially Implemented | Package rendered and instructed as authoritative; optional input; no structured interpretation stage beyond prompt | Enhance interpretation contract |
| §4.1 Decide (single recommendation / policy) | Partially Implemented | Single structured recommendation on success; Decision Policy not enforceable | Enhance |
| §4.1 Explain (rationale, dissent, uncertainty, divergence) | Partially Implemented | Fields exist; divergence not explicit; uncertainty incomplete | Enhance |
| §4.1 Communicate decision package / terminal outcomes | Partially Implemented | `ChairmanResult` + terminal reason codes; failure payload contamination | Enhance |
| §4.1 Preserve lineage / degradation / metadata | Partially Implemented | Partial flags; §6.2 missing | Implement |
| §4.2 Never execute advisors / retrieve PKOS / recompute consensus | Fully Implemented | Code paths confirm | Validate |
| §4.2 Never rewrite/discard minority lineage | Partially Implemented | Prompt + optional `minorityView`; no contract requiring acknowledgement of package minorities | Enhance |
| §4.2 Never fabricate evidence/participation/certainty | Partially Implemented | Prompt prohibitions; failed placeholders; inert `allowInventedAdvisorContent` | Enforce |
| §4.2 Never convert operational failure to semantic dissent | Partially Implemented | Failed advisors categorized in prompt; failed Chairman still uses `insufficient_information` placeholders | Fix failure package |
| §4.2 Never claim institutional final authority | Fully Implemented | Advisory briefing model | None |
| §4.2 Never depend on specific LLM vendor in domain contracts | Fully Implemented | Domain contracts free of OpenRouter types | Validate |
| §5.1 Consensus Package input | Partially Implemented | Consumed when present; optional | Require + validate |
| §5.1 PKOS context input | Partially Implemented | Evidence package on request; retrieval status not decision-first-class | Extend |
| §5.1 Request context input | Fully Implemented | `ChairmanRequestContext` | None |
| §5.1 Execution metadata input | Partially Implemented | Advisor execution + context metadata | Extend |
| §5.1 Confidence metadata input | Partially Implemented | In consensus package / advisors | Preserve into outputs |
| §5.1 Traceability references input | Partially Implemented | IDs present; incomplete set | Extend |
| §5.1 Chairman configuration input | Partially Implemented | Runtime config; Decision Policy knobs incomplete | Extend |
| §5.2 Raw provider payloads not primary inputs | Fully Implemented | Structured context → prompts | Validate |
| §6.1 Final recommendation | Fully Implemented | Decision + statement + recommendationType | None |
| §6.1 Supporting rationale | Fully Implemented | `finalRecommendation` / `rationale` / `keyArguments` | Improve quality tests |
| §6.1 Uncertainty statement | Partially Implemented | `unknowns` / evidence requests; not first-class uncertainty statement | Implement |
| §6.1 Dissent acknowledgement | Partially Implemented | `disagreements` / `minorityView` optional | Enforce when material |
| §6.1 Confidence statement (Chairman-facing) | Partially Implemented | Single `confidence`; not triad | Extend |
| §6.1 Decision metadata (§6.2) | Missing | See metadata table | Implement |
| §6.1 Traceability metadata | Partially Implemented | Partial IDs/flags | Extend |
| §6.2 Decision identifier | Missing | No distinct decision-package id | Implement |
| §6.2 Decision timestamp | Missing | Absent on `ChairmanResult` | Implement |
| §6.2 Chairman specification version | Missing | Absent | Implement |
| §6.2 Governing ENG version | Missing | Absent | Implement |
| §6.2 Consensus Package identifier | Missing | Not recorded on Chairman outcome | Implement |
| §6.2 Traceability identifier | Partially Implemented | `executionId` | Complete |
| §6.2 Execution metadata reference | Missing | Absent | Implement |
| §6.3 Success = schema-validated sole synthesis | Fully Implemented | Parser gate before success result | Validate |
| §6.3 Failure = explicit reason; no fabricated recommendation | Partially Implemented | UI guarded; API failed payload includes placeholder recommendation fields | Fix + test API/UI |
| §6.3 Partial/degraded synthesis explicitly marked | Partially Implemented | `reducedConfidenceSynthesis` / missing perspectives; incomplete vs consensus degradation flags | Enhance |
| §6.3 Must not mutate upstream packages | Fully Implemented | Consensus/evidence treated as immutable inputs | Validate |
| §7.1 Receive Consensus Package | Partially Implemented | Live yes; contract optional | Enforce |
| §7.2 Validate Chairman Inputs | Partially Implemented | Context build validation; consensus not mandatory | Extend |
| §7.3 Assemble Decision Context | Fully Implemented | `DefaultChairmanContextBuilder` | None |
| §7.4 Interpret Consensus Landscape | Partially Implemented | Prompt serialization; no structured interpretation artifact | Enhance |
| §7.5 Interpret Confidence and Uncertainty | Partially Implemented | Prompt surfaces structural confidence | Extend into outputs |
| §7.6 Apply Decision Policy | Missing | No enforceable Decision Policy stage | Implement |
| §7.7 Executive Reasoning | Fully Implemented | Generative Chairman call | Constrain by policy |
| §7.8 Produce Decision Package | Partially Implemented | `ChairmanResult` incomplete vs §6 | Extend |
| §7.9 Validate Structured Output | Fully Implemented | `parseChairmanResponseContent` | Add recovery path |
| §7.10 Bounded Recovery or Explicit Failure | Partially Implemented | Provider retries only; no schema-invalid recovery | Extend |
| §7.11 Publish Final Decision | Partially Implemented | Returned on `CouncilResult`; metadata incomplete | Extend |
| §8.2 Follow Consensus by Default | Partially Implemented | Prompt instruction; untested/unenforced | Implement + test |
| §8.3 Evidence-Justified Divergence | Missing | No divergence capability/marker | Implement |
| §8.4 Explicit and Explainable Divergence | Missing | No explicit divergence field/validation | Implement |
| §8.5 Minority Opinion Evaluation | Partially Implemented | Optional `minorityView`; package minorities in prompt | Enforce acknowledgement |
| §8.6 Insufficient Evidence valid outcome | Partially Implemented | Taxonomy exists; conflated with operational failure placeholders | Separate + enforce |
| §8.7 No Fabricated Certainty | Partially Implemented | Prompt only; no validator | Enforce |
| §9.1 Three distinct reasoning roles | Fully Implemented | Stage separation | Validate |
| §9.2 Permitted generative acts | Fully Implemented | Conclusion/rationale/conditions/risks/etc. | Constrain by §8 |
| §9.3 Forbidden generative acts | Partially Implemented | Prompt prohibitions; weak enforcement | Enforce |
| §10.1 Respect consensus confidence / no overwrite advisor confidence / no silent inflation / explain confidence | Partially Implemented | Upstream preserved in package; Chairman output single number; inflation unblocked | Extend |
| §10.2 Consensus confidence concept | Fully Implemented | `ConsensusPackage.confidence` | Preserve visibility |
| §10.2 Chairman confidence concept | Partially Implemented | Exists as sole output confidence | Distinguish in contract |
| §10.2 Decision certainty concept | Missing | Not modeled | Implement |
| §11.2 Conflicting evidence behavior | Partially Implemented | Structural inputs present; policy outcomes unenforced | Enhance |
| §11.2 Insufficient evidence behavior | Partially Implemented | Stance exists | Enforce |
| §11.2 Degraded consensus behavior | Partially Implemented | Flags in prompt; partial result flags | Enhance |
| §11.2 Low confidence behavior | Partially Implemented | Numeric only | Enhance |
| §11.2 Missing advisors behavior | Partially Implemented | Gate + missing perspectives | Enhance disclosure |
| §11.3 Uncertainty communication minimum | Missing | Not required as structured minimum set | Implement |
| §12.1 Rationale quality | Partially Implemented | Schema fields; quality untested vs fixtures | Improve tests |
| §12.1 Evidence references | Partially Implemented | Prompt includes evidence; decision package lacks systematic IDs | Extend |
| §12.1 Transparency | Partially Implemented | Partial dissent/degradation | Enhance |
| §12.1 Reproducibility (orchestration) | Fully Implemented | Fixture-stable context/order | Validate |
| §12.1 Auditability | Partially Implemented | Blocked by §6.2 gaps | Implement metadata |
| §13.1 Degraded consensus failure class | Partially Implemented | Synthesis continues with partial flags | Policy-complete |
| §13.1 Invalid inputs failure class | Partially Implemented | Context errors fail; missing consensus not hard-fail | Extend |
| §13.1 Missing context failure class | Partially Implemented | Soft PKOS path upstream; Chairman may synthesize without strong insufficiency signaling | Coordinate with WP-06; harden disclosure |
| §13.1 Incomplete metadata failure class | Missing | No fail/qualify path for missing mandatory decision metadata | Implement with §6.2 |
| §13.1 Operational failures class | Partially Implemented | Provider retry then fail; schema-invalid no retry | Extend recovery |
| §13.2 Explicit terminal success or failure | Partially Implemented | Status + terminal codes; failure field contamination | Fix |
| §13.2 No fabricated recommendation on failed paths | Partially Implemented | UI yes; API payload placeholders no | Fix + AC-F-05 tests |
| §13.2 Analytical disagreement ≠ operational failure | Fully Implemented | Consensus disagreements are inputs; not ChairmanFailed by themselves | Validate |
| §13.2 No diagnostic fallback as live recommendation | Fully Implemented | No prototype recommendation injector observed | Validate |
| §13.2 Recovery policies configuration-bounded | Fully Implemented | `retry.maxAttempts` config-governed | Extend to Chairman schema recovery |
| §14 Extensibility model / rules | Partially Implemented | Stable upstream contracts; Decision Engine extension surface incomplete | Establish WP-05 contracts |
| §15 Deterministic orchestration tests | Partially Implemented | Context/prompt/integration present | Extend |
| §15 Reasoning quality tests | Partially Implemented | Minority/reduced-confidence behavior tests only | Extend |
| §15 Decision Policy conformance tests | Missing | No tests | Implement |
| §15 Degraded scenario tests | Partially Implemented | Reduced confidence / insufficient council | Extend vs consensus degradation |
| §15 Uncertainty handling tests | Missing | No dedicated suite | Implement |
| §15 Traceability tests | Missing | No §6.2 assertions | Implement |
| §15 Failure-path / AC-F-05 regression tests | Partially Implemented | UI guard tested; API cleanliness / placeholder contamination not | Extend |
| §16 Document map / non-duplication | Not Applicable | Specification governance; implementation must not redefine ENG-0006/0004 | Observe in WP-05 scope control |
| AC-CH-01 Explicit stage after consensus before presentation | Fully Implemented | Orchestrator stage order | Validate |
| AC-CH-02 Always receives published consensus package (incl. degraded/insufficient) | Partially Implemented | Live path yes; optional typing / prompt empty branch | Enforce |
| AC-CH-03 Consume package as authoritative landscape | Partially Implemented | Prompt + context embedding; still also dumps raw advisor prose | Strengthen primacy + tests |
| AC-CH-04 Schema-validated package or explicit failure — never empty/null recommendation payload | Partially Implemented | Success validated; failure uses non-null placeholders that look like recommendations | Fix failure package semantics |
| AC-CH-05 Bounded retry/recovery before ChairmanFailed | Partially Implemented | Provider retries; schema-invalid not recovered | Extend |
| AC-CH-06 Degraded participation disclosed; never invent missing advisors | Partially Implemented | Flags/gate exist; invention guard inert in config | Enforce + disclose consensus degradation |
| AC-CH-07 Material dissent/minority acknowledged or retained in lineage | Partially Implemented | Optional fields; not required against package minorities | Enforce |
| AC-CH-08 Uncertainty explicit under conflict/insufficient/low confidence/missing advisors | Partially Implemented | Partial fields/flags | Implement minimum communication |
| AC-CH-09 Confidence triad conceptually distinct in published contract | Missing | Single Chairman confidence published | Implement |
| AC-CH-10 Required decision metadata retained | Missing | §6.2 absent | Implement |
| AC-CH-11 Failed paths never present fabricated recommendations (AC-F-05) | Partially Implemented | UI compliant; API failed `ChairmanResult` carries decision/rationale placeholders | Fix API contract + tests |
| AC-CH-12 No PKOS retrieve; no generative consensus substitute | Fully Implemented | Boundaries held | Validate |
| AC-CH-13 Deterministic orchestration/validation/failure classification | Partially Implemented | Mostly; abort + schema recovery + reason taxonomy gaps | Extend |
| AC-CH-14 Provider-independent domain contracts | Fully Implemented | Types/config boundaries | Validate |
| AC-CH-15 Decision Policy enforceable | Missing | Prompt-only | Implement |
| AC-CH-16 Fixture tests cover §15 categories | Partially Implemented | Subset covered | Extend suite |
| AC-CH-17 IMP-bound scope (no unauthorized redesign) | Fully Implemented (current baseline) | WP-04 did not merge Consensus into Chairman; current code preserves separation | Maintain in WP-05 |
| AC-CH-18 Completion Validation / Commit Traceability (IMP-0000/0001) | Missing | WP-05 not implemented yet | Produce at WP-05 completion |
| AC-CH-19 Preserve sole post-consensus generative wording/contracts | Fully Implemented | Architecture + ENG-0006 feed preserved | Maintain |

---

## D. Major Findings

### F-01 — Decision Policy not an engineering contract (High)

ENG-0007 §8 / AC-CH-15 require enforceable default alignment, explicit divergence, minority evaluation, Insufficient Evidence, and no fabricated certainty. Implementation relies on free-text system prompt rules without decision-package markers, validators, or tests.

### F-02 — Decision metadata §6.2 absent (High)

No Chairman Decision Engine version, governing ENG version, decision timestamp, decision-package identity, consensus-package identity on the outcome, or execution-metadata reference. Blocks AC-CH-10 and auditability.

### F-03 — Confidence triad collapsed (High)

Consensus confidence exists upstream; published Chairman output exposes one confidence number used as “overall confidence.” Decision certainty is missing (AC-CH-09).

### F-04 — Failure packages contaminate recommendation fields (High)

`createFailedChairmanResult` fills `decision: "insufficient_information"` and narrative placeholders for operational failures. UI suppresses rendering; API success envelope still returns these fields inside `result.chairman`, weakening AC-CH-04/11 and NFR-REL-02 intent.

### F-05 — Schema-invalid recovery incomplete (Medium–High)

Provider retries are bounded. Invalid Chairman JSON/schema failures after a completed provider response fail immediately without Chairman-bounded recovery (FR-CH-03/05, AC-CH-05).

### F-06 — Consensus package not mandatory in Chairman contracts (Medium)

Live orchestrator always passes consensus; types and builder treat it as optional; prompt supports empty package. Weakens AC-CH-02/03.

### F-07 — Reason taxonomy incomplete (Medium)

WP-02 terminal codes exist (`CHAIRMAN_SYNTHESIS_FAILURE`, etc.). ENG-0007/IMP FR-CH-02 expect richer Chairman failure reason taxonomy on exhaustion.

### F-08 — Inert invention-guard config (Medium)

`chairman.allowInventedAdvisorContent` is loaded but unused by Chairman logic.

### F-09 — AbortSignal not coupled to Chairman (Medium / known deferral)

Overall session abort cancels advisors/OpenRouter when signaled; `runChairman` does not accept/propagate signal (WP-03 observation).

### F-10 — Test debt vs §15 (High for closure)

No Decision Policy, metadata, confidence-triad, uncertainty-minimum, or API AC-F-05 cleanliness suites.

---

## E. Overall Readiness

### Verdict: **Significant Gaps**

| Ready for Implementation | No — planning yes; coding requires scoped WP-05 slices |
| Ready with Minor Work | No — metadata, policy, confidence triad, and failure semantics are not minor |
| **Significant Gaps** | **Yes** — architecture correct; ENG-0007 Decision Engine contracts incomplete |
| Architecture Misalignment | No — pipeline position and stage boundaries match ENG-0007/ENG-0006 |

Support: WP-04 correctly established consensus-before-Chairman. Remaining work is **enhancement of the Chairman Decision Engine** under ENG-0007, not relocation of synthesis into Consensus or PKOS.

---

## F. Implementation Scope for WP-05

### Already Complete

- Pipeline stage placement after Consensus, before presentation
- Non-generative Consensus Engine consumption on live path
- Chairman does not execute advisors or retrieve PKOS
- Schema validation for successful generative outputs
- Insufficient-advisor participation fail-closed gate
- UI non-render of failed Chairman recommendations
- Provider-bounded OpenRouter retries + chairman lifecycle diagnostics
- Provider-independent domain types
- Structured recommendation/rationale/disagreement/minority/conditions/risks/next-actions fields (as a baseline substrate)
- Context builder embedding of Consensus Package maps/minorities/confidence
- Sole post-consensus generative authority preserved

### Enhancements

- Strengthen consensus primacy vs raw advisor prose (AC-CH-03)
- Degradation disclosure from consensus flags into decision package
- Minority acknowledgement requirements when package retains minorities
- Uncertainty communication under material uncertainty
- Chairman reason taxonomy beyond WP-02 minimal set
- Wire AbortSignal into Chairman invocation
- Activate or replace inert `allowInventedAdvisorContent` policy surface
- Expand fixture coverage for existing behaviors under ENG-0007 scenarios

### New Capabilities

- Enforceable Decision Policy (§8) including explicit divergence marker + Insufficient Evidence as governed outcome
- Full §6.2 decision metadata on success and failure
- Published confidence triad (consensus / Chairman / decision certainty)
- First-class uncertainty statement / communication minimum
- Chairman-bounded recovery for schema-invalid generative output
- Clean failure decision package (no recommendation-shaped placeholders)
- WP-05 Completion Validation / commit traceability artifacts (AC-CH-18)

### Refactoring (architectural compliance only)

- Make Consensus Package required on governed Chairman path (types + validation)
- Separate operational `ChairmanFailed` payload from semantic `insufficient_information` recommendation content
- Extend `ChairmanResult` / related types for metadata and confidence triad without breaking presentation mapping intentionally (update presentation to consume new fields faithfully)
- Avoid Consensus/PKOS/advisor redesign (AC-CH-17)

---

## G. Risk Assessment

| Area | Risk | Why | Mitigation |
|---|---|---|---|
| Decision Policy enforcement | **High** | Touches generative outputs + validation; LLM variance residual | Contract-first markers/validators; fixture doubles; keep algorithms out of ENG; prompt changes only as implementation detail after contracts |
| Decision metadata + traceability | **Medium** | Broad type/API surface; presentation may ignore new fields | Additive fields; require on parse/publish; API/UI regression |
| Confidence triad | **Medium** | UX currently shows one “overall confidence” | Explicit field separation; presentation mapping ADR-0008-aligned; do not erase consensus confidence |
| Failure package cleanup | **High** | API clients may already read placeholder fields | Versioned contract; tests for failed payloads; keep UI fail-closed |
| Schema-invalid recovery | **Medium** | Retry cost/latency; duplicate side effects | Bounded attempts; config-governed; fail closed with reason codes |
| AbortSignal coupling | **Low–Medium** | Known gap; session timeout edge cases | Pass signal through `runChairman` → OpenRouter |
| Scope creep into Consensus/PKOS | **High** if unmanaged | Historical temptation to “fix” synthesis upstream | AC-CH-17 gate; ENG-0006/0004 non-duplication; ARR-0004 sequencing |
| Test insufficiency at close | **High** | ENG-0007 completion requires §15 evidence | Slice tests with each implementation slice |

---

## H. Recommended WP-05 Work Packages (Slices)

### Slice WP-05.A — Decision Package Contract & Metadata

- **Objective:** Implement §6.2 metadata; clean failure package; required consensus-package linkage; distinct decision identity/timestamp/versions.
- **Affected components:** `src/types/council.ts`, `chairman-runner.ts`, `chairman-context.types.ts`, API consumers, possibly `terminal-outcome.ts`.
- **Architectural dependency:** None beyond WP-04 baseline.
- **Complexity:** Medium

### Slice WP-05.B — Confidence Triad & Uncertainty Communication

- **Objective:** Publish consensus confidence, Chairman confidence, and decision certainty distinctly; require uncertainty minimum under material uncertainty/degradation.
- **Affected components:** Chairman result types, response parser/schema, prompt assembly (implementation detail), presentation mapping (`council-display`, `chairman-card`).
- **Architectural dependency:** WP-05.A (metadata/lineage) preferred first.
- **Complexity:** Medium

### Slice WP-05.C — Decision Policy Enforcement

- **Objective:** Enforce §8 invariants: default consensus alignment, explicit explainable divergence, minority acknowledgement, Insufficient Evidence, no fabricated certainty.
- **Affected components:** decision-policy module (new), parser/validators, context/prompt consumption of policy markers, tests.
- **Architectural dependency:** WP-05.A/B for package shape; must not redesign Consensus Engine.
- **Complexity:** High

### Slice WP-05.D — Failure Handling, Recovery & Reason Taxonomy

- **Objective:** Chairman-bounded recovery including schema-invalid outputs; expand reason codes; AbortSignal coupling; remove recommendation-shaped failure contamination; AC-F-05 API+UI proof.
- **Affected components:** `chairman-runner.ts`, OpenRouter/retry integration, `terminal-outcome.ts`, API route assertions/tests, abort plumbing.
- **Architectural dependency:** WP-05.A failure package shape.
- **Complexity:** Medium–High

### Slice WP-05.E — Degradation & Missing-Advisor Disclosure Hardening

- **Objective:** FR-CH-04 / AC-CH-06 complete: consensus degradation flags and missing perspectives always disclosed; invention guard enforced; insufficient/degraded packages never presented as high-certainty complete consensus.
- **Affected components:** runner, policy/config, prompt/context, result flags, tests.
- **Architectural dependency:** WP-05.B/C.
- **Complexity:** Medium

### Slice WP-05.F — ENG-0007 Test & Completion Evidence Pack

- **Objective:** §15 / AC-CH-16 suites; Completion Validation & commit traceability (AC-CH-18).
- **Affected components:** `tests/chairman-*.mjs`, new policy/metadata/failure fixtures, WP-05 implementation report (later).
- **Architectural dependency:** After A–E land (can develop fixtures in parallel per slice).
- **Complexity:** Medium

**Suggested sequence:** A → D (failure cleanliness early) → B → C → E → F, with tests per slice.

---

## I. Validation Checklist

| Check | Result |
|---|---|
| Architectural alignment with ENG-0007 assessed | **Pass** — stage boundaries aligned; Decision Engine contracts incomplete |
| Traceability matrix completeness | **Pass** — each ENG-0007 requirement appears exactly once |
| Objective evidence for every finding | **Pass** — citations to WP-04/current Chairman sources and tests |
| Comparison against WP-04 baseline `3146af8` | **Pass** — Chairman implementation identical at assessment HEAD |
| Post-baseline evolution considered | **Pass** — docs-only commit `f448eed`; no Chairman code drift |
| No implementation changes | **Pass** |
| No source-code modifications | **Pass** |
| No prompts created/modified | **Pass** |
| No commits created | **Pass** |
| ENG-0007 absolute precedence applied | **Pass** — gaps judged vs Approved v1.0, not vs prior informal prompt policy |

---

## J. Files Created

```text
docs/assessments/WP-05-CHAIRMAN_CAPABILITY_GAP_ANALYSIS.md
```

---

## K. Commit Proposal

Do **not** commit in this phase. When publication is requested:

```text
docs: add WP-05 Chairman Capability Gap Analysis
```

---

## Document History

| Version | Date | Status | Notes |
|---|---|---|---|
| 1.0 | 2026-07-27 | Complete | Phase 0 capability gap analysis; engineering contract for WP-05 implementation planning |
