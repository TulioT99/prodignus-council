# WP Publication Template

**Use for:** Work Package (WP) canonical implementation baseline publications  
**Normative workflow:** [CANONICAL_IMPLEMENTATION_BASELINE_PUBLICATION.md](./CANONICAL_IMPLEMENTATION_BASELINE_PUBLICATION.md)  
**Governing standard:** [OPS-0002](../OPS-0002-canonical-implementation-baseline-publication.md)

Follow the master publication workflow in full.

Mandatory inclusions for WP publications:

- predecessor WP / engineering baseline
- Executive Architecture Review verdict
- implementation summary and validation summary
- `docs/assessments/WP-XX-IMPLEMENTATION-BASELINE.md` (or package-equivalent)
- navigation updates (`docs/assessments/README.md`, `docs/README.md` as applicable)

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

Applies to future Chairman packages including **WP-05E**, **WP-05F**, and subsequent WP publications.

Run: `npm run validate:publication -- --manifest <wp-manifest.json>`
