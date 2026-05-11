# Golden Examples

Reference cases for what good and bad extraction look like. Read these
when calibrating extraction quality.

---

## DO extract — calculation with clear examples

### Source (C#)

```csharp
public decimal ApplyDiscount(Order order, Customer customer)
{
    if (customer.Tier != "GOLD" || order.Subtotal < 100m)
        return 0m;
    
    var raw = order.Subtotal * 0.15m;
    return Math.Min(raw, 50m);
}
```

### Extracted rule

```yaml
- id: ORD-CALC-007
  type: calculation
  domain: orders
  description: Gold-tier customers get 15% off orders >= $100, capped at $50
  preconditions:
    - customer.tier == "GOLD"
    - order.subtotal >= 100
  logic: |
    discount = min(order.subtotal * 0.15, 50)
  effect: order.discount_applied = discount
  sources:
    legacy:
      - path: legacy/src/Orders/OrderService.cs
        symbol: OrderService.ApplyDiscount
        lines: [42, 50]
  examples:
    - input:  { tier: "GOLD", subtotal: 200.00 }
      expect: { discount: 30.00 }
      kind: positive
    - input:  { tier: "GOLD", subtotal: 1000.00 }
      expect: { discount: 50.00 }
      kind: edge
    - input:  { tier: "SILVER", subtotal: 200.00 }
      expect: { discount: 0.00 }
      kind: negative
  status: extracted
  confidence: high
  notes: ""
```

**Why this is good**: visible logic, three examples covering positive,
boundary (cap), and negative. Pseudocode in `logic:`, not C#.

---

## DO NOT extract — infrastructure

### Source (C#)

```csharp
public class OrderController : ControllerBase
{
    private readonly IOrderService _service;
    private readonly ILogger<OrderController> _logger;
    
    public OrderController(IOrderService service, ILogger<OrderController> logger)
    {
        _service = service;
        _logger = logger;
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        _logger.LogInformation("Fetching order {Id}", id);
        var order = await _service.GetByIdAsync(id);
        return order != null ? Ok(order) : NotFound();
    }
}
```

### Extracted rules

```yaml
[]
```

**Why this is correct**: this is HTTP routing, DI, logging, and an empty
boundary null-check. No domain decision is encoded here. Empty extraction
is the right answer.

---

## DO extract — validation with edge cases

### Source (PL/SQL)

```sql
PROCEDURE validate_shipment(p_order_id IN NUMBER) IS
  v_country  VARCHAR2(2);
  v_embargo  NUMBER;
BEGIN
  SELECT ship_country INTO v_country FROM orders WHERE id = p_order_id;
  SELECT COUNT(*) INTO v_embargo
    FROM embargoed_countries WHERE iso2 = v_country;
  
  IF v_embargo > 0 THEN
    RAISE_APPLICATION_ERROR(-20010, 'Shipment to embargoed country: ' || v_country);
  END IF;
END;
```

### Extracted rule

```yaml
- id: ORD-VAL-103
  type: validation
  domain: orders
  description: Orders shipping to embargoed countries are rejected
  preconditions:
    - order has a ship_country
  logic: |
    if order.ship_country in embargoed_countries:
      raise EmbargoedDestination(country=order.ship_country)
  sources:
    legacy:
      - path: legacy/db/PKG_ORDER_VALIDATION.pkb
        symbol: validate_shipment
        lines: [12, 28]
  examples:
    - input:  { ship_country: "US" }
      expect: { raises: null }
      kind: positive
    - input:  { ship_country: "XX" }   # in embargoed list
      expect: { raises: "EmbargoedDestination" }
      kind: negative
  status: extracted
  confidence: medium
  notes: |
    Embargoed list comes from a separate table — examples assume "XX" is
    in the list. Verify against actual embargoed_countries data when
    constructing test data.
```

**Why medium confidence**: the rule is clear, but the embargoed list is
runtime data we can't see in this snippet.

---

## DO NOT extract — comment-only "rule"

### Source (C#)

```csharp
// Business rule: discounts cannot stack
public decimal CalculateDiscount(Order order)
{
    return ApplyTierDiscount(order);   // just calls one calculator
}
```

### Extracted rules

```yaml
[]
```

**Why this is correct**: the comment claims a rule ("discounts cannot
stack") but the code doesn't enforce it — it just calls one calculator.
If non-stacking is the actual behavior, the rule lives elsewhere
(perhaps in `ApplyTierDiscount`'s structure) and should be extracted
from there with citation, not from a comment.

---

## DO extract — side effect

### Source (TS, modern side)

```typescript
export async function onOrderShipped(order: Order, ctx: Ctx) {
  await ctx.email.send({
    to: order.customer.email,
    template: "shipment_confirmation",
    data: { orderId: order.id, trackingNumber: order.trackingNumber }
  });
  await ctx.audit.record({
    actor: "system",
    action: "ORDER_SHIPPED_NOTIFICATION",
    subject: order.id,
  });
}
```

### Extracted rule

```yaml
- id: ORD-SIDE-014
  type: side_effect
  domain: orders
  description: When an order ships, send shipment-confirmation email and write audit record
  trigger: order.status -> "SHIPPED"
  logic: |
    on order.status -> "SHIPPED":
      send_email(to=order.customer.email, template="shipment_confirmation")
      write_audit(action="ORDER_SHIPPED_NOTIFICATION", subject=order.id)
  sources:
    modern:
      - path: modern/src/domain/orders/events/onShipped.ts
        symbol: onOrderShipped
        lines: [1, 13]
  examples:
    - input:  { order_status_change: { from: "READY", to: "SHIPPED" } }
      expect: { emails_sent: 1, audit_records_written: 1 }
      kind: positive
    - input:  { order_status_change: { from: "READY", to: "CANCELLED" } }
      expect: { emails_sent: 0, audit_records_written: 0 }
      kind: negative
  status: extracted
  confidence: high
  notes: |
    Email sending is synchronous in this handler. If made async via queue,
    examples may need to assert message enqueued rather than email sent.
```

**Why this is good**: the side effect is symbolic ("emails_sent: 1") not
concrete; the negative example confirms the trigger condition matters.
