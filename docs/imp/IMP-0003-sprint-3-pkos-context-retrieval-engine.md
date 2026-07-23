# IMP-0003 — Sprint 3 PKOS Context Retrieval Engine

## Summary

Sprint 3 implements the first functional PKOS Context Retrieval Engine in `prodignus-council`, integrated at the Council orchestration boundary before Advisor execution.

## Configuration

Set in `.env.local`:

```env
PKOS_REPOSITORY_PATH=C:\Projects\Hercules\hercules-knowledge
```

Optional:

```env
PKOS_MAX_EVIDENCE_SOURCES=5
PKOS_MAX_EXCERPT_CHARS=2000
```

## Retrieval behavior

1. Discover Markdown artifacts recursively under the configured PKOS path.
2. Parse YAML front matter and infer document metadata.
3. Apply centralized governance eligibility (exclude deprecated/superseded; prefer accepted/approved).
4. Analyze the Council request deterministically (IDs, keywords, families).
5. Rank artifacts with explicit scoring rules (no embeddings).
6. Resolve duplicates and conflicts; build an immutable Evidence Package.
7. Attach the package to `DecisionContext` before Advisors and Chairman execute.

## MVP limitations

- No embeddings, vector search, or LLM-based reranking.
- Simple YAML front matter parser (not full YAML 1.2).
- Excerpt-based evidence injection with configurable size limits.
- Local filesystem PKOS source only.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Manual smoke tests: run the Council locally with `PKOS_REPOSITORY_PATH` pointed at `hercules-knowledge` and submit the four Sprint 3 scenarios (ADR-0007 separation, product principles, unknown subject, ENG-0004 summary).

## Architecture references

- ENG-0004 — PKOS Context Retrieval Engine (`hercules-knowledge`)
- ADR-0007 — Separation of Executive Reasoning and Knowledge Retrieval (`hercules-knowledge`)
