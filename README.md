# Modernization Toolkit

A toolkit for AI-assisted modernization of legacy systems — rule catalog, agent
skills, differential-testing scaffolding, and a CLI to tie them together.

Built to address a specific failure mode: AI agents that produce confident,
plausible-looking code during modernization without the infrastructure to
verify that the new system actually matches the old one.

## What this is

Three things, layered:

1. **A rule catalog format** — structured, machine-readable, human-reviewable
   YAML describing the business rules in both legacy and modern systems, so
   you can compare them across stacks instead of comparing implementations
   that aren't directly comparable.

2. **A set of agent skills** — extraction, linking, verification, diff
   classification, mask proposal, property-test generation. Each one is
   opinionated about what counts as a rule and what counts as plumbing,
   what's safe to mask and what isn't, where AI helps and where it doesn't.

3. **A CLI** (`rules`) — wraps the catalog operations in something scriptable
   for CI and day-to-day work. Lint, status rollup, gap diff, verification.

## What this isn't

- Not a code translator. AI here is used for analysis and verification, not
  bulk translation. Translation between paradigms (relational → NoSQL,
  monolith → serverless) needs human judgment.
- Not a replacement for a differential testing harness. The catalog tells
  you *what* to verify; a harness proves it. The toolkit specs the harness
  contract but doesn't ship a runtime.
- Not stack-prescriptive. The patterns work for any legacy-to-modern
  migration. See `examples/` for one concrete instantiation.

## Layout

```
core/        Universal: schema, CLI, skill templates, steering, specs
examples/    Concrete instantiations for specific stacks
docs/        Concepts, getting started, references
```

The toolkit follows a deliberate split: opinions about *what* modernization
needs (in `core/`) are kept separate from opinions about *which stack you're
using* (in `examples/`). The opinions don't change between stacks. The
implementation details do.

## Quick start

Three paths depending on where you are:

**I'm starting a new modernization and want to use this as a template.**
Read `docs/getting-started.md`, copy an example from `examples/` that's
closest to your stack, adapt the steering and the catalog to your reality.

**I want to understand the approach before committing.**
Read `docs/concepts.md` for the conceptual model — rule catalog, status
discipline, differential harness, cutover gates. Then look at
`examples/dotnet-oracle-to-ts-aws/` to see it instantiated.

**I'm contributing a new example for a different stack.**
Read `docs/writing-an-example.md`. The short version: copy
`examples/dotnet-oracle-to-ts-aws/`, replace the stack-specific bits, keep
the structural shape.

## The example that ships

`examples/dotnet-oracle-to-ts-aws/` is a worked example for migrating a
.NET monolith with Oracle PL/SQL to TypeScript on AWS serverless with
DynamoDB. It includes:

- Kiro steering files (always-on, fileMatch, and manual variants)
- Kiro hooks (file-save and agent-stop automation)
- A populated rule catalog with six rules covering all status types
- A shadow harness mask configuration

If your stack is different, fork the example and adjust. The core/ pieces
work as-is regardless of stack.

## Status

This is a starting point, not a finished product. The CLI's `verify`,
`extract`, and `link` commands are scaffolded with clear integration
points for plugging in an AI provider. The skills are agent-platform
agnostic in intent; the example targets Kiro because that's what it was
built against, but Cursor, Continue, Claude Code, and Aider can all
host the same skills with different hosting mechanics.

## Why this exists

Most modernization tooling falls into two camps: code translators that
don't address verification, and RAG systems that produce confident
plausible answers without grounding. Both leave you to discover gaps
in production.

The rule catalog is the load-bearing artifact this toolkit produces — a
structured representation of behavior that can be diff'd, tested,
verified, and tracked through a deliberate status progression. Once you
have that, the AI work becomes additive: extraction populates the
catalog, verification proves implementations, classification triages
shadow output. The catalog is what makes the AI work auditable instead
of merely fast.

## License

MIT — see `LICENSE`.

## Acknowledgments

Initial scaffold developed in collaboration with Anthropic's Claude.
