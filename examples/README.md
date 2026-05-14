# Examples

Concrete modernization examples for specific source and target stacks.

Each example keeps only portable artifacts:

- Rule catalogs under `rules/`
- Shadow harness mask examples under `shadow/`
- A README explaining the stack and assumptions

Agent-platform files, hooks, prompts, and editor-specific automation are
intentionally not included.

## Available Examples

### `dotnet-oracle-to-ts-aws/`

Reference migration from a .NET monolith with Oracle PL/SQL backend to
TypeScript on AWS serverless, GraphQL, and DynamoDB.

**Contents:**

- 6 rules in a populated catalog covering multiple status types
- 1 shadow harness mask config for a quote endpoint
- Stack notes in the README

## Adding An Example

If you contribute another stack, keep the shape small:

```
examples/<source-stack>-to-<target-stack>/
├── README.md
├── rules/
│   └── <domain>.yaml
└── shadow/
    └── masks/
        └── <endpoint>.yaml
```

Do include realistic rule entries, source paths, test references, ADR refs,
and shadow mask examples. Do not include production code, customer data,
editor-specific scaffolding, or automation configuration tied to a particular
IDE.
