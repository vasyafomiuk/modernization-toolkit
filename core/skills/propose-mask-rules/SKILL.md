---
name: propose-mask-rules
description: Generate mask configuration for the shadow harness from sample diffs, suppressing cosmetic differences (timestamps, IDs, ordering) while preserving behavioral signal. Use when the user asks to "propose masks", "generate masking rules", "configure shadow", "what should we ignore in these diffs", or shares sample diffs that look mostly cosmetic. Activates on phrases like "mask rules", "ignore these diffs", "configure shadow harness".
---

# Propose Mask Rules

Generate a `shadow/masks/<endpoint>.yaml` configuration from a sample of
shadow-harness diffs, suppressing cosmetic differences while keeping
behavioral signal intact.

## When to use

- Initial setup for a new endpoint in the shadow harness
- After a major API change that produces a wave of new cosmetic diffs
- When the harness is too noisy and engineers stop checking it

## When NOT to use

- When a diff is a real behavioral difference. NEVER mask money fields,
  authorization fields, state fields, or user-visible content.
- When you can't see why two outputs differ — investigate first, mask
  second.

## Process

1. Load a representative sample of 20-50 diffs from the endpoint.

2. Identify each diff's category:
   - **Always-different by nature**: timestamps, generated IDs, request
     IDs, pagination cursors → `mask`
   - **Different ordering but same set**: unordered collections, parallel
     execution → `sort_by`
   - **Within tolerance**: numeric noise (NOT money), close timestamps →
     `tolerance_*`
   - **Field exists in one system only**: legacy-only debug, new metadata
     → `ignore`
   - **Same value, different encoding**: null vs missing, "" vs absent →
     `normalize`
   - **Real behavioral difference**: DO NOT mask. Flag for fix.

3. Generate the mask file with grouped rules and severity overrides.

4. Annotate each rule with a comment explaining WHY it's masked. Future
   reviewers need to understand whether a mask is still appropriate.

## Output format

```yaml
endpoint:
  legacy: POST /api/v2/orders/quote
  modern: mutation { quoteOrder }

canonical_shape:
  legacy_projection: ./adapters/orders-quote.legacy.jq
  modern_projection: ./adapters/orders-quote.modern.jq

fields:
  # Generated IDs differ by definition
  - path: $.quote_id
    rule: mask
    as: "<uuid>"
    reason: "Server-generated UUID; never expected to match"

  # Timestamps will differ by milliseconds between system calls
  - path: $.created_at
    rule: tolerance_time
    window: 2s
    reason: "Both systems generate independently; ~ms drift expected"

  # Line items may be returned in any order
  - path: $.line_items[*]
    rule: sort_by
    by: [sku, variant_id]
    reason: "Order not meaningful; legacy returns insert-order, modern returns by SKU"

  # CRITICAL: money is exact, no tolerance
  - path: $.totals.tax
    rule: exact
    reason: "Money field — any difference is a real bug"
  - path: $.totals.subtotal
    rule: exact
  - path: $.totals.total
    rule: exact
  - path: $.line_items[*].unit_price
    rule: exact

  # Legacy returns a debug block; modern doesn't
  - path: $.debug
    rule: ignore
    reason: "Legacy-only diagnostic block; not part of contract"

severity:
  default: warn
  overrides:
    - path: $.totals.*
      level: error
      reason: "Money mismatches always escalate"
    - path: $.errors[*]
      level: error
      reason: "Error semantics must match exactly"
```

## Safety rules

NEVER propose masks for:
- Money fields (totals, prices, taxes, fees, refunds, balances)
- Authorization fields (roles, permissions, tokens)
- State fields (status, lifecycle)
- Error codes or error messages user sees
- Customer-visible identifiers (order numbers, confirmation codes)

These should be `exact` or escalated as `error` severity.

## Anti-patterns

- **Masking by default to silence noise.** Quiet harness with hidden
  bugs is worse than noisy harness. Err toward keeping signal.
- **Tolerance bands on money.** Even 0.001 tolerance hides real bugs.
  Money is exact, full stop.
- **Generic field-pattern masks** like `$.*_id`. Mask each ID
  explicitly so the next reviewer can verify.
- **Masking errors.** If error responses differ, that's a behavioral
  difference worth knowing about.
