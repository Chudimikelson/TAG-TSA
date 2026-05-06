# Copilot Codegen Playbook

This playbook helps you use Copilot with the Tagora project brief to generate code, tests, and delivery tasks.

## Source prompt
Use [docs/tagora-copilot-project-prompt.md](docs/tagora-copilot-project-prompt.md) as baseline context for all generated work.

## Recommended workflow
1. Create an issue from one of the templates in .github/ISSUE_TEMPLATE.
2. Copy the feature or endpoint section from the project prompt into the issue.
3. Ask Copilot to generate implementation in small slices:
   - model and validation
   - route and controller
   - service logic
   - tests
4. Run tests and type-check after each slice.
5. Merge only after acceptance criteria are satisfied.

## Prompt examples
### Generate endpoint and tests
"Using docs/tagora-copilot-project-prompt.md, implement POST /collections in Express + TypeScript with zod validation, role guard isTSO, idempotency key support, receipt upload abstraction, and audit logging. Add unit tests for service logic and integration tests for route behavior including duplicate idempotency key handling."

### Generate webhook and queue job
"Using docs/tagora-copilot-project-prompt.md, implement POST /webhooks/payments with signature verification, enqueue job in BullMQ, and create a matching worker to auto-match transactions to member plans or flag unmatched. Add integration tests for signature failure and success."

### Generate issue breakdown
"Create GitHub issues for backlog items 1-10 from docs/tagora-copilot-project-prompt.md using the copilot codegen task template and include acceptance criteria and test scope per issue."

## Definition of done
- Code is typed and lint-clean.
- Unit and integration tests are present and pass.
- Security checks are present for auth, role validation, webhook signature, and idempotency.
- Docs are updated for env vars and operational runbooks when behavior changes.
