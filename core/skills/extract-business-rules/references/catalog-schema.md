# Catalog Schema

The canonical YAML schema for `rules/<domain>.yaml`. JSON Schema version
at `rules/_schema.json`.

## Top-level structure

A catalog file contains an array of rules:

```yaml
- id: ORD-CALC-007
  type: calculation
  domain: orders
  description: Gold-tier customers get 15% off orders >= $100, capped at $50
  trigger: order.total_computed
  preconditions:
    - customer.tier == "GOLD"
    - order.subtotal >= 100
  logic: |
    discount = min(order.subtotal * 0.15, 50)
  effect: order.discount_applied = discount
  sources:
    legacy:
      - path: legacy/src/Orders/OrderService.cs
        symbol: OrderService.ApplyDiscounts
        lines: [142, 167]
      - path: legacy/db/PKG_ORDER_RULES.pkb
        symbol: calc_gold_discount
        lines: [89, 103]
    modern:
      - path: modern/src/domain/orders/pricing/discount.ts
        symbol: applyTierDiscount
        lines: [23, 41]
  examples:
    - input:  { tier: "GOLD", subtotal: 200.00 }
      expect: { discount: 30.00 }
      kind: positive
    - input:  { tier: "GOLD", subtotal: 1000.00 }
      expect: { discount: 50.00 }
      kind: edge        # cap kicks in
    - input:  { tier: "SILVER", subtotal: 200.00 }
      expect: { discount: 0.00 }
      kind: negative
  status: implemented_verified
  confidence: high
  notes: ""
  reviewed_by: jane@example.com
  reviewed_at: 2026-05-01
  aliases: []
```

## Field reference

### Required fields

| Field         | Type     | Notes                                              |
|---------------|----------|----------------------------------------------------|
| `id`          | string   | `<DOMAIN>-<KIND>-<NUM>`. Stable, immutable.         |
| `type`        | enum     | validation, calculation, authorization, state_transition, side_effect |
| `domain`      | string   | Matches the filename (e.g. `orders`)                |
| `description` | string   | One-sentence human summary                          |
| `logic`       | string   | Pseudocode — NOT source-language                    |
| `examples`    | array    | At least 2: one positive, one negative or edge      |
| `sources`     | object   | At least one of `legacy` or `modern`                |
| `status`      | enum     | See status values below                             |
| `confidence`  | enum     | high, medium, low                                   |

### Optional fields

| Field             | Type    | Notes                                          |
|-------------------|---------|------------------------------------------------|
| `trigger`         | string  | When the rule fires (e.g. `order.total_computed`) |
| `preconditions`   | array   | Conditions that must hold for rule to apply    |
| `effect`          | string  | Postcondition or output                        |
| `notes`           | string  | Human commentary, especially for low-confidence |
| `reviewed_by`     | string  | Email of human reviewer                        |
| `reviewed_at`     | date    | ISO date                                       |
| `aliases`         | array   | Previous IDs if this rule split or merged      |
| `drift_reason`    | string  | Required when `status: drift`                  |
| `deprecated_reason` | string | Required when `status: deprecated`             |
| `tags`            | array   | Free-form tags for filtering                   |

### `examples[]` structure

```yaml
- input: <object — the inputs to the rule>
  expect: <object — expected outputs or effects>
  kind: positive | negative | edge
  notes: <optional explanation>
```

### `sources[].<system>[]` structure

```yaml
- path: <repo-relative path>
  symbol: <function, method, or procedure name>
  lines: [<start>, <end>]
```

## Status values

| Status                   | Meaning                                                |
|--------------------------|--------------------------------------------------------|
| `extracted`              | AI extraction, not yet reviewed                        |
| `implemented_unverified` | In modern code but examples not yet passing            |
| `implemented_verified`   | Examples pass; shadow harness has seen real traffic    |
| `gap`                    | In legacy, no modern implementation yet                |
| `drift`                  | Legacy and modern differ; intentional, with reason     |
| `net_new`                | Modern-only behavior, no legacy counterpart            |
| `deprecated`             | Obsolete, kept for history                             |

## Type-specific guidance

### `validation` rules

```yaml
logic: |
  if not (order.shipping_address.country in allowed_countries):
    raise InvalidShippingDestination
```

`examples` should include: valid input → no raise; invalid input → raise.

### `calculation` rules

`logic` should be a deterministic expression. Money calculations MUST
specify rounding mode in `notes` if non-default.

### `authorization` rules

```yaml
logic: |
  allow = (user.role == "admin") or
          (user.id == resource.owner_id)
```

`examples` should include: allowed case, denied case, and edge case (e.g.
user is admin AND owner).

### `state_transition` rules

```yaml
logic: |
  if order.status == "DRAFT" and all_items_in_stock:
    order.status -> "SUBMITTED"
```

`examples` should specify pre-state in `input` and post-state in `expect`.

### `side_effect` rules

```yaml
logic: |
  on order.status -> "SHIPPED":
    send_email(customer, template="shipment_confirmation")
```

`examples` should describe the effect symbolically (email sent, audit
record written) rather than asserting on the I/O directly.
