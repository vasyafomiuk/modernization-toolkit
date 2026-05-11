// `rules lint` — validate catalog files against the JSON Schema plus
// additional cross-file checks (ID uniqueness, source path existence).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import kleur from "kleur";
import { loadAllCatalogs, loadCatalogFile, flattenCatalogs } from "../catalog.js";
import type { Rule } from "../schema.js";

interface LintIssue {
  file: string;
  ruleId?: string;
  severity: "error" | "warn";
  message: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSchema(): Promise<object> {
  // Schema lookup order:
  //   1. $RULES_SCHEMA env var (explicit override)
  //   2. <cwd>/rules/.schema/catalog.schema.json  (what `rules init` creates)
  //   3. <cwd>/rules/_schema.json                  (legacy / historical layout)
  //   4. <toolkit-root>/core/schema/catalog.schema.json
  //      — bundled fallback, lets a globally-installed CLI lint any project.
  const candidates = [
    process.env.RULES_SCHEMA,
    path.resolve(process.cwd(), "rules/.schema/catalog.schema.json"),
    path.resolve(process.cwd(), "rules/_schema.json"),
    path.resolve(__dirname, "../../../schema/catalog.schema.json"),
  ].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    try {
      const text = await fs.readFile(c, "utf8");
      return JSON.parse(text);
    } catch {
      // try next
    }
  }
  throw new Error(
    "Could not locate catalog schema. Looked in: " +
      candidates.join(", ") +
      ". Set RULES_SCHEMA to an explicit path to override.",
  );
}

export interface LintOptions {
  /** Path to a file or directory. If omitted, defaults to ./rules/ */
  target?: string;
  /** Skip the source-path-existence check (faster, useful in detached environments) */
  skipPathCheck?: boolean;
}

export async function runLint(options: LintOptions): Promise<number> {
  const issues: LintIssue[] = [];

  // 1. Load schema
  const schema = await loadSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  // 2. Determine targets
  const target = options.target ?? "rules";
  let catalogs;
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      catalogs = await loadAllCatalogs(target);
    } else {
      catalogs = [await loadCatalogFile(target)];
    }
  } catch (err) {
    console.error(kleur.red(`Cannot access ${target}: ${(err as Error).message}`));
    return 1;
  }

  if (catalogs.length === 0) {
    console.log(kleur.yellow("No catalog files found."));
    return 0;
  }

  // 3. Schema validation per file
  for (const c of catalogs) {
    const ok = validate(c.rules);
    if (!ok && validate.errors) {
      for (const e of validate.errors) {
        issues.push({
          file: c.path,
          severity: "error",
          message: `${e.instancePath || "/"} ${e.message ?? ""}`,
        });
      }
    }
  }

  // 4. Cross-file ID uniqueness
  const flat = flattenCatalogs(catalogs);
  const seen = new Map<string, string>();
  for (const { rule, from } of flat) {
    if (seen.has(rule.id)) {
      issues.push({
        file: from,
        ruleId: rule.id,
        severity: "error",
        message: `Duplicate rule ID. Also defined in ${seen.get(rule.id)}.`,
      });
    } else {
      seen.set(rule.id, from);
    }
  }

  // 5. Domain consistency: rule.domain must match filename
  for (const c of catalogs) {
    for (const r of c.rules) {
      if (r.domain !== c.domain) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "error",
          message: `rule.domain "${r.domain}" does not match filename domain "${c.domain}"`,
        });
      }
    }
  }

  // 6. Source path existence (optional)
  if (!options.skipPathCheck) {
    for (const c of catalogs) {
      for (const r of c.rules) {
        await checkSourcePaths(r, c.path, issues);
      }
    }
  }

  // 7. Conditional requirements that JSON Schema if/then can miss in some validators
  for (const c of catalogs) {
    for (const r of c.rules) {
      if (r.confidence === "low" && !r.notes?.trim()) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "warn",
          message: "confidence: low requires non-empty notes explaining why",
        });
      }
      if (r.status === "drift" && !r.drift_reason?.trim()) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "error",
          message: "status: drift requires non-empty drift_reason",
        });
      }
      if (r.status === "deprecated" && !r.deprecated_reason?.trim()) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "error",
          message: "status: deprecated requires non-empty deprecated_reason",
        });
      }
      if (r.examples.length < 2) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "error",
          message: `Rule has ${r.examples.length} example(s); minimum is 2 (one positive, one negative or edge)`,
        });
      }
      // Look for source-language syntax in logic
      if (/^\s*public\s+/m.test(r.logic) || /\bdef\s+\w+\s*\(/.test(r.logic) || /BEGIN[\s\S]*END;/i.test(r.logic)) {
        issues.push({
          file: c.path,
          ruleId: r.id,
          severity: "warn",
          message: "logic: field appears to contain source-language syntax; use pseudocode for cross-system comparison",
        });
      }
    }
  }

  // 8. Print results
  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");

  for (const i of issues) {
    const color = i.severity === "error" ? kleur.red : kleur.yellow;
    const tag = color(`[${i.severity}]`);
    const rule = i.ruleId ? kleur.cyan(` ${i.ruleId}`) : "";
    console.log(`${tag} ${i.file}${rule}: ${i.message}`);
  }

  const ruleCount = flat.length;
  console.log("");
  console.log(
    `${ruleCount} rule(s) across ${catalogs.length} file(s). ` +
      `${kleur.red(`${errors.length} error(s)`)}, ${kleur.yellow(`${warns.length} warning(s)`)}.`,
  );

  return errors.length > 0 ? 1 : 0;
}

async function checkSourcePaths(rule: Rule, fromFile: string, issues: LintIssue[]): Promise<void> {
  const allSources = [
    ...(rule.sources.legacy ?? []),
    ...(rule.sources.modern ?? []),
  ];
  for (const s of allSources) {
    try {
      await fs.access(s.path);
    } catch {
      issues.push({
        file: fromFile,
        ruleId: rule.id,
        severity: "warn",
        message: `Source path does not exist: ${s.path} (symbol ${s.symbol})`,
      });
    }
  }
}
