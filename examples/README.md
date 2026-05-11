# Examples

Concrete instantiations of the modernization toolkit for specific stacks.

Each example is a complete, working setup you can fork. The `core/` pieces
(schema, CLI, universal skills, universal steering) are referenced into
the example as needed; the example adds stack-specific steering, hooks,
catalog entries, and shadow harness configuration.

## Available examples

### `dotnet-oracle-to-ts-aws/`

The reference example. Migration from a .NET monolith with Oracle
PL/SQL backend to TypeScript on AWS serverless (Lambda + API Gateway +
GraphQL + DynamoDB).

Hosts skills via the Kiro IDE convention (`.kiro/` directory with
steering, hooks, and skill references).

**Contents:**
- 6 stack-specific steering files (product, tech, structure, plus C#,
  PL/SQL, and TypeScript-specific guidance)
- 4 Kiro hooks for save-time and stop-time automation
- 6 rules in a populated catalog covering all status types
- 1 shadow harness mask config for a quote endpoint
- Golden extraction examples in C# and PL/SQL

## Adding an example

If you want to contribute an example for a different stack, the rough
shape is:

```
examples/<source-stack>-to-<target-stack>/
├── README.md                         # What this example covers
├── .<agent-platform>/                # Or platform-equivalent directory
│   ├── steering/                     # Stack-specific steering
│   │   ├── product.md
│   │   ├── tech.md
│   │   ├── structure.md
│   │   ├── legacy-<lang>.md          # Per legacy language
│   │   └── modern-<lang>.md          # Per modern language
│   ├── hooks/                        # Platform-specific automation
│   └── skills/                       # Stack-specific skill references
│       └── extract-business-rules/
│           └── references/
│               └── examples.md       # Golden examples in source langs
├── rules/
│   └── <domain>.yaml                 # Sample catalog (real or synthetic)
└── shadow/
    └── masks/
        └── <endpoint>.yaml           # Sample mask config
```

The principle: **the universal parts come from `core/`. The example adds
only what's stack-specific.** If you find yourself duplicating something
from `core/`, the universal version probably needs an extension point
instead.

## What to put in an example

**Do include:**
- Steering files that name the actual technologies, libraries, and conventions
- Realistic golden examples (synthetic data is fine; structure must be real)
- A populated rule catalog with rules in multiple status states
- Working hook or automation configurations for the agent platform
- A shadow mask config that demonstrates per-field rules and severity

**Don't include:**
- Real production code, customer data, or business-sensitive examples
- Stack-version-specific quirks better documented in upstream docs
- Aspirational features the toolkit doesn't actually support yet
