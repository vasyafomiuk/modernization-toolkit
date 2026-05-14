# AI Modernization Workflow

This workflow is written for a common migration shape: a .NET monolith with
Oracle PL/SQL and stored procedures moving to TypeScript, Angular, AWS
serverless, GraphQL, and DynamoDB.

## Operating model

Use AI to create and maintain auditable artifacts, not to declare the migration
correct. The durable artifact is the rule catalog. Every extracted rule points
to legacy sources, modern sources, examples, ownership, readiness metadata, and
verification evidence.

The loop is:

1. Extract rules from legacy code and PL/SQL one procedure, package, endpoint,
   job, or workflow at a time.
2. Normalize the rule into stack-neutral pseudocode and examples.
3. Extract or identify the modern TypeScript service-layer implementation.
4. Link legacy and modern sources into one rule entry.
5. Classify the rule as verified, unverified, gap, drift, net-new, or deprecated.
6. Generate tests and shadow checks from the rule.
7. Promote status only from evidence.

## Where AI helps

Use AI for high-volume analysis:

- Identify business rules hidden in PL/SQL packages, triggers, constraints,
  .NET services, jobs, and configuration.
- Rewrite source-specific logic into neutral pseudocode.
- Propose matches between legacy rules and modern service-layer rules.
- Generate positive, negative, and edge examples.
- Generate unit, property, and contract tests from examples.
- Classify shadow diff clusters into bug, accepted drift, bad mask, or data
  availability issue.
- Draft cutover checklists and release notes from the catalog.

Keep humans and deterministic checks in charge of the decisions:

- Human review confirms extracted rules.
- Tests prove examples against the modern implementation.
- Shadow traffic proves real behavior.
- ADRs explain intentional drift.
- Cutover gates use catalog status and evidence, not model confidence.

## Comparing business rules

Do not compare .NET/PLSQL and TypeScript line by line. Compare behavior:

- `logic` is neutral pseudocode.
- `sources.legacy` points to C#, PL/SQL packages, triggers, tables, or jobs.
- `sources.modern` points to TypeScript services, resolvers, domain modules, or
  event handlers.
- `examples` express observable behavior.
- `status` records the modernization truth.

Useful status meanings:

- `gap`: legacy behavior exists but modern behavior is missing.
- `implemented_unverified`: modern code exists but evidence is not enough yet.
- `drift`: behavior differs intentionally and needs an ADR or review note.
- `net_new`: modern-only behavior with no legacy counterpart.
- `implemented_verified`: examples and/or shadow evidence support cutover.

## Testing strategy

Layer the tests so each one catches a different class of gap:

- Example tests: run the catalog examples against the TypeScript implementation.
- Property tests: generate broad input ranges for calculations, validation, and
  state transitions.
- Contract tests: verify GraphQL schema, resolver behavior, auth errors, and
  DynamoDB access assumptions.
- Golden-master tests: run selected legacy fixtures through both systems.
- Shadow traffic: replay or fork production requests, canonicalize responses,
  mask safe cosmetic fields, and diff everything else.
- Cutover gates: require clean shadow days, rollback proof, and rule coverage
  before flipping an endpoint.

For Oracle-to-DynamoDB migrations, pay extra attention to rules that were
implicit in relational constraints, triggers, transactions, sequences, default
values, scheduled packages, and session context. Those often become explicit
service-layer or event rules in the modern system.

## Dashboard workflow

Use the dashboard as the team surface:

- Register each modernization repo or domain workspace as a project.
- Add rules through the structured form or edit YAML directly when needed.
- Use Readiness to track endpoint cutover state by owner, priority, blockers,
  and shadow status.
- Use Gap radar daily to find missing modern mappings, unverified rules,
  unmapped endpoints, missing tests, low-confidence extractions, and shadow
  issues.
- Use Compare to search and inspect the legacy-to-modern mapping for a rule.
- Use Map to see which PL/SQL/C# sources connect to which TypeScript services.
