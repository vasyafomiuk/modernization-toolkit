import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAllCatalogs, statusRollup } from "./catalog.js";

describe("catalog utilities", () => {
  it("loads non-example YAML catalogs and rolls status up by domain", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rules-catalog-"));
    await fs.writeFile(
      path.join(dir, "orders.yaml"),
      `
- id: ORD-CALC-001
  type: calculation
  domain: orders
  description: Calculates a representative order discount
  logic: discount = 10
  sources:
    legacy:
      - path: legacy/orders.cs
        symbol: Orders.Discount
        lines: [1, 2]
  examples:
    - input: { subtotal: 100 }
      expect: { discount: 10 }
      kind: positive
    - input: { subtotal: 0 }
      expect: { discount: 0 }
      kind: edge
  status: implemented_verified
  confidence: high
- id: ORD-VAL-002
  type: validation
  domain: orders
  description: Rejects orders without a shipping country
  logic: require ship_country
  sources:
    legacy:
      - path: legacy/orders.cs
        symbol: Orders.Validate
        lines: [3, 4]
  examples:
    - input: { ship_country: US }
      expect: { raises: null }
      kind: positive
    - input: {}
      expect: { raises: MissingCountry }
      kind: negative
  status: gap
  confidence: medium
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, "_example.yaml"),
      `
- id: ORD-CALC-999
  type: calculation
  domain: orders
  description: Ignored example rule
  logic: ignored
  sources:
    legacy:
      - path: legacy/example.cs
        symbol: Example
        lines: [1, 1]
  examples:
    - input: {}
      expect: {}
      kind: positive
    - input: { edge: true }
      expect: {}
      kind: edge
  status: extracted
  confidence: low
  notes: ignored
`,
      "utf8",
    );

    const catalogs = await loadAllCatalogs(dir);

    expect(catalogs).toHaveLength(1);
    expect(catalogs[0].domain).toBe("orders");
    expect(statusRollup(catalogs)).toEqual({
      orders: {
        implemented_verified: 1,
        gap: 1,
      },
    });
  });
});
