---
inclusion: always
---
# Repository Structure

```
.
├── legacy/                  Legacy .NET + Oracle codebase (read-only context)
│   ├── src/                 C# sources
│   └── db/                  PL/SQL packages, procedures, views
├── modern/                  Modern TS / Angular / AWS codebase
│   ├── src/
│   │   ├── domain/          Domain logic — rule-referenced code lives HERE
│   │   ├── resolvers/       GraphQL resolvers
│   │   ├── handlers/        Lambda handlers (thin)
│   │   └── infra/           CDK
│   └── tests/
├── rules/                   The canonical rule catalog
│   ├── _schema.json         JSON Schema for catalog files
│   └── <domain>.yaml        One file per domain (orders, billing, returns…)
├── rules-raw/               Raw AI extractions awaiting review
│   ├── legacy/<domain>/
│   └── modern/<domain>/
├── shadow/                  Differential harness
│   ├── masks/<endpoint>.yaml   Per-endpoint masking config
│   ├── adapters/               Canonical-shape projections
│   └── samples/                Captured diff samples for review
├── docs/
│   ├── access-patterns.md   DynamoDB access pattern registry
│   ├── cutover-status.md    Per-endpoint state
│   └── adrs/                Architecture decision records
├── tools/
│   ├── rules-cli/           The `rules` CLI
│   ├── rules-mcp/           MCP wrapper around the CLI
│   └── shadow-mcp/          MCP wrapper around the harness
└── .kiro/                   Agent configuration (this directory)
```

## Where business logic lives

- **Legacy**: `legacy/src/**/Services/`, `legacy/src/**/Domain/`,
  `legacy/db/**/*.pck` (PL/SQL packages — bodies in `.pkb`)
- **Modern**: `modern/src/domain/<aggregate>/`

Rules in the catalog reference these paths via `sources.legacy` and
`sources.modern`. If you move or rename code, update the catalog or the
`on-save-modern-domain` hook will flag broken references.

## Naming conventions

- Rule IDs: `<DOMAIN>-<KIND>-<NUM>` where KIND ∈ {VAL, CALC, AUTH, STATE, SIDE}
  (e.g. `ORD-CALC-007`, `BILL-AUTH-012`)
- Spec directories: `.kiro/specs/<endpoint-or-feature>-cutover/`
- Modern domain files: `modern/src/domain/<aggregate>/<concern>.ts`
  (e.g. `modern/src/domain/orders/pricing/discount.ts`)
