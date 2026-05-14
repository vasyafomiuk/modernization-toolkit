import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { apiAddProject, apiAddRule, apiGetCatalog, ApiError } from "./api.js";
import { openDb } from "./db.js";

const tempDirs: string[] = [];

async function makeProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rules-dashboard-"));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, "rules"));
  return dir;
}

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "ORD-VAL-901",
    type: "validation",
    status: "extracted",
    confidence: "medium",
    description: "Rejects orders without a valid shipping country",
    logic: "require order.ship_country",
    legacy_sources: [
      {
        path: "legacy/db/PKG_ORDER_VALIDATION.pkb",
        symbol: "validate_ship_country",
        lines: [12, 24],
      },
    ],
    examples: [
      { input: { ship_country: "US" }, expect: { raises: null }, kind: "positive" },
      { input: {}, expect: { raises: "MissingShipCountry" }, kind: "negative" },
    ],
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("dashboard API", () => {
  it("adds a structured rule to the domain catalog", async () => {
    const db = openDb(":memory:");
    const projectDir = await makeProjectDir();
    const { project } = apiAddProject(db, { name: "demo", path: projectDir });

    const result = await apiAddRule(db, project.id, {
      domain: "orders",
      rule: validRule(),
    });

    expect(result.file).toBe("orders.yaml");
    const catalog = await apiGetCatalog(db, project.id);
    expect(catalog.catalogs).toHaveLength(1);
    const orders = catalog.catalogs[0];
    const rule = orders?.rules[0];
    expect(rule?.id).toBe("ORD-VAL-901");
    expect(rule?.sources.legacy?.[0]?.symbol).toBe("validate_ship_country");
    db.close();
  });

  it("rejects duplicate rule ids across catalogs", async () => {
    const db = openDb(":memory:");
    const projectDir = await makeProjectDir();
    const { project } = apiAddProject(db, { name: "demo", path: projectDir });

    await apiAddRule(db, project.id, { domain: "orders", rule: validRule() });

    await expect(
      apiAddRule(db, project.id, {
        domain: "billing",
        rule: validRule({ domain: "billing" }),
      }),
    ).rejects.toThrow(ApiError);
    db.close();
  });
});
