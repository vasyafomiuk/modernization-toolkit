---
name: classify-shadow-diff
description: Take diff clusters from the differential shadow harness and categorize them by root cause, link to rule IDs, and propose severity. Use when the user asks to "triage diffs", "classify shadow output", "explain why these differ", "what's causing this drift", or shares diff samples from the harness. Activates on phrases like "classify diffs", "triage shadow", "what's wrong with these responses", "explain this drift".
---

# Classify Shadow Diff

Take a cluster of similar diffs from the differential harness, identify
the likely root cause, link to candidate rules in the catalog, and
propose a severity level for routing.

## When to use

- After a shadow harness run produces a cluster of similar diffs
- When the user pastes diff samples and asks "what's causing this"
- During cutover review when one endpoint has unexplained drift
- For weekly triage of accumulated warn-level diffs

## When NOT to use

- For a single one-off diff with no pattern. Investigate manually.
- When the diff is masked/canonical-shape problem, not a real
  behavioral difference. Use `propose-mask-rules` instead.

## Process

1. Read the diff cluster — typically a sample of 5-20 diffs from the
   same endpoint with the same shape of mismatch (same path, same kind
   of value difference).

2. Identify the pattern:
   - Always the same delta (e.g. `+0.01` everywhere) → rounding/precision
   - Different on certain inputs (e.g. only `tier=GOLD`) → conditional gap
   - Random subset → ordering, non-determinism not masked
   - All requests fail to match → adapter bug, not behavior
   - Sporadic, no clear input pattern → upstream nondeterminism

3. Cross-reference the affected response field against `rules/<domain>.yaml`.
   Which rules touch this field? List candidate rule IDs.

4. Propose root cause and severity:
   - **error** — money, auth, state mismatches; user-affecting; block cutover
   - **warn** — measurable but not user-affecting; review and fix
   - **info** — likely intentional or cosmetic; suggest mask rule

5. Output a classification report and, when applicable, a suggested
   action (add mask, file bug, update rule, escalate).

## Output format

```yaml
cluster:
  endpoint: POST /api/v2/orders/quote
  sample_count: 47
  field_path: $.totals.tax
  observed_delta:
    pattern: "modern is exactly 0.01 higher than legacy in 100% of cases"
  affected_inputs: any quote where subtotal has fractional cents
  
classification:
  root_cause: "Rounding mode mismatch — legacy uses banker's rounding (decimal.MidpointRounding.ToEven), modern uses half-up (Decimal.ROUND_HALF_UP)"
  candidate_rules:
    - id: ORD-CALC-018
      reasoning: "Tax calculation rule for this endpoint"
    - id: ORD-CALC-007
      reasoning: "Discount calc may compound the rounding error"
  severity: error
  
recommendation:
  action: "Fix modern rounding configuration in the pricing/rounding module"
  also_consider:
    - "Audit all money calculations for rounding-mode consistency"
    - "Add unit test asserting banker's rounding for ORD-CALC-018"
  do_not:
    - "Mask the cents difference. This is real money divergence."
```

## Anti-patterns

- **Recommending a mask for a real behavioral difference.** Masks hide
  cosmetic noise, not money bugs. If you find yourself masking money
  fields, stop and escalate.
- **Linking to every rule that touches the field.** Pick the 1-2 most
  likely. Long lists of candidate rules are useless for triage.
- **Calling things "intermittent" when they're deterministic on a
  hidden variable.** "Sometimes fails" usually means "fails on a
  condition I haven't isolated yet." Keep looking.
