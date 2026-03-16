# Run AI Collaboration Kit Checkpoint Update

You are updating the AI Collaboration Kit based on the latest changes in the repository.

Follow these steps carefully.

---

## Step 1 — Understand Recent Changes

Analyze the repository changes since the last checkpoint.

Use the following sources:

- `git diff`
- `git log`
- recently modified files under:
  - `src/`
  - `scripts/`
  - `prisma/`

Focus especially on:

- new APIs
- changed APIs
- new modules
- domain events
- architectural decisions
- new features implemented

Do **not invent features**. Only use what exists in the code.

---

## Step 2 — Update AI Collaboration Docs

Update the following documents conservatively.

### docs/ai/02-current-progress.md

Ensure the document reflects what is **implemented vs not implemented**.

- mark completed items
- add newly implemented capabilities if needed
- remove outdated TODOs

---

### docs/ai/05-api-surface.md

Ensure all APIs implemented in the codebase are represented.

Add or update endpoints if needed.

Include:

- method
- path
- module
- permission

---

### docs/ai/06-decisions-log.md

Add entries only if **a real architectural decision occurred**, such as:

- new architecture pattern
- domain event introduction
- major query strategy
- dependency structure change

Include:

- date
- decision
- rationale

---

### docs/ai/07-next-steps.md

Update the roadmap based on the current codebase.

Remove completed items.

Add new recommended next steps if relevant.

---

### docs/ai/checkpoint-template.md

Fill a new checkpoint entry including:

- date
- summary of work completed
- main modules changed
- important design decisions
- recommended next work

---

## Step 3 — Validate Consistency

Ensure the following are consistent:

- API endpoints match actual controllers
- current progress reflects real implementation
- next steps reflect remaining architecture

---

## Step 4 — Output Summary

After updating the files, provide a summary including:

- files updated
- key changes in each file
- any uncertainty requiring human confirmation

---

## Step 5 — Suggested Commit Message

Provide a recommended commit message for the documentation update.