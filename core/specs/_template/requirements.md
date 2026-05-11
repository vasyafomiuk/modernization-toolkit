# Requirements: <endpoint-or-feature> Cutover

> Spec template. Replace placeholders, keep section headers. The
> `tasks.md` checkboxes derive from these requirements.

## Summary

One paragraph: what endpoint or feature is being cut over, why now, what
domains it touches.

## Scope

### In scope

- [Endpoint]: `POST /api/v2/<path>`  (legacy) → `mutation <name>` (modern)
- Domain(s) affected: `<domain1>`, `<domain2>`
- Aggregates touched: `<aggregate1>`, `<aggregate2>`

### Out of scope

- Anything explicitly NOT in this cutover. Spell it out — the absence of
  things in the "in scope" list is not enough.

## Behavioral parity requirements

The modern implementation MUST match the legacy implementation for all
of the following, verified by the rule catalog and shadow harness:

- [ ] Rule `<DOMAIN>-<KIND>-NNN`: brief description
- [ ] Rule `<DOMAIN>-<KIND>-NNN`: brief description
- [ ] Rule `<DOMAIN>-<KIND>-NNN`: brief description

Acceptable deviations (drift) — each requires an ADR and `drift_reason`
in the catalog:

- [ ] `<DOMAIN>-<KIND>-NNN`: deviation type (e.g., rounding mode), ADR link

## Out-of-scope behavioral changes

If this cutover introduces any new behavior (`status: net_new` rules),
list them here. These do NOT need legacy parity but DO need:

- [ ] Rule entry with `status: net_new` in `rules/<domain>.yaml`
- [ ] Communication plan if the change is customer-visible
- [ ] Feature flag if rollback is wanted

## Non-functional requirements

- [ ] p99 latency at 50% traffic must be within 1.2× of legacy p99
- [ ] Error rate at 50% traffic must be no higher than legacy
- [ ] Cold-start / warm-up budget: < project-defined threshold
- [ ] Data store consumed capacity: estimate via load test, document in
      the access-pattern registry

## Data requirements

- [ ] CDC pipeline current for affected tables/items
- [ ] No new access patterns without registry entry
- [ ] Rollback data path defined (reverse CDC or dual-write reversal)

## Verification requirements

- [ ] All in-scope rules have `status: implemented_verified` before
      shadow-traffic gate
- [ ] Shadow harness for endpoint: 7 days, zero error-level diff clusters
- [ ] Property tests generated for calculation and authorization rules
- [ ] Manual smoke test in staging across the personas in
      `docs/personas.md`

## Rollback criteria

Define the SPECIFIC signals that trigger rollback. Vague criteria
("if things look bad") fail in real incidents.

- p99 latency >2× legacy sustained 10 minutes → rollback
- Error rate >2× sustained 10 minutes → rollback
- Any data-corruption signal → rollback immediately
- Specific business KPI deviation: `<metric>` outside `<range>` → rollback

## Stakeholders

- Owning team: `<team>`
- On-call rotation: `<rotation-name>`
- Reviewers required for sign-off:
  - [ ] Domain SME: `<name>`
  - [ ] Platform: `<name>`
  - [ ] Security (if auth-affecting): `<name>`

## Links

- Legacy endpoint metrics: `<dashboard URL>`
- Modern endpoint metrics: `<dashboard URL>`
- Shadow harness output for this endpoint: `<URL>`
- Related ADRs: `<ADR-XXXX>`, `<ADR-YYYY>`
