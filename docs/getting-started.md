# Getting Started

A practical walkthrough for adopting the toolkit as a dashboard-first tracker.

## Path A: I have a stack close to an existing example

Copy the closest example and run the dashboard:

```bash
# From a fresh clone of this repo
cp -R examples/<closest-match>/. YOUR_REPO/
cp -R core/schema YOUR_REPO/rules/.schema

cd core/dashboard
npm install
npm run build
npm start
```

Then register `YOUR_REPO` in the dashboard.

## Path B: I have a novel stack

Create the portable catalog structure:

```bash
mkdir -p YOUR_REPO/rules YOUR_REPO/shadow/masks
cp -R core/schema YOUR_REPO/rules/.schema
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
2. Extract rules from one legacy file, stored procedure, job, or endpoint with
   your preferred AI workflow.
3. Review the extracted YAML and promote good entries into `rules/<domain>.yaml`.
4. Link each rule to modern TypeScript service-layer sources as they are built.
5. Add example tests, property tests, and shadow evidence references.
6. Use the dashboard daily to catch gaps, unmapped endpoints, missing tests, and
   unverified implementations.

## When Things Go Wrong

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Dashboard cannot load a catalog | YAML does not match the catalog shape | Check `core/schema/catalog.schema.json` |
| Lots of `confidence: low` extractions | Source chunk is too broad | Re-extract one procedure or symbol at a time |
| Rule mapping looks wrong | Legacy and modern behavior were linked too eagerly | Mark as `gap` or `drift` until reviewed |
| Shadow harness is too noisy | Cosmetic diffs are under-masked | Review diff clusters and add narrow masks |
| Shadow harness is suspiciously quiet | Important fields are over-masked | Audit masks; never mask money, auth, state, or errors |
