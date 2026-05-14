# Example: .NET + Oracle -> TypeScript + AWS Serverless

A worked example for migrating a .NET monolith with Oracle PL/SQL backend to
TypeScript on AWS serverless.

## Stack Summary

| Layer            | Legacy                          | Modern                              |
|------------------|---------------------------------|-------------------------------------|
| Application      | C# (.NET Framework 4.8 / .NET 6) | TypeScript (strict mode)            |
| Business logic   | C# services + PL/SQL packages   | TS modules in domain tree           |
| Database         | Oracle 19c                      | DynamoDB (single-table)             |
| API style        | REST + some SOAP                | GraphQL (Apollo Server)             |
| Deployment       | IIS on Windows VMs              | AWS Lambda + API Gateway            |
| Frontend         | Server-rendered + jQuery        | Angular 17+                         |
| Auth             | Custom session cookies          | Cognito + custom claims             |
| IaC              | Manual / scripted               | AWS CDK                             |
| Test runner      | NUnit / xUnit                   | Vitest + fast-check                 |
| Exact arithmetic | C# `decimal`                    | `decimal.js`                        |

## What's In Here

```
rules/
└── orders.yaml             6 rules covering multiple status types

shadow/
└── masks/
    └── orders-quote.yaml   Mask config for POST /api/v2/orders/quote
```

## How To Use This Example

Copy the portable artifacts into your repo:

```bash
cp -R examples/dotnet-oracle-to-ts-aws/rules YOUR_REPO/
cp -R examples/dotnet-oracle-to-ts-aws/shadow YOUR_REPO/
cp -R core/schema YOUR_REPO/rules/.schema

mkdir -p YOUR_REPO/tools
cp -R core/cli YOUR_REPO/tools/rules-cli
cd YOUR_REPO/tools/rules-cli
npm install
npm run build
npm link
```

Then run:

```bash
rules lint
rules dashboard
```

## Things This Example Demonstrates

- Rule status values such as `implemented_verified`, `implemented_unverified`,
  `drift`, and `net_new`
- Drift with reason in `ORD-CALC-018`
- Modern-only behavior in `ORD-SIDE-014`
- Legacy PL/SQL and C# source pointers mapped to modern TypeScript modules
- Per-endpoint mask config with explicit no-mask-money policy
- Readiness metadata such as owner, priority, criticality, target release,
  shadow status, test refs, and ADR refs

## What's Deliberately Synthetic

- Customer-identifying examples
- File paths under `legacy/` and `modern/`
- ADR numbers
- Email addresses
- Simplified tax and compliance fixtures

## What's Real

- The rule catalog shape
- The source-to-source mapping discipline
- The status lifecycle
- The shadow harness contract
