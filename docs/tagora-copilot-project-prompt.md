# Tagora Thrift Savings - Copilot Project Prompt

Use this prompt to guide GitHub Copilot code generation for the Tagora Thrift Savings platform.

## Project identity
- Name: Tagora Thrift Savings
- Goal: Digitize thrift savings operations for TSOs, managers, and customers.
- Pilot scope: 10 TSOs and about 200 customers.

## Product outcomes
- Replace paper cash logs with auditable digital collections.
- Support TSO operations: account creation, savings collection (cash and transfer), withdrawal request creation.
- Support back-office operations: plan management, reconciliation, dispute handling, approvals.
- Provide customer transparency with mini web and USSD fallback.

## Success metrics
- Collection success rate >= 95% for scheduled collections.
- Transfer auto-match rate >= 90%.
- Median withdrawal turnaround <= 24 hours.
- Reconciliation variance <= 0.5% of expected total.

## Technology requirements
- Frontend: React for admin/customer web, React Native for agent app.
- Backend: Node.js + Express + TypeScript.
- Data: MongoDB Atlas with Mongoose.
- Object storage: S3-compatible for receipt images.
- Jobs/queue: Redis + BullMQ.
- Notifications: SMS provider (Twilio or Infobip), optional WhatsApp.
- Payments integration: Bank API and USSD webhooks.
- CI/CD: GitHub Actions building Docker images for staging and production.

## Monorepo target layout
/packages
  /api
  /web-admin
  /web-customer
  /agent-app
  /shared
/infra
/.github/workflows
README.md

## Core flows
### TSO
1. Register account with phone OTP and device binding.
2. Record collections with member, plan, amount, method, receipt photo, geo, and timestamp.
3. Support offline queue and sync for collections.
4. Submit withdrawal requests on behalf of members.

### Back office
1. Member and plan management with TSO assignment.
2. Collections feed with filters and flagging.
3. Daily reconciliation of expected vs counted totals.
4. Auto-match incoming transfers, flag unmatched, resolve variance.
5. Approve or reject withdrawal requests and record disbursement.
6. Track disputes for flagged collections.

### Customer
1. View balance, contribution history, and next scheduled debit.
2. Download receipts.
3. Request withdrawals via TSO.

## Required entities
- Member: memberId, name, phone, email, nationalIdRef, kycStatus, createdAt.
- SavingsPlan: planId, memberId, name, amount, frequency, startDate, nextScheduledDate, status.
- TSO: tsoId, name, phone, deviceId, assignedAreas, status, createdAt.
- Collection: collectionId, planId, memberId, tsoId, amount, method, timestamp, photoReceiptUrl, geo, matchedTransactionId, status.
- Transaction: transactionId, externalRef, memberId, amount, method, timestamp, status.
- WithdrawalRequest: withdrawalId, requesterTsoId, memberId, planId, amount, requestedAt, approvedBy, approvedAt, status, disbursementMethod.
- ReconciliationRecord: reconId, date, expectedTotal, cashCounted, transfersTotal, variance, resolvedBy, notes.
- AuditLog: logId, actorId, action, targetId, metadata, timestamp.

## Required API surface
### Auth
- POST /auth/register/tso
- POST /auth/login
- POST /auth/verify-otp

### TSO
- GET /tso/:id/assignments
- POST /collections
- GET /collections/:id
- POST /withdrawals
- GET /withdrawals/:id

### Member and plan
- POST /members
- GET /members/:id
- POST /members/:id/plans
- GET /members/:id/plans

### Payments and reconciliation
- POST /webhooks/payments
- GET /transactions/unmatched
- POST /transactions/:id/match
- POST /reconciliation
- GET /reports/collections.csv

### Admin
- POST /admin/collections/:id/flag
- POST /admin/withdrawals/:id/approve
- POST /admin/withdrawals/:id/reject

## Nonfunctional requirements
- JWT auth and role middleware: isTSO, isAdmin, isCustomer.
- Request validation with zod or joi.
- Idempotency key enforcement for POST /collections.
- Payment webhook signature verification.
- Queue webhook processing and matching with BullMQ.
- Audit logging for all sensitive actions.

## Local setup requirements
- cp .env.example .env
- docker-compose up --build
- yarn workspace api dev
- yarn workspace web-admin start
- yarn workspace agent-app start

## Required environment variables
- MONGO_URI
- JWT_SECRET
- S3_BUCKET
- S3_KEY
- S3_SECRET
- SMS_API_KEY
- PAYMENT_WEBHOOK_SECRET
- REDIS_URL

## CI checks
- Lint and type-check.
- Unit tests.
- Integration tests for payment webhooks.
- Contract tests for POST /collections.
- Receipt image upload flow tests.

## MVP acceptance criteria
- TSO can register and login with OTP and bound device.
- TSO can collect offline and sync with image and geo metadata.
- Back office can view collections feed and reconcile totals.
- Webhooks are processed and transactions auto-matched or flagged.
- Withdrawals can be submitted, approved, and rejected.
- SMS receipts are sent after collection creation.

## Initial backlog for generated work
1. Monorepo scaffolding and workspace configuration.
2. Auth service with OTP and JWT.
3. Mongoose models for core entities.
4. POST /collections with idempotency and receipt upload.
5. React Native assignment and collection screens with offline queue.
6. Payment webhook handler with queue-based matcher.
7. Reconciliation job and admin UI.
8. Withdrawal request API and admin approval UI.
9. SMS notifications service for receipts.
10. Pilot deployment scripts and monitoring dashboards.

## Copilot generation rule
When generating code:
- Produce secure, typed, testable code.
- Include unit tests and integration tests for each endpoint.
- Include migration-safe schema changes.
- Include issue templates and task checklists when adding major features.
- Document assumptions and TODOs clearly in PR descriptions.
