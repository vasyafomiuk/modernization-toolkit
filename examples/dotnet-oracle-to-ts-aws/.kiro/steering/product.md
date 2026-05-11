---
inclusion: always
---
# Product: Legacy Modernization

## What we're building
A modernized version of the [PRODUCT_NAME] system, currently running as a
.NET monolith with an Oracle database, being progressively migrated to a
TypeScript + Angular frontend with an AWS serverless backend (Lambda,
API Gateway, GraphQL, DynamoDB).

## Why
- [Reason 1: e.g., scaling limits of the monolith]
- [Reason 2: e.g., team velocity blocked by deploy cycles]
- [Reason 3: e.g., Oracle licensing cost]

## Operating mode
This is a **strangler-fig modernization in progress**. Both systems run in
parallel. Endpoints are cut over individually after passing differential
verification in shadow mode.

We are currently in phase 3 of 6. Phases 1-2 cut over read-heavy,
low-criticality endpoints. Phase 3 expands across more domains. Phases 4-6
will tackle money paths, write-heavy paths, and PL/SQL-heavy modules.

## Success metrics
- Endpoints cut over (cumulative): track in `cutover-status.md`
- Shadow diff error-cluster count (target: 0 sustained)
- Time-from-extract-to-verified-cutover per endpoint (target: <14 days)
- Rule catalog coverage of legacy domains (target: >80% per active domain)

## Non-goals
- We are NOT replacing the legacy system in one big bang.
- We are NOT introducing new product features through the modernization
  unless explicitly scoped as a separate spec.
- We are NOT refactoring the data model and changing the stack in the
  same cutover. Pick one transformation per endpoint.
