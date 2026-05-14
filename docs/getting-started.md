# Getting Started

A practical walkthrough for adopting the toolkit with only portable catalog,
dashboard, CLI, and shadow-harness artifacts.

## Path A: I have a stack close to an existing example

Copy the closest example and install the CLI:

```bash
# From a fresh clone of this repo
cp -R examples/<closest-match>/. YOUR_REPO/

# Pull universal schema and CLI pieces from core/
cp -R core/schema YOUR_REPO/rules/.schema
mkdir -p YOUR_REPO/tools
cp -R core/cli YOUR_REPO/tools/rules-cli

cd YOUR_REPO/tools/rules-cli
npm install
npm run build
npm link

rules lint
rules dashboard
```

Then adapt:

1. Edit `rules/<domain>.yaml` for your domains, source paths, owners, and
   cutover metadata.
2. Edit or add `shadow/masks/*.yaml` for endpoints you plan to shadow.
3. Wire `rules extract`, `rules link`, and `rules verify` to your AI provider
   and test runner when you are ready to automate more of the loop.

## Path B: I have a novel stack

Start with the universal pieces only:

```bash
mkdir -p YOUR_REPO/rules YOUR_REPO/tools
cp -R core/schema YOUR_REPO/rules/.schema
cp -R core/cli YOUR_REPO/tools/rules-cli
```

Create one catalog file per domain:

```bash
YOUR_REPO/rules/orders.yaml
YOUR_REPO/rules/billing.yaml
YOUR_REPO/rules/policies.yaml
```

Use the example catalog as the shape reference:

```bash
examples/dotnet-oracle-to-ts-aws/rules/orders.yaml
```

## Path C: I want to understand the concepts first

Read in order:

1. [`CONCEPTS.md`](../CONCEPTS.md) — the conceptual model: catalog, status
   discipline, harness, and gates.
2. [`docs/ai-modernization-workflow.md`](ai-modernization-workflow.md) — how
   to use AI for .NET/Oracle to TypeScript/AWS modernization without letting AI
   make cutover decisions.
3. [`docs/rule-catalog.md`](rule-catalog.md) — the catalog format reference.
4. [`examples/dotnet-oracle-to-ts-aws/rules/orders.yaml`](../examples/dotnet-oracle-to-ts-aws/rules/orders.yaml)
   — a populated catalog with rules in multiple status states.
5. [`examples/dotnet-oracle-to-ts-aws/shadow/masks/orders-quote.yaml`](../examples/dotnet-oracle-to-ts-aws/shadow/masks/orders-quote.yaml)
   — what careful response masking looks like.

## Day-1 Loop

1. Pick a domain that is read-heavy, low-criticality, and well understood.
2. Extract rules from one legacy file, stored procedure, job, or endpoint.
3. Review the extracted YAML and promote good entries into `rules/<domain>.yaml`.
4. Link each rule to modern TypeScript service-layer sources as they are built.
5. Add example tests, property tests, and shadow evidence.
6. Use `rules dashboard` daily to catch gaps, unmapped endpoints, missing tests,
   and unverified implementations.

## When Things Go Wrong

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `rules lint` reports schema errors | Catalog drifted from schema | Check `core/schema/catalog.schema.json` |
| Lots of `confidence: low` extractions | Source chunk is too broad | Re-extract one procedure or symbol at a time |
| Linker proposes wrong matches | Similarity threshold is too low | Pass `--threshold 0.95` to `rules link` |
| Shadow harness is too noisy | Cosmetic diffs are under-masked | Review diff clusters and add narrow masks |
| Shadow harness is suspiciously quiet | Important fields are over-masked | Audit masks; never mask money, auth, state, or errors |
