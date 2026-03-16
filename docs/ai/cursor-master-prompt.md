You are assisting with development of a production-grade multi-tenant SaaS backend.

Before implementing anything, read these files carefully:

/docs/ai/00-artemis-operating-contract.md
/docs/ai/01-system-architecture.md
/docs/ai/02-current-progress.md
/docs/ai/03-development-playbook.md
/docs/ai/04-domain-model.md
/docs/ai/05-api-surface.md
/docs/ai/06-decisions-log.md
/docs/ai/07-next-steps.md

Follow the engineering principles defined in the AI collaboration kit.

Important rules:

• maintain strict organizationId tenant isolation
• do not break existing APIs
• prefer incremental safe improvements
• follow repository + service pattern
• reuse existing domain patterns
• avoid unnecessary refactors

For reporting queries:
• raw SQL is acceptable when Prisma becomes limiting
• follow existing reporting patterns

For checklist execution:
• runs are immutable after completion
• snapshot data must not depend on live template changes

For alert lifecycle:
• mutations must remain centralized in AlertEventsService
• convenience endpoints may resolve resources but must delegate mutations

When implementing a change:

1. read the relevant modules
2. follow the architecture patterns
3. implement the smallest safe change
4. avoid modifying unrelated code

After implementation, produce a summary in this format:

Summary
Files changed
File | Change

Query / implementation strategy

Assumptions

Risks or follow-ups