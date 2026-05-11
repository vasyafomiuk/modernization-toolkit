---
inclusion: always
---
# Technology Stack

## Legacy system (source of behavioral truth during migration)
- **Language**: C# (.NET Framework 4.8 / .NET 6 — verify per service)
- **Database**: Oracle 19c
- **Business logic locations**: C# services AND PL/SQL packages/procedures
- **API style**: REST + some SOAP
- **Deployment**: IIS on Windows VMs

## Modern system
- **Frontend**: Angular 17+, TypeScript strict mode
- **Backend**: TypeScript on AWS Lambda
- **API style**: GraphQL (Apollo Server)
- **Database**: DynamoDB (single-table design)
- **Infra-as-code**: AWS CDK
- **Auth**: Cognito + custom claims
- **Observability**: CloudWatch, X-Ray, EMF metrics

## Verification stack
- **Unit tests**: vitest
- **Property tests**: fast-check
- **Contract tests**: Pact (for GraphQL schema snapshots)
- **Local integration**: LocalStack + DynamoDB Local
- **E2E**: Playwright against staging

## Constraints worth knowing
- Money fields MUST use `decimal.js` (never `number`) on the modern side.
  Legacy uses C# `decimal`. Floating-point in pricing/tax/discount paths
  is a critical bug.
- DynamoDB single-table: new access patterns require a document update
  in `docs/access-patterns.md` BEFORE the code change.
- Cross-aggregate transactions are NOT supported in the modern stack.
  If you need one, the domain boundary is wrong — escalate before coding.
- All Lambdas use cold-start-aware patterns (top-level connection reuse,
  AWS SDK v3 modular imports).

## MCP servers configured
- `rules-mcp` — exposes the catalog tools to the agent
- `shadow-mcp` — exposes diff classification tools
- `oracle-readonly` — read-only access to the legacy DB for extraction
- `aws-api-mcp` — for inspecting AWS resources
