# OPS-0003 — Publication Integrity Validator

**Status:** Implemented (governance tooling)  
**Version:** 1.0  
**Date:** 2026-07-28  
**Owner:** Prodignus Architecture / Engineering  
**Related:** [OPS-0002](./OPS-0002-canonical-implementation-baseline-publication.md), [OPS-0001](./OPS-0001-engineering-workflow-standard.md)

---

# 1. Purpose

OPS-0003 defines and implements the **Publication Integrity Validator**: a deterministic, reusable governance control that verifies publication eligibility **before** a publication may proceed to push / baseline establishment.

It transforms Baseline Integrity and related publication gates from a manual process into an **automatically enforceable engineering control**.

This OPS does **not** change Decision Council runtime behavior.

---

# 2. Publication Lifecycle

```text
Implementation Complete
        ↓
Executive Architecture Review
        ↓
Publication Preparation
        ↓
Publication Integrity Validator
        ↓
Publication Commit (integrity-aligned)
        ↓
Push
        ↓
Canonical Implementation Baseline Established
```

The validator is the final publication gate for eligibility. Overall status **FAIL** blocks publication. **PASS WITH WARNINGS** is not auto-eligible (`publicationMayProceed` returns false). Only **PASS** permits automatic continuation.

Practical note for PV-007: Baseline Document Commit Hash must equal Git HEAD. Align the baseline stamp with HEAD (commit/amend per OPS-0002) and re-run the validator before push.

---

# 3. Architecture

```text
PublicationValidator
        │
        ├── PV-001 Clean Working Tree
        ├── PV-002 Build
        ├── PV-003 TypeScript
        ├── PV-004 Lint
        ├── PV-005 Formatting
        ├── PV-006 Tests
        ├── PV-007 Baseline Integrity
        ├── PV-008 Navigation
        ├── PV-009 Previous Baseline
        ├── PV-010 Required Metadata
        ├── PV-011 Scope Validation
        └── PV-012 Governance References
```

| Component            | Path                                                          |
| -------------------- | ------------------------------------------------------------- |
| Types / result model | `tools/publication-integrity-validator/types.ts`, `result.ts` |
| Rule registry        | `tools/publication-integrity-validator/rules.ts`              |
| Orchestrator         | `tools/publication-integrity-validator/validator.ts`          |
| Node adapters / CLI  | `adapters.ts`, `cli.mjs`                                      |

Rules are independently executable and receive an injectable context (git, commands, filesystem) for local runs, CI, and tests.

Publication-type specifics are provided via a **manifest** — not hardcoded per WP/ENG/ARR/OPS.

---

# 4. Output Model — `PublicationValidationResult`

| Field                | Meaning                                   |
| -------------------- | ----------------------------------------- |
| `validatorVersion`   | Validator contract version (`1.0.0`)      |
| `executionTimestamp` | ISO-8601 execution time                   |
| `repository`         | Repository identity                       |
| `publicationType`    | `WP` \| `ENG` \| `ARR` \| `OPS` \| `PKOS` |
| `gitHead`            | Evaluated Git HEAD                        |
| `ruleResults`        | Full per-rule outcomes                    |
| `warnings`           | WARNING subset                            |
| `failures`           | FAIL subset                               |
| `overallStatus`      | `PASS` \| `PASS WITH WARNINGS` \| `FAIL`  |

Each rule result includes `ruleId`, `ruleName`, `status` (`PASS`\|`WARNING`\|`FAIL`), `message`, and optional `evidence`.

The result is JSON-serializable and CI-friendly.

---

# 5. Rule Registry

| Rule   | Purpose                                                 |
| ------ | ------------------------------------------------------- |
| PV-001 | Dirty paths must stay within publication allowlist      |
| PV-002 | `npm run build` succeeds (when quality gates enabled)   |
| PV-003 | `npm run typecheck` succeeds                            |
| PV-004 | `npm run lint` succeeds                                 |
| PV-005 | Prettier `--check` succeeds                             |
| PV-006 | `npm test` succeeds                                     |
| PV-007 | Baseline document hash == Git HEAD (OPS-0002)           |
| PV-008 | Required navigation files exist and mention baseline    |
| PV-009 | Predecessor baseline exists and is correctly referenced |
| PV-010 | Required metadata markers present                       |
| PV-011 | No unrelated scope modifications                        |
| PV-012 | Required governance references present                  |

---

# 6. Extension Strategy

1. Add a new `PublicationRuleDefinition` to `INITIAL_PUBLICATION_RULES`.
2. Keep evaluation pure relative to the injected context.
3. Cover the rule with unit tests in `tests/publication-integrity-validator.test.mjs`.
4. Bump `PUBLICATION_VALIDATOR_VERSION` for behavior-changing releases.

Do not embed publication-type branches inside individual rules; put them in the manifest.

---

# 7. Automation Strategy

The validator is CI-platform agnostic:

| Environment       | Integration pattern                                 |
| ----------------- | --------------------------------------------------- |
| Local             | `npm run validate:publication -- --manifest <file>` |
| GitHub Actions    | Step running the same CLI; fail job on exit code 1  |
| GitLab CI         | Job script invoking the CLI                         |
| Release pipelines | Gate before tag/push                                |

No GitHub/GitLab APIs are required by the core architecture.

**Not integrated into CI/CD in this OPS delivery** — architecture is ready; enablement is a later governance decision.

---

# 8. CLI

```text
node --experimental-strip-types tools/publication-integrity-validator/cli.mjs --manifest <manifest.json>
```

Exit codes:

| Code | Meaning            |
| ---- | ------------------ |
| 0    | PASS               |
| 2    | PASS WITH WARNINGS |
| 1    | FAIL / usage error |

---

# 9. Non-Goals

- CI/CD wiring in this delivery
- Runtime Decision Council / Chairman / Consensus / PKOS changes
- Cryptographic signatures (future evolution)
- Rewriting historical dual-hash baselines

---

## Related Documentation

- [OPS-0002 — Canonical Implementation Baseline Publication](./OPS-0002-canonical-implementation-baseline-publication.md)
- [Publication Templates](./templates/README.md)
- [Documentation Index](../README.md)
