# Core

Everything in `core/` is intended to be stack-agnostic. The schema, dashboard,
and shadow contract are designed to work for any legacy-to-modern migration.
Stack-specific instantiation lives under `examples/`.

## What's here

```
core/
├── schema/         JSON Schema for the rule catalog
├── dashboard/      Local dashboard app (TypeScript, ESM)
└── shadow/         Differential harness contract documentation
```

## What each piece does

### `schema/catalog.schema.json`

JSON Schema (draft-07) for catalog files. Use it for IDE autocomplete,
validation, and as the source of truth for the catalog shape.

### `dashboard/`

The local dashboard app. It registers modernization projects, reads their
`rules/` catalogs, shows readiness and gap radar views, maps legacy sources to
modern sources, and lets teams add or edit rules in YAML.

### `shadow/README.md`

The differential harness contract: mask rule types, severity routing,
adapter convention. The toolkit doesn't ship a harness runtime — too
stack-specific — but specifies the contract so any runtime can fit.

## How to use

Two paths:

**Adopt an example.** Pick the closest example from `examples/`, copy it
into your repo, and adapt the catalog and shadow masks.

**Build from `core/` alone.** If your stack is novel, copy the schema and
dashboard into your repo, then create domain catalogs under `rules/`. Reading
the example first is still recommended.

## What's intentionally not here

- **Test runner integrations.** The dashboard records evidence references but
  does not execute your project's tests.

- **AI provider integrations.** The toolkit does not prescribe an AI provider.
  Use the catalog and dashboard as the artifact layer for whichever extraction,
  linking, and test-generation workflow you choose.
