# Example: .NET + Oracle → TypeScript + AWS Serverless

A worked example of using the modernization toolkit for migrating a .NET
monolith with Oracle PL/SQL backend to TypeScript on AWS serverless.

## Stack summary

| Layer            | Legacy                          | Modern                              |
|------------------|---------------------------------|-------------------------------------|
| Application      | C# (.NET Framework 4.8 / .NET 6) | TypeScript (strict mode)            |
| Business logic   | C# services + PL/SQL packages   | TS modules in domain tree           |
| Database         | Oracle 19c                      | DynamoDB (single-table)             |
| API style        | REST + some SOAP                | GraphQL (Apollo Server)             |
| Deployment       | IIS on Windows VMs              | AWS Lambda + API Gateway            |
| Frontend         | Server-rendered + jQuery        | Angular 17+ (separate)              |
| Auth             | Custom session cookies          | Cognito + custom claims             |
| IaC              | manual / scripted               | AWS CDK                             |
| Test runner      | NUnit / xUnit (legacy)          | vitest + fast-check (modern)        |
| Exact arithmetic | C# `decimal`                    | `decimal.js`                        |
| Agent platform   | n/a                             | Kiro IDE                            |

## What's in here

```
.kiro/
├── steering/
│   ├── product.md          What we're modernizing and why
│   ├── tech.md             The dual-stack details above
│   ├── structure.md        Repo layout conventions
│   ├── legacy-csharp.md    fileMatch: legacy C# guidance
│   ├── legacy-plsql.md     fileMatch: PL/SQL guidance (implicit context!)
│   └── modern-ts.md        fileMatch: modern TS guidance
├── skills/
│   └── extract-business-rules/
│       └── references/
│           └── examples.md  Golden extractions in C#, PL/SQL, TS
└── hooks/
    ├── on-save-modern-domain.json
    ├── on-save-rule-file.json
    ├── prompt-submit-inject-rule.json
    └── agent-stop-verify.json

rules/
└── orders.yaml             6 rules covering all status types

shadow/
└── masks/
    └── orders-quote.yaml   Mask config for POST /api/v2/orders/quote
```

## How to use this example

### Option 1: I have the same stack

Copy the example into your repo root, merging `.kiro/` with whatever
you already have:

```bash
cp -R examples/dotnet-oracle-to-ts-aws/.kiro YOUR_REPO/
cp -R examples/dotnet-oracle-to-ts-aws/rules YOUR_REPO/
cp -R examples/dotnet-oracle-to-ts-aws/shadow YOUR_REPO/

# Pull in the universal core too
cp -R core/schema YOUR_REPO/rules/.schema
cp -R core/skills/* YOUR_REPO/.kiro/skills/   # universal skills
cp -R core/steering/* YOUR_REPO/.kiro/steering/  # universal steering
cp -R core/specs/_template YOUR_REPO/.kiro/specs/_template
cd YOUR_REPO/tools && cp -R ../../core/cli ./rules-cli && cd rules-cli && npm install && npm run build && npm link
```

Then edit `.kiro/steering/{product,tech,structure}.md` with your specifics
and start extracting.

### Option 2: Similar but not identical stack

Use this as a reference for structure and conventions, but write your own
steering files. The skills, schema, and CLI come from `core/` regardless
of stack.

### Option 3: Studying the approach

The interesting files to read in order:

1. `rules/orders.yaml` — the catalog itself, shows all six status types in
   one place
2. `.kiro/steering/legacy-plsql.md` — the implicit-context discipline that
   most RAG-based approaches miss entirely
3. `shadow/masks/orders-quote.yaml` — what good masking looks like, and
   what's explicitly NOT masked
4. `.kiro/hooks/agent-stop-verify.json` — the safety net that enforces
   "status is earned, not assigned" mechanically rather than relying on
   review discipline

## Things this example demonstrates

- **All seven rule status values** in the catalog (extracted,
  implemented_unverified, implemented_verified, gap, drift, net_new,
  deprecated — well, six of the seven; deprecated is rare)
- **Drift with reason** in `ORD-CALC-018` (tax calculation rounds
  per-line in modern vs sum-then-round in legacy, with ADR reference)
- **Net-new behavior** in `ORD-SIDE-014` (modern adds event-driven
  notifications that legacy did via nightly batch)
- **PL/SQL implicit-context handling** in the legacy-plsql steering
- **Money exactness enforcement** in the modern-ts steering
- **DynamoDB access-pattern discipline** in structure.md
- **Per-endpoint mask config** with explicit no-mask-money policy

## What's deliberately synthetic

- All customer-identifying examples (gold-tier, embargoed countries
  using `XX`)
- All file paths under `legacy/` and `modern/` (illustrative; your repo
  will use different paths)
- Tax rates (CA 7.25%, OR 0%) are real US rates but used illustratively;
  real tax engines are more complex
- Email addresses (`jane@example.com`, `alex@example.com`)
- ADR numbers referenced (ADR-0017, ADR-0023)

## What's real

- The structure
- The discipline (status is earned, money is exact, no cross-aggregate
  transactions)
- The PL/SQL implicit-context warnings
- The cutover gate sequence
- The shadow harness contract
