# Core

Everything in `core/` is intended to be stack-agnostic. The concepts,
schema, CLI, dashboard, and shadow contract are designed to work for any legacy-to-modern
migration. Stack-specific instantiation lives under `examples/`.

## What's here

```
core/
├── schema/         JSON Schema for the rule catalog
├── cli/            The `rules` CLI (TypeScript, ESM)
└── shadow/         Differential harness contract documentation
```

## What each piece does

### `schema/catalog.schema.json`

JSON Schema (draft-07) for catalog files. Use it for IDE autocomplete,
validation, and as the source of truth for the catalog shape.

### `cli/`

The `rules` CLI. Six commands: `lint`, `status`, `diff`, `verify`,
`extract`, `link`. Lint, status, and diff are fully functional. Verify,
extract, and link are scaffolded with clear integration points for
plugging in an AI provider and a test runner of your choice.

### `shadow/README.md`

The differential harness contract: mask rule types, severity routing,
adapter convention. The toolkit doesn't ship a harness runtime — too
stack-specific — but specifies the contract so any runtime can fit.

## How to use

Two paths:

**Adopt an example.** Pick the closest example from `examples/`, copy it
into your repo, and adapt the catalog and shadow masks.

**Build from `core/` alone.** If your stack is novel, copy `core/` into
your repo and wire the CLI's extract/link/verify integration points to your
AI provider and test runner. Reading the example first is still recommended.

## What's intentionally not here

- **Test runner integrations.** The verify command's example execution
  is scaffolded but not implemented because the right answer depends on
  your stack (vitest for TS, pytest for Python, JUnit for Java, etc.).
  See `cli/src/commands/verify.ts` for the integration point.

- **AI provider integrations.** The extract and link commands have
  integration points for calling an AI provider. The toolkit doesn't
  prescribe which provider — Anthropic API, Bedrock, OpenAI, local
  models all work behind the same prompt contract.
