# Getting Started

A walkthrough for adopting the toolkit. Three paths depending on where
you're starting.

## Path A: I have a stack close to an existing example

Easiest case. Find the closest example in `examples/`, fork it,
adapt the steering files to your specifics, and you're running.

```bash
# From a fresh clone of this repo
cp -R examples/<closest-match>/. YOUR_REPO/

# Pull universal pieces from core/
cp -R core/skills/* YOUR_REPO/.kiro/skills/
cp -R core/steering/* YOUR_REPO/.kiro/steering/
cp -R core/specs/_template YOUR_REPO/.kiro/specs/_template
cp -R core/schema YOUR_REPO/rules/.schema

# Install the CLI
cd YOUR_REPO/tools
cp -R ../../core/cli ./rules-cli
cd rules-cli
npm install && npm run build && npm link

# Verify
rules lint --help
```

Then:
1. Edit `.kiro/steering/product.md` for your product
2. Edit `.kiro/steering/tech.md` for your actual stack details
3. Edit `.kiro/steering/structure.md` for your repo layout
4. Run `rules lint examples/<closest-match>/rules/` to confirm the
   example catalog parses

## Path B: I have a novel stack

Slightly more work — you'll write your own stack-specific steering. The
universal pieces still apply.

1. Start from `core/` only:
   ```bash
   cp -R core/skills YOUR_REPO/.kiro/skills
   cp -R core/steering YOUR_REPO/.kiro/steering
   cp -R core/specs/_template YOUR_REPO/.kiro/specs/_template
   cp -R core/schema YOUR_REPO/rules/.schema
   cp -R core/cli YOUR_REPO/tools/rules-cli
   ```

2. Write your own:
   - `.kiro/steering/product.md` — what you're modernizing
   - `.kiro/steering/tech.md` — legacy + modern stacks
   - `.kiro/steering/structure.md` — your repo layout
   - `.kiro/steering/legacy-<lang>.md` — fileMatch on legacy code paths
   - `.kiro/steering/modern-<lang>.md` — fileMatch on modern code paths

   The shipped example provides a model for each of these.

3. Add stack-specific golden examples to
   `.kiro/skills/extract-business-rules/references/examples.md`.

4. If you're not using Kiro, see `docs/agent-platforms.md` for adapting
   the format to Cursor, Continue, Claude Code, etc.

## Path C: I want to understand the concepts first

Read in order:

1. [`CONCEPTS.md`](../CONCEPTS.md) — the conceptual model. Catalog,
   status discipline, harness, gates.
2. [`docs/rule-catalog.md`](rule-catalog.md) — the catalog format
   reference.
3. [`examples/dotnet-oracle-to-ts-aws/rules/orders.yaml`](../examples/dotnet-oracle-to-ts-aws/rules/orders.yaml)
   — a populated catalog with rules in every status state.
4. [`examples/dotnet-oracle-to-ts-aws/.kiro/steering/legacy-plsql.md`](../examples/dotnet-oracle-to-ts-aws/.kiro/steering/legacy-plsql.md)
   — the discipline around implicit context that distinguishes this
   approach from a RAG.
5. [`examples/dotnet-oracle-to-ts-aws/shadow/masks/orders-quote.yaml`](../examples/dotnet-oracle-to-ts-aws/shadow/masks/orders-quote.yaml)
   — what good masking looks like, including what's not masked.
6. [`core/steering/cutover-checklist.md`](../core/steering/cutover-checklist.md)
   — the gate sequence.

Then decide whether to adopt.

## Once you're set up — the day-1 loop

1. **Pick a domain to start with.** Read-heavy, low-criticality, well-
   understood. Don't start with payments or auth.

2. **First extraction.** In an agent session, point at a legacy file and
   ask: *"Extract business rules from `legacy/...`"*. The
   `extract-business-rules` skill activates; output goes to
   `rules-raw/legacy/<domain>/`.

3. **Review.** Open the YAML, check confidence levels, fix anything the
   agent got wrong. Promote good extractions to `rules/<domain>.yaml`.

4. **Implement the modern side.** Write the code referencing rule IDs in
   commits. The hooks will re-verify on save.

5. **Add the endpoint to your shadow harness.** Generate a mask config
   via the `propose-mask-rules` skill on a sample of diffs. Manually
   review — never trust auto-generated masks blindly.

6. **Wait for clean.** Cutover gates the rest.

## When things go wrong

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `rules lint` reports schema errors | Catalog drifted from schema | Check the schema in `core/schema/catalog.schema.json` |
| Skill doesn't activate when expected | Description doesn't match the user's phrasing | Edit the SKILL.md frontmatter to add the missing phrase |
| Lots of `confidence: low` extractions | Chunk size too large | Re-extract one symbol at a time |
| Linker proposes obviously wrong matches | Default threshold too low | Pass `--threshold 0.95` to `rules link` |
| Shadow harness too noisy | Mask config under-masking cosmetic diffs | Use `propose-mask-rules` on the noisy clusters |
| Shadow harness suspiciously quiet | Mask config over-masking real diffs | Audit the mask file; ensure no money/auth/state fields are masked |
