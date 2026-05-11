// Catalog loading and basic queries.
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import YAML from "yaml";
import type { Catalog, Rule } from "./schema.js";

export interface CatalogFile {
  path: string;
  domain: string;
  rules: Rule[];
}

/**
 * Load all *.yaml files under the rules/ directory, excluding files
 * that start with an underscore (schemas, examples, etc).
 */
export async function loadAllCatalogs(rulesDir: string): Promise<CatalogFile[]> {
  const files = await glob("*.yaml", { cwd: rulesDir });
  const out: CatalogFile[] = [];

  for (const file of files) {
    if (file.startsWith("_")) continue;
    const full = path.join(rulesDir, file);
    const text = await fs.readFile(full, "utf8");
    let rules: Catalog;
    try {
      rules = YAML.parse(text) as Catalog;
    } catch (err) {
      throw new Error(`Failed to parse ${full}: ${(err as Error).message}`);
    }
    if (!Array.isArray(rules)) {
      throw new Error(`${full} must contain a YAML array of rules`);
    }
    const domain = path.basename(file, ".yaml");
    out.push({ path: full, domain, rules });
  }

  return out;
}

/**
 * Load a single catalog file (used by lint with a specific path).
 */
export async function loadCatalogFile(filePath: string): Promise<CatalogFile> {
  const text = await fs.readFile(filePath, "utf8");
  const rules = YAML.parse(text) as Catalog;
  if (!Array.isArray(rules)) {
    throw new Error(`${filePath} must contain a YAML array of rules`);
  }
  const domain = path.basename(filePath, ".yaml").replace(/^_/, "");
  return { path: filePath, domain, rules };
}

/**
 * Build a flat list of (rule, source-file) pairs across all catalogs.
 */
export function flattenCatalogs(catalogs: CatalogFile[]): Array<{ rule: Rule; from: string }> {
  return catalogs.flatMap((c) => c.rules.map((r) => ({ rule: r, from: c.path })));
}

/**
 * Find rules affected by a list of source code paths. Used by
 * `rules verify --changed-since` to scope verification to relevant rules.
 */
export function findRulesForSourcePaths(
  catalogs: CatalogFile[],
  sourcePaths: string[],
): Rule[] {
  const set = new Set(sourcePaths.map((p) => path.normalize(p)));
  const result: Rule[] = [];

  for (const c of catalogs) {
    for (const r of c.rules) {
      const sources = [
        ...(r.sources.legacy ?? []),
        ...(r.sources.modern ?? []),
      ];
      const hit = sources.some((s) => set.has(path.normalize(s.path)));
      if (hit) result.push(r);
    }
  }

  return result;
}

/**
 * Group rules by domain and status for the `status` command.
 */
export function statusRollup(
  catalogs: CatalogFile[],
): Record<string, Record<string, number>> {
  const rollup: Record<string, Record<string, number>> = {};
  for (const c of catalogs) {
    rollup[c.domain] = {};
    for (const r of c.rules) {
      rollup[c.domain][r.status] = (rollup[c.domain][r.status] ?? 0) + 1;
    }
  }
  return rollup;
}
