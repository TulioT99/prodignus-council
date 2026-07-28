# OPS-0002 — Canonical Implementation Baseline Publication Standard

**Status:** Approved  
**Version:** 1.0  
**Date:** 2026-07-28  
**Owner:** Prodignus Architecture / Engineering  
**Applies To:** All Prodignus repositories publishing canonical implementation baselines (WP, ENG, ARR, OPS, PKOS, and related governance artifacts)  
**Related:** [OPS-0001 — Engineering Workflow Standard](./OPS-0001-engineering-workflow-standard.md)

---

# 1. Purpose

This standard eliminates ambiguity between an **implementation baseline document** and the **published Git commit**.

Every published implementation baseline must be self-consistent, fully traceable, and automatically verifiable.

This is a **governance enhancement**. It does not change application runtime behavior.

---

# 2. Governance Rule

Every published implementation baseline must satisfy:

```text
Baseline Document Commit Hash
             ==
Published Git HEAD
```

This rule is **mandatory**.

There shall be exactly **one** canonical implementation baseline per publication.

No publication may produce two different baseline hashes.

---

# 3. Baseline Integrity Check

The following section is mandatory in **every** publication workflow.

```text
# Baseline Integrity Check

Before creating the publication commit:

• Generate the implementation baseline document.

• Ensure the implementation commit hash recorded inside the
  implementation baseline document matches the final published Git commit.

If documentation updates require modifications after the baseline document
is created, regenerate or update the baseline document before creating the
final publication commit.

The implementation baseline document and the published Git HEAD must always
reference the same commit.

No mismatch is permitted.
```

This wording is the **canonical publication requirement**.

Reusable publication templates must include this section verbatim or by normative reference to this OPS.

---

# 4. Publication Lifecycle

```text
Implementation Complete
        ↓
Executive Architecture Review
        ↓
Publication Preparation
        ↓
Publication Integrity Validator (OPS-0003)
        ↓
Publication Commit
        ↓
Push
        ↓
Canonical Implementation Baseline Established
```

The **Baseline Integrity Check** (OPS-0002) is enforced automatically by **PV-007** inside OPS-0003. A publication that leaves the baseline document hash different from published Git HEAD is **non-conformant**.

Reusable tooling: `tools/publication-integrity-validator/` (see OPS-0003).

---

# 5. Required Procedure

1. Complete implementation and Executive Architecture Review (or equivalent publication authorization).
2. Prepare the publication tree (implementation + required docs).
3. Draft or update the implementation baseline document.
4. Create the **single** publication commit that contains all publication content, including the baseline document.
5. Immediately after that commit is created, set (or confirm) the baseline document’s recorded commit hash to `git rev-parse HEAD`.
6. If step 5 requires a document change, **amend or recreate** the publication commit so that:
   - there remains exactly one publication commit; and
   - the baseline document hash equals that commit’s hash.
7. Push only after Baseline Integrity Check passes.
8. Verify: working tree clean; local HEAD == remote HEAD; baseline document hash == HEAD.

Do **not** leave a “treat git HEAD as authoritative if docs amend follows” escape hatch in new baselines.

Historical baselines that already exhibit a pre-amend stamp mismatch remain historical evidence; they do not authorize future mismatches.

---

# 6. Scope of Application

This standard applies to every future publication template and publication, including but not limited to:

| Domain                     | Examples                                     |
| -------------------------- | -------------------------------------------- |
| Chairman / WP              | WP-05E, WP-05F, subsequent WP packages       |
| Engineering Specifications | ENG publications                             |
| Architecture Reviews       | ARR publications                             |
| Operations                 | OPS publications                             |
| PKOS                       | Any future canonical implementation baseline |

No future publication template may omit the Baseline Integrity Check.

---

# 7. Reusable Template

The normative reusable workflow template is:

[templates/CANONICAL_IMPLEMENTATION_BASELINE_PUBLICATION.md](./templates/CANONICAL_IMPLEMENTATION_BASELINE_PUBLICATION.md)

Type-specific publication templates under `docs/ops/templates/` must incorporate this OPS by reference and include the Baseline Integrity Check.

---

# 8. Automation Readiness

This rule is intentionally machine-checkable:

```text
document.recorded_commit_hash == git_rev_parse("HEAD")
```

Future CI or publication tooling may enforce this equality automatically. Manual publication remains obligated to satisfy it until automation exists.

---

# 9. Non-Goals

This standard does **not**:

- modify Chairman, Consensus Engine, or PKOS runtime code;
- rewrite published ENG/ADR content in `hercules-knowledge`;
- retroactively rewrite historical baseline documents solely to erase past stamp mismatches;
- replace Executive Architecture Review or other publication authorization gates.

---

## Related Documentation

- [OPS-0001 — Engineering Workflow Standard](./OPS-0001-engineering-workflow-standard.md)
- [Publication Templates](./templates/README.md)
- [Documentation Index](../README.md)
