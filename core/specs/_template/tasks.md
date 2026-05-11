# Tasks: <endpoint-or-feature> Cutover

> Spec template. Each task should be small enough to land in one PR.
> Check items off only when truly done. Use the `cutover-checklist`
> steering file (`#cutover-checklist`) for the gate sequence.

## Phase 1: Catalog readiness

- [ ] All rules affecting this endpoint exist in `rules/<domain>.yaml`
- [ ] `rules lint` passes
- [ ] No `status: extracted` rules remain — all reviewed and promoted to
      `implemented_unverified`, `gap`, `drift`, or `net_new`
- [ ] No `confidence: low` rules without explicit human acknowledgement
- [ ] Domain SME has signed off on the catalog state

## Phase 2: Modern implementation

- [ ] Domain logic in the domain tree (not in deployment/API entry units)
- [ ] Money and other exact-arithmetic paths use the project's exact
      arithmetic library exclusively (per `tech.md`)
- [ ] API schema additions / changes documented
- [ ] Deployment entry unit is thin (no domain logic)
- [ ] Unit tests for each rule ID covered
- [ ] All affected rules pass `rules verify`
- [ ] Property tests generated for calculation and authorization rules
      (via `generate-property-tests` skill)
- [ ] Data-access patterns documented in the project's access-pattern
      registry
- [ ] No new cross-aggregate transactions introduced

## Phase 3: Differential harness

- [ ] Adapter for legacy response shape at `shadow/adapters/<slug>.legacy.jq`
- [ ] Adapter for modern response shape at `shadow/adapters/<slug>.modern.jq`
- [ ] Mask config at `shadow/masks/<slug>.yaml` (generated via
      `propose-mask-rules` skill, then manually reviewed)
- [ ] No mask rules on money, auth, state, or error fields
- [ ] Harness reports clean for at least 24 hours after deployment

## Phase 4: Pre-cutover gates

- [ ] `rules status --domain <domain>` shows ≥95% verified
- [ ] `rules diff --domain <domain>` shows zero gaps
- [ ] Shadow harness: 7 days clean (zero error-level clusters)
- [ ] Shadow harness: warn-level clusters all triaged
      (either fixed or marked intentional with reasoning)
- [ ] Feature flag exists and is tested in both directions
- [ ] On-call runbook updated
- [ ] Rollback path documented and tested in staging
- [ ] CDC pipeline current; replication lag below threshold

## Phase 5: Cutover execution

- [ ] Announce in #modernization with endpoint, expected signal, on-call
- [ ] Flag to 1%, monitor 30 minutes — go/no-go decision documented
- [ ] Flag to 10%, monitor 2 hours — go/no-go documented
- [ ] Flag to 50%, monitor 24 hours — go/no-go documented
- [ ] Flag to 100%, shadow harness remains on
- [ ] `docs/cutover-status.md` updated

## Phase 6: Post-cutover (T+1 to T+30 days)

- [ ] Shadow harness still running for the endpoint
- [ ] Daily metric review for first week (error rate, p99, business KPI)
- [ ] Weekly metric review for weeks 2-4
- [ ] Long-tail diffs reviewed weekly
- [ ] No emergency rollbacks during the window

## Phase 7: Legacy deprecation (T+60 days)

- [ ] Legacy endpoint marked deprecated in source
- [ ] Telemetry confirms zero legacy traffic for the endpoint
- [ ] PR to remove legacy code opened
- [ ] Legacy code removal merged at T+90 days

## Acceptance

This cutover is complete when:

- All tasks above are checked
- A retrospective entry is added to `docs/retros/<endpoint-slug>.md`
- The endpoint is removed from `docs/cutover-status.md`'s "in progress"
  section and added to "completed"

## Notes

Use this space for cutover-specific observations, surprises, or things
to feed into future spec templates.
