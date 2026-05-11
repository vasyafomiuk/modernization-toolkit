# Core

Everything in `core/` is intended to be stack-agnostic. The concepts,
schema, skills, and CLI are designed to work for any legacy-to-modern
migration. Stack-specific instantiation lives under `examples/`.

## What's here

```
core/
├── schema/         JSON Schema for the rule catalog
├── cli/            The `rules` CLI (TypeScript, ESM)
├── skills/         Agent skill templates (extract, link, verify, etc.)
├── steering/       Universal agent steering files
├── specs/_template Cutover spec template (requirements, design, tasks)
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

### `skills/`

Six agent skills in the Agent Skills format (SKILL.md with YAML
frontmatter). They're designed for Kiro but the format is portable to
Cursor, Continue, Claude Code, and similar platforms with minor wrapper
changes. See the examples directory for one full Kiro hosting.

### `steering/`

Three universal steering files:
- `modernization-rules.md` — the working rules (status is earned, no
  cross-aggregate transactions, etc.). Always-on inclusion.
- `rule-catalog-schema.md` — guidance for editing the catalog. FileMatch
  on `rules/**/*.yaml`.
- `cutover-checklist.md` — pre/during/post cutover gates. Manual inclusion.

The example directory adds stack-specific steering on top:
`product.md`, `tech.md`, `structure.md`, plus language-specific files.

### `specs/_template`

Three-file spec template for cutover work: `requirements.md`,
`design.md`, `tasks.md`. Designed to be copied into
`.kiro/specs/<endpoint>-cutover/` per cutover.

### `shadow/README.md`

The differential harness contract: mask rule types, severity routing,
adapter convention. The toolkit doesn't ship a harness runtime — too
stack-specific — but specifies the contract so any runtime can fit.

## How to use

Two paths:

**Adopt an example.** Pick the closest example from `examples/`, copy it
into your repo, and adapt the stack-specific files. The `core/` pieces
come along for the ride.

**Build from `core/` alone.** If your stack is novel, copy `core/` into
your repo and write your own steering, hooks, and skill references.
Reading the example first is still recommended — it shows what
adaptation looks like in practice.

## What's intentionally not here

- **Agent-platform-specific hooks.** Hooks like the Kiro `on-save-*.json`
  files live in `examples/<stack>/.kiro/hooks/` because their format is
  Kiro-specific. The *patterns* they encode (re-verify on save, lint
  catalog on save, inject rule context, downgrade status on agent stop)
  are universal; the file format isn't.

- **Test runner integrations.** The verify command's example execution
  is scaffolded but not implemented because the right answer depends on
  your stack (vitest for TS, pytest for Python, JUnit for Java, etc.).
  See `cli/src/commands/verify.ts` for the integration point.

- **AI provider integrations.** The extract and link commands have
  integration points for calling an AI provider. The toolkit doesn't
  prescribe which provider — Anthropic API, Bedrock, OpenAI, local
  models all work behind the same prompt contract.
