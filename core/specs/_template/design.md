# Design: <endpoint-or-feature> Cutover

> Spec template. Replace placeholders. Use mermaid diagrams where they
> earn the space — prose first.

## Approach

One paragraph: how this cutover is structured at a high level. Strangler-
fig per-endpoint with feature-flag routing? Dual-write with eventual
authority flip? Specify explicitly.

## Modern implementation

### File layout

- `<domain-tree>/<aggregate>/<concern>` — main domain logic
- `<domain-tree>/<aggregate>/<concern>-tests` — unit tests
- `<api-surface-tree>/<endpoint>` — API entry point (REST/GraphQL/RPC)
- `<deployment-unit-tree>/<unit>` — deployment entry (e.g. Lambda handler,
  container endpoint, message consumer). Should be thin — domain logic
  belongs in the domain tree, not here.

### Key code units

For each non-trivial new function or class:

#### `functionName(args) -> returnType`

- Inputs: ...
- Outputs: ...
- Side effects: ... (or "none")
- Rule(s) implemented: `<DOMAIN>-<KIND>-NNN`, ...
- Notes on subtle decisions: ...

## Data access patterns

List every read and write this code performs. New patterns require a doc
update in the project's access-pattern registry BEFORE merge.

| # | Operation | Key/Identifier | Filter/Scope | Why |
|---|-----------|----------------|--------------|-----|
| 1 | Read      | ...            | ...          | ... |
| 2 | Read-range | ...           | ...          | ... |
| 3 | Atomic write | ...          | ...          | ... |

Cross-aggregate transactions are NOT permitted. If a row/document/record
in this store crosses aggregates, escalate before coding.

## API surface impact

- Types or schemas added or modified: ...
- Endpoints/operations added: ...
- Breaking changes to existing consumers: ... (or "none")

If breaking, link the deprecation plan.

## Authentication and authorization

- Auth required: yes/no
- Roles permitted: ...
- Per-resource authorization rule: `<DOMAIN>-AUTH-NNN`
- Multi-tenant filtering: how tenant scope is enforced

## Error handling

For each error case the user might see:

- `<error code>`: when it fires, what the response looks like, what the
  legacy equivalent was

Error semantics MUST match legacy (or be an intentional documented drift).

## Observability

- CloudWatch metrics emitted:
  - `<metric name>` — when, dimensions
- Log levels and structured fields
- X-Ray subsegments for downstream calls

## Feature flag

- Flag name: `<endpoint-slug>.modern-impl`
- Default: `false` until cutover starts
- Rollout: 1% → 10% → 50% → 100%, gated by metrics
- Reverse routing: `<config key>` re-routes 100% back to legacy in <1 min

## Differential harness

- Endpoint registered in: `shadow/masks/<endpoint-slug>.yaml`
- Adapters: `shadow/adapters/<endpoint-slug>.{legacy,modern}.jq`
- Sample-size target before promotion: at least 7 days OR 100k requests,
  whichever produces more comparison diversity

## Rollback

What "rollback" looks like at each phase:

- Pre-cutover (flag off): no-op; modern code dormant
- 1-50% rollout: flip flag back to 0; investigate offline
- 100% but within 30 days: flip flag back to 0; legacy still warm
- > 30 days post-cutover: more involved; document escalation here

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tax/money rounding drift | M | M | Shadow harness flags any cents-level diff |
| Cold-start/warm-up latency on bursty traffic | L | M | Pre-warming, provisioned capacity, or equivalent |
| Hot-partition or hotspot on the data store | L | H | Access pattern review; load test |

## Open questions

List anything unresolved. Spec is not "done" with open questions — close
them before tasks.md is started.

- [ ] Q: ...
- [ ] Q: ...
