---
inclusion: fileMatch
fileMatchPattern: "rules/**/*.yaml"
---
# Working with the Rule Catalog

You are editing the canonical source of truth for business behavior across
both systems. Changes here have downstream effects on tests, the shadow
harness, and cutover decisions.

## Schema rules

Every rule MUST have:
- `id` — stable, format `<DOMAIN>-<KIND>-<NUM>` (e.g. `ORD-CALC-007`)
- `type` — one of: validation, calculation, authorization, state_transition, side_effect
- `domain` — matches the filename
- `description` — one-sentence human-readable summary
- `logic` — pseudocode (NOT source-language)
- `examples` — at least 2: one positive, one negative or edge case
- `sources.legacy` AND/OR `sources.modern` — at least one path with line numbers
- `status` — extracted | implemented_unverified | implemented_verified | gap | drift | net_new
- `confidence` — high | medium | low

See `rules/_schema.json` for full schema. Lint with `rules lint <file>`.

## Editing principles

- **IDs are immutable.** Once assigned, never change a rule ID. If a rule
  splits, the original keeps its ID and new rules get new IDs with
  `aliases: [<original-id>]`.
- **Examples are tests.** Every example must be runnable. Wrong examples
  produce wrong tests.
- **Logic is paraphrase, not quote.** Cross-system pseudocode lets us
  diff legacy and modern semantics. Source-language code defeats this.
- **Never set `status: implemented_verified` by editing the file.** Only
  the shadow harness or `rules verify` with all passing examples should
  cause this transition.

## When to add a rule vs amend one

- New behavior in the modern system that has no legacy counterpart →
  new rule with `status: net_new`.
- Discovered legacy behavior not yet in catalog → new rule with
  `status: extracted`.
- Legacy rule whose modern implementation diverges intentionally → keep
  the rule, set `status: drift`, add `drift_reason` field, link the ADR.
- Same logic, found a new source location → add to `sources.<system>` array.

## Common mistakes to avoid

- Inventing examples to satisfy the schema. If you can't construct an
  example from code behavior, set `confidence: low` and explain in `notes`.
- Mirroring source-language syntax in `logic:`. The pseudocode is for
  human and cross-system reasoning.
- Collapsing several rules into one because they share a method. One
  method can encode multiple rules; one rule should describe one decision.
- Removing rules during catalog edits. If a rule is obsolete, set
  `status: deprecated` with `deprecated_reason`; never delete entries.

## Linking changes

When adding or editing a rule, the `link-rule-catalogs` skill can be used
to re-check cross-system matches. Use it whenever you add a `sources.legacy`
or `sources.modern` entry to verify consistency.
