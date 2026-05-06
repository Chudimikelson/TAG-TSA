# Copilot Instructions for Tagora Thrift Savings

Use [docs/tagora-copilot-project-prompt.md](docs/tagora-copilot-project-prompt.md) as the source of truth.

## Coding standards
- Prefer TypeScript for backend services and shared contracts.
- Keep API controllers thin; move business logic into service modules.
- Validate inputs using zod schemas.
- Enforce role checks and audit logging on sensitive endpoints.
- Add idempotency key validation to collection creation endpoints.
- Keep file uploads abstracted behind a storage service.

## Testing expectations
- Add unit tests for services, validators, and middleware.
- Add integration tests for auth, collections, webhooks, and withdrawals.
- Add contract tests for POST /collections request and response.
- Mock third-party integrations: SMS, S3, bank/USSD webhooks.

## Output expectations
When creating features, include:
1. Code changes.
2. Tests.
3. Minimal docs updates.
4. Follow-up issue checklist if any MVP criteria are not yet met.
