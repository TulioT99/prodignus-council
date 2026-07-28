# Canonical Implementation Baseline — Publication Workflow Template

**Status:** Normative reusable template  
**Governing standard:** [OPS-0002](../OPS-0002-canonical-implementation-baseline-publication.md)  
**Applies to:** WP, ENG, ARR, OPS, PKOS, and any canonical implementation baseline publication

Use this template for every publication that establishes or updates a **Canonical Implementation Baseline**.

Do not invent alternate baseline-hash semantics.

---

# Preconditions

Before publication verify:

- Build passes (when code is in scope).
- TypeScript / lint / format gates applicable to the repository pass.
- Full automated test suite passes (when tests are in scope).
- Working tree contains only the intended publication changes.
- No unrelated files are included.
- Executive Architecture Review (or equivalent authorization) has passed.

If any validation fails, stop publication and report the failure.

---

# Publication Lifecycle

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

---

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

Run the automated gate:

```text
npm run validate:publication -- --manifest <manifest.json>
```

Overall status must be **PASS**. FAIL blocks publication. PASS WITH WARNINGS is not auto-eligible.

---

# Governance Rule

```text
Baseline Document Commit Hash
             ==
Published Git HEAD
```

Exactly **one** canonical implementation baseline per publication.

No publication may produce two different baseline hashes.

---

# Commit

Create exactly **one** publication commit unless the governing package explicitly authorizes a different commit policy.

The baseline document must be included in that commit and must record that commit’s hash.

If the hash is unknown until after commit creation:

1. Create the publication commit.
2. Update the baseline document to `git rev-parse HEAD`.
3. Amend **or** recreate so the final single publication commit contains the matching hash.
4. Re-run Baseline Integrity Check.
5. Push only after equality holds.

---

# Push

Push to the repository default branch (typically `origin/master` or the designated release branch).

Verify:

- local HEAD == remote HEAD
- working tree clean
- baseline document commit hash == published Git HEAD

---

# Post-Publication Confirmation

Explicitly confirm:

- publication completed successfully
- canonical implementation baseline established
- Baseline Integrity Check passed
- predecessor baseline superseded (when applicable)
- no dual-hash ambiguity remains

---

# Non-Goals

This template does not authorize:

- runtime feature work disguised as publication
- silent modification of unrelated packages
- omission of Baseline Integrity Check
- “git HEAD is authoritative even if the document differs” exceptions for new publications
