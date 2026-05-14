// `rules verify` — run rule examples as tests against the modern implementation.
//
// This is intentionally a SCAFFOLD. The full implementation requires:
//   1. A test runner adapter — call out via child_process to the project's
//      configured runner (vitest, jest, pytest, junit, etc.)
//   2. A code-resolution layer to load `sources.modern[0].path` and call
//      `sources.modern[0].symbol` with the rule's examples
//   3. Optional --promote flag to update status on passing rules
//
// The skeleton below shows the structure; replace TODOs with your stack-specific
// implementations. Wire this command to the test runner used by the target
// project.

import kleur from "kleur";
import { loadAllCatalogs, findRulesForSourcePaths, flattenCatalogs } from "../catalog.js";
import type { Rule } from "../schema.js";

export interface VerifyOptions {
  rulesDir?: string;
  domain?: string;
  ruleId?: string;
  changedFiles?: string[];
  changedSince?: string;
  promote?: boolean;
  emit?: "human" | "junit" | "json";
}

interface VerifyResult {
  ruleId: string;
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

export async function runVerify(options: VerifyOptions): Promise<number> {
  const rulesDir = options.rulesDir ?? "rules";
  const catalogs = await loadAllCatalogs(rulesDir);
  const all = flattenCatalogs(catalogs);

  // Select rules to verify
  let toVerify: Rule[];
  if (options.ruleId) {
    toVerify = all.filter((x) => x.rule.id === options.ruleId).map((x) => x.rule);
    if (toVerify.length === 0) {
      console.error(kleur.red(`Rule not found: ${options.ruleId}`));
      return 1;
    }
  } else if (options.changedFiles && options.changedFiles.length > 0) {
    toVerify = findRulesForSourcePaths(catalogs, options.changedFiles);
  } else if (options.domain) {
    toVerify = all
      .filter((x) => x.rule.domain === options.domain)
      .map((x) => x.rule);
  } else {
    toVerify = all.map((x) => x.rule);
  }

  // Filter to rules that have a modern source — others can't be verified yet.
  toVerify = toVerify.filter(
    (r) => r.sources.modern && r.sources.modern.length > 0,
  );

  if (toVerify.length === 0) {
    console.log(kleur.yellow("No rules with modern sources to verify."));
    return 0;
  }

  console.log(kleur.bold(`Verifying ${toVerify.length} rule(s)...`));
  console.log("");

  const results: VerifyResult[] = [];

  for (const rule of toVerify) {
    const result = await verifyRule(rule);
    results.push(result);

    if (result.failed === 0) {
      console.log(
        `  ${kleur.green("✓")} ${kleur.cyan(rule.id)} (${result.passed}/${result.total})`,
      );
    } else {
      console.log(
        `  ${kleur.red("✗")} ${kleur.cyan(rule.id)} (${result.passed}/${result.total})`,
      );
      for (const e of result.errors) {
        console.log(kleur.dim(`      ${e}`));
      }
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      passed: acc.passed + r.passed,
      failed: acc.failed + r.failed,
    }),
    { total: 0, passed: 0, failed: 0 },
  );

  console.log("");
  console.log(
    `${kleur.bold("Results:")} ${totals.passed}/${totals.total} examples passed across ${results.length} rule(s).`,
  );

  if (options.emit === "json") {
    console.log(JSON.stringify({ totals, results }, null, 2));
  }

  return totals.failed > 0 ? 1 : 0;
}

/**
 * Verify a single rule by running its examples against the modern code.
 *
 * SCAFFOLD: this is where the real work happens. Suggested implementation:
 *
 *   1. Import the symbol referenced by rule.sources.modern[0]:
 *      (mechanism depends on language — dynamic import for TS, importlib
 *      for Python, classpath resolution for JVM, etc.)
 *
 *   2. For each example, call the resolved symbol with example.input and
 *      assert that the result matches example.expect. Use deep equality
 *      with awareness of the project's exact-arithmetic types for money
 *      fields (per tech.md).
 *
 *   3. Return pass/fail counts plus error messages.
 *
 *   4. For state_transition rules, the "input" may include a pre-state and
 *      the "expect" may include a post-state — assert on both.
 *
 *   5. For side_effect rules, mock the collaborators (email, audit) and
 *      assert on call counts.
 *
 * The simplest implementation generates a test file in the project's
 * configured test runner format and shells out to that runner with a
 * machine-readable reporter (e.g. JUnit XML or JSON). That's the
 * recommended starting point.
 */
async function verifyRule(rule: Rule): Promise<VerifyResult> {
  // TODO: replace this stub with actual example execution.
  return {
    ruleId: rule.id,
    total: rule.examples.length,
    passed: 0,
    failed: 0,
    errors: [
      "verifyRule() is a scaffold — implement example execution against modern code",
    ],
  };
}
