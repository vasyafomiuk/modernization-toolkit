# Shadow Harness Configuration

The differential shadow harness compares responses between legacy and
modern systems, classifies diffs, and produces the signal that drives
cutover decisions.

This directory holds the harness's configuration. The runtime itself
lives in your infrastructure (a Lambda, an EKS service, a sidecar — the
toolkit doesn't prescribe).

## Layout

```
shadow/
├── masks/
│   ├── _example.yaml             Template / reference
│   └── <endpoint-slug>.yaml      Per-endpoint mask config
├── adapters/
│   ├── <endpoint-slug>.legacy.jq Projects legacy response → canonical
│   └── <endpoint-slug>.modern.jq Projects modern response → canonical
├── samples/                       Captured diff samples for review
│   └── <endpoint-slug>-<date>.jsonl
└── README.md
```

## How it works

```
production request ──► router ──┬──► LEGACY  ──► response_L
                                └──► MODERN  ──► response_M
                                              │
                                              ▼
                                       adapter projects
                                       both to canonical
                                              │
                                              ▼
                                       apply masks (per field)
                                              │
                                              ▼
                                       diff what remains
                                              │
                                              ▼
                                       cluster by shape
                                              │
                                              ▼
                                       severity routing
                                              │
                                              ├──► error → page on-call
                                              ├──► warn  → review queue
                                              └──► info  → trend analysis
```

## Mask rule reference

| Rule              | What it does                                              |
|-------------------|-----------------------------------------------------------|
| `exact`           | Bit-for-bit equality after canonicalization               |
| `mask`            | Replace with placeholder before compare (timestamps, IDs) |
| `tolerance_numeric` | Within `epsilon` (NEVER use on money)                   |
| `tolerance_time`  | Within a time `window`                                    |
| `sort_by`         | Reorder array by key(s) before compare                    |
| `set_overlap`     | Jaccard similarity for unordered collections              |
| `ignore`          | Drop the field entirely                                   |
| `normalize`       | Normalize null vs missing, empty vs absent                |
| `regex_match`     | Both values match the same regex pattern                  |
| `custom`          | Calls a function in `shadow/custom/`                      |

## Adapters

Adapters are `jq` expressions (or small TS functions) that translate
legacy and modern responses to a single canonical shape. Example:

```jq
# adapters/orders-quote.legacy.jq
{
  quote_id: .QuoteId,
  created_at: .CreatedUtc,
  line_items: [.Items[] | {
    sku: .Sku,
    quantity: .Qty,
    unit_price: .UnitPrice,
    extended_price: (.UnitPrice * .Qty)
  }],
  totals: {
    subtotal: .Totals.Subtotal,
    tax: .Totals.Tax,
    discount: .Totals.Discount,
    total: .Totals.Total
  }
}
```

The modern adapter projects the GraphQL response to the same canonical
shape. Both projections live in version control alongside the mask
config; changes to API shape MUST update the adapter.

## Severity discipline

- **error** — blocks cutover, pages on-call. Reserved for money, auth,
  state, and user-visible errors.
- **warn** — review queue. Anything measurable and unexplained.
- **info** — sampled for trends, not actively reviewed.

If you find yourself wanting to downgrade an error to warn to "make the
dashboard green," stop. Either the diff is real and needs a fix, or the
mask config is too strict and is reporting cosmetic noise as behavioral.

## Adding a new endpoint to the harness

1. Use your diff-classification workflow on a sample of 20-50 diffs from the
   endpoint (you'll need at least one day of traffic capture).
2. Review the generated mask file. Verify it does NOT mask money,
   auth, or state fields.
3. Write the legacy and modern adapters in `shadow/adapters/`.
4. Commit. The harness picks up new endpoints on the next deploy.
5. Watch for 7 days. Error clusters block; warn clusters get triaged.

## Don'ts

- **Don't mask money under any circumstances.** Money is exact.
- **Don't mask error responses.** Error semantics differing is itself
  important behavioral signal.
- **Don't mask state fields.** Status, lifecycle stage, and similar.
- **Don't introduce tolerance bands "until we fix the rounding."**
  Either fix the rounding or document drift via an ADR. Tolerance is
  permanent in practice.
