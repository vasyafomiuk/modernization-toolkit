---
name: extract-business-rules
description: Extract business rules from source code into structured catalog YAML. Use whenever the user asks to extract rules, catalog logic, analyze legacy behavior, document what a service or stored procedure does, or build a rule catalog. Activates on phrases like "extract rules", "rule catalog", "analyze legacy", "what does this do" applied to source files. Also use when seeding the rule catalog from existing modern code.
---

# Extract Business Rules

Extract business rules from source code into the canonical catalog format
defined in `references/catalog-schema.md`. The output drives downstream
verification, gap analysis, and shadow-harness test generation.

## When to use

- User points at a source file or symbol and asks for extraction
- User runs `rules extract` and the agent is the backend
- User asks "what business rules are in this code"
- User asks "what does this service/procedure do" in a way that implies
  cataloguing (e.g. "for the catalog")
- Seeding either side of the catalog from existing code

## When NOT to use

- User just wants an explanation of code in conversation. Use a behavioral
  summary, not the structured extraction format.
- File is plumbing only (dependency injection, HTTP routing with no domain
  logic, DTO mapping, framework boilerplate). Return an empty list rather
  than inventing rules.
- The "extraction" would be from comments or docs, not code. Comments lie.

## Process

1. **Parse the target.** Use language-appropriate tooling (AST parsers
   are far better than text matching). One symbol per extraction pass is
   the right granularity — whole-file extractions lose focus and produce
   weaker results.

2. **Inline one level of callees.** When a method calls `Foo.Bar(x)`, fetch
   `Bar`'s body for context. Two levels is too much; the model loses focus.

3. **Apply the extraction system prompt** in
   `references/extraction-system-prompt.md`. It enforces the YAML schema
   and the "no plumbing, no hallucination" rules.

4. **For each candidate rule, construct at least 2 examples** from
   observed code behavior:
   - 1 positive (rule fires, expected outcome)
   - 1 negative or edge (rule does not fire, or boundary condition)

   If you cannot construct examples from what the code visibly does, set
   `confidence: low` and explain in the `notes` field. Never invent
   examples to satisfy the schema.

5. **Output strict YAML** matching the catalog schema. No prose, no
   commentary outside the YAML structure.

6. **Write to `rules-raw/<system>/<domain>/<source-path>.yaml`** where
   `<system>` is `legacy` or `modern`. Do NOT write directly to `rules/`;
   the canonical catalog requires the linker step plus human review.

## Implicit context — the most common extraction failure

Many source languages have implicit context that does NOT appear in the
visible code body and materially affects behavior. Examples by family:

- **Stored procedures**: package state, session variables, autonomous
  transactions, triggers on referenced tables, sequence side effects,
  session NLS or locale settings, implicit commits on DDL.
- **OO with frameworks**: dependency-injected services with non-obvious
  bindings, AOP advice, decorators or attributes that intercept calls,
  static initializers with side effects.
- **Dynamic languages**: runtime type coercion, monkey-patched methods,
  metaclass behavior, import-time side effects.

The project's per-language steering and reference files document the
specific implicit-context traps for the stacks in use. **Always read
those before extracting from a new language.** Missing implicit context
produces extractions that look right but are subtly wrong.

## Confidence calibration

- **high** — logic AND examples are directly visible in this snippet.
  No assumptions about callers or external state.
- **medium** — logic is clear but constructing examples required
  reasoning about callers, configuration, or non-obvious data.
- **low** — extraction is partial. Behavior depends on context not visible
  in the chunk. Always flag for human review.

## Anti-patterns

- **Inventing rules to seem thorough.** Empty output is the correct answer
  for plumbing-only files. A null result is a successful extraction.
- **Quoting source-language syntax in `logic:`.** Use pseudocode. The
  `logic:` field's purpose is cross-system comparison; source-language
  text in there defeats it.
- **Collapsing several rules into one because they share a method.** One
  method can encode multiple rules; one rule should describe one decision.
- **Treating a comment as authoritative.** Comments lie; code is truth.
  If they disagree, note the disagreement in `notes`.

## References

- `references/catalog-schema.md` — full YAML schema with field definitions
- `references/extraction-system-prompt.md` — the system prompt the agent
  applies during extraction

Project-specific reference files (golden examples per language, common
pitfalls in this stack) typically live in the example directory under
`.kiro/skills/extract-business-rules/references/`. Check there for
language-specific guidance before extracting.
