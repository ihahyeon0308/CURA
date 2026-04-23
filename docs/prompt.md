# CURA Prompt Library

Use these prompts when you want consistent Codex behavior across interactive or
headless sessions.

## Prompt 1: Discovery and gap analysis

```text
Read CLAUDE.md, docs/research.md, docs/plan.md, and docs/adr.md.
Stay in discovery mode.

Task:
- summarize the current gap between the scaffold and the target architecture
- identify the next bounded implementation phase
- list the files or modules most likely to change
- do not write product code

Output:
- scope
- risks
- recommended next phase
- docs that need updating first
```

## Prompt 2: Phase implementation

```text
구현해

Read CLAUDE.md, docs/plan.md, docs/adr.md, and docs/implement.md first.
Implement exactly one phase or sub-slice.

Rules:
- do not expand scope beyond the active phase
- no mock data in touched paths
- verify what you change
- update docs/implement.md if the phase status changes

Output:
- code changes
- verification
- remaining risks
```

## Prompt 3: Architecture compliance review

```text
Review the current changes against CLAUDE.md, docs/plan.md, and docs/adr.md.

Focus on:
- regressions
- architecture drift
- missing verification
- violations of confidence, comparability, moderation, or persistence rules

Return findings first, ordered by severity, with file references.
```

## Prompt 4: ADR update

```text
Read docs/plan.md and the relevant code changes.
Update docs/adr.md only if a durable decision has changed.

For each affected ADR:
- context
- decision
- consequence

Do not turn ADRs into a changelog.
```

## Prompt 5: Document-first refinement

```text
Stay in discovery mode.
Improve the Codex harness for this repository.

Goals:
- tighten document roles
- remove ambiguity between planning and implementation
- make the next implementation phase easier to execute repeatedly

Allowed edits:
- CLAUDE.md
- docs/research.md
- docs/plan.md
- docs/adr.md
- docs/implement.md
- docs/prompt.md
- README.md
```
