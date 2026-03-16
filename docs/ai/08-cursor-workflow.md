# Cursor Workflow

## Starting a Session

1. Open `/docs/ai/09-session-brief.md` — paste or reference for context.
2. Skim `/docs/ai/02-current-progress.md` — know what exists.
3. Check `/docs/ai/07-next-steps.md` — pick a task.

## Prompt Structure for New Features

```
Context: [paste relevant docs/ai sections]

Task: [concrete goal]

Requirements:
- [bullet list]
- Preserve tenant safety
- No API breakage

Implementation guidance:
- [files to modify]
- [patterns to follow]

After implementation, summarize:
- Files changed
- Exact behavior
- Assumptions
```

## Prompt Structure for Reviews

```
Review [component/endpoint] for:
- [specific checks]
- Tenant safety
- Correctness

Return pass/fail per check; smallest safe fix only if needed.
```

## Local Hooks

Run `./scripts/ai/setup-hooks.sh` once to enable the pre-commit AI doc reminder. The hook warns (does not block) when staged changes touch `src/`, `scripts/`, or `prisma/` without `docs/ai/` or `scripts/ai/`.

## Checkpointing

- Use `/docs/ai/checkpoint-template.md` to capture session state.
- Run `/scripts/ai/update-ai-context-checkpoint.md` to refresh context.
- Run `/scripts/ai/release-checkpoint.md` before releases.
