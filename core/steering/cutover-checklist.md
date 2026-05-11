---
inclusion: manual
name: cutover-checklist
description: Pre-cutover and post-cutover checklist for an endpoint. Reference with #cutover-checklist in chat.
---
# Cutover Checklist

Use when an endpoint is approaching cutover from shadow → live in the modern
system. Walk through this top-to-bottom. Stop at the first item that fails.

## Pre-cutover gates (all must pass)

### Catalog coverage
- [ ] All rules affecting this endpoint exist in `rules/<domain>.yaml`
- [ ] No rules with `status: extracted` remain — all are either
      `implemented_verified` or explicitly `gap`/`drift` with a documented reason
- [ ] No rules with `confidence: low` without human review
- [ ] `rules status --domain <domain>` shows ≥95% verified

### Verification
- [ ] `rules verify --domain <domain>` passes 100% of examples
- [ ] Property tests generated from the catalog pass in CI
- [ ] Modern implementation unit tests cover all rule IDs

### Shadow harness
- [ ] Endpoint registered in `shadow/masks/<endpoint>.yaml`
- [ ] Adapter exists for both legacy and modern response shapes
- [ ] Mask rules reviewed (no over-masking that hides real diffs)
- [ ] Last 7 days of shadow traffic: ZERO error-level diff clusters
- [ ] Last 7 days of shadow traffic: warn-level diff clusters all triaged
      (either real bugs fixed, or marked intentional with reasoning)

### Feature flag
- [ ] Per-endpoint feature flag exists (not a system-wide flag)
- [ ] Flag tested in both directions (legacy→modern, modern→legacy)
- [ ] Rollback path documented in spec's `design.md`
- [ ] On-call runbook updated for the new endpoint

### Data parity (if applicable)
- [ ] CDC pipeline current — replication lag < threshold for this domain
- [ ] Reverse-CDC tested for rollback scenario
- [ ] No orphan writes detected in last 7 days

## Cutover execution

1. Announce in #modernization channel with endpoint, expected diff signal,
   on-call name.
2. Flip flag to 1%. Watch for 30 minutes.
3. If clean, flip to 10%. Watch for 2 hours.
4. If clean, flip to 50%. Watch for 24 hours.
5. If clean, flip to 100%. Shadow harness remains on for 30 days.
6. Update `docs/cutover-status.md`.

## Post-cutover (next 30 days)

- [ ] Shadow harness still running for the endpoint
- [ ] Daily check of metrics: error rate, p99 latency, business KPI for
      this endpoint vs. last 30 days pre-cutover
- [ ] No emergency rollbacks
- [ ] Long-tail diffs (rare paths) reviewed weekly

## Legacy deprecation (T+60 days)

- [ ] Legacy endpoint marked deprecated in source
- [ ] Telemetry confirms zero legacy traffic for the endpoint
- [ ] PR opened to remove legacy code (still NOT merged — leave for
      another 30 days as final insurance)

## When to abort the cutover

Abort immediately if any of:
- An error-level diff cluster appears post-cutover
- p99 latency increases >2x sustained for >10 minutes
- Business KPI deviation >2 standard deviations
- Any data corruption signal in DynamoDB or downstream consumers

Aborting means: flip the flag back. Investigate. Do NOT power through.
