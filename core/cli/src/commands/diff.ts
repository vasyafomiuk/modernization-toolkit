// `rules diff` — show gaps, drift, and orphans across the catalog.

import kleur from "kleur";
import { loadAllCatalogs, flattenCatalogs } from "../catalog.js";

export interface DiffOptions {
  rulesDir?: string;
  domain?: string;
  showAll?: boolean;
}

export async function runDiff(options: DiffOptions): Promise<number> {
  const rulesDir = options.rulesDir ?? "rules";
  let catalogs = await loadAllCatalogs(rulesDir);
  if (options.domain) {
    catalogs = catalogs.filter((c) => c.domain === options.domain);
  }

  const all = flattenCatalogs(catalogs);

  // Buckets
  const gaps = all.filter((x) => x.rule.status === "gap");
  const drifts = all.filter((x) => x.rule.status === "drift");
  const orphans = all.filter((x) => x.rule.status === "net_new");
  const unreviewed = all.filter((x) => x.rule.status === "extracted");
  const unverified = all.filter(
    (x) => x.rule.status === "implemented_unverified",
  );

  let printed = 0;

  if (gaps.length > 0 || options.showAll) {
    console.log(kleur.red().bold(`\n● Gaps (${gaps.length})`));
    console.log(kleur.dim("  Legacy rules with no modern implementation.\n"));
    for (const { rule, from } of gaps) {
      console.log(`  ${kleur.cyan(rule.id)}  ${rule.description}`);
      console.log(kleur.dim(`    ${from}`));
      printed++;
    }
  }

  if (drifts.length > 0 || options.showAll) {
    console.log(kleur.magenta().bold(`\n● Drift (${drifts.length})`));
    console.log(kleur.dim("  Intentional divergence between legacy and modern.\n"));
    for (const { rule, from } of drifts) {
      console.log(`  ${kleur.cyan(rule.id)}  ${rule.description}`);
      if (rule.drift_reason) {
        const firstLine = rule.drift_reason.split("\n")[0];
        console.log(kleur.dim(`    reason: ${firstLine}`));
      }
      console.log(kleur.dim(`    ${from}`));
      printed++;
    }
  }

  if (orphans.length > 0 || options.showAll) {
    console.log(kleur.blue().bold(`\n● Net-new (${orphans.length})`));
    console.log(kleur.dim("  Modern-only rules with no legacy counterpart.\n"));
    for (const { rule, from } of orphans) {
      console.log(`  ${kleur.cyan(rule.id)}  ${rule.description}`);
      console.log(kleur.dim(`    ${from}`));
      printed++;
    }
  }

  if (unreviewed.length > 0 || options.showAll) {
    console.log(kleur.yellow().bold(`\n● Awaiting review (${unreviewed.length})`));
    console.log(kleur.dim("  Fresh extractions not yet reviewed.\n"));
    for (const { rule, from } of unreviewed) {
      console.log(`  ${kleur.cyan(rule.id)}  ${rule.description} ${kleur.dim(`[${rule.confidence}]`)}`);
      console.log(kleur.dim(`    ${from}`));
      printed++;
    }
  }

  if (unverified.length > 0 || options.showAll) {
    console.log(kleur.yellow().bold(`\n● Unverified (${unverified.length})`));
    console.log(kleur.dim("  Implemented but not yet passing examples or shadow.\n"));
    for (const { rule, from } of unverified) {
      console.log(`  ${kleur.cyan(rule.id)}  ${rule.description}`);
      console.log(kleur.dim(`    ${from}`));
      printed++;
    }
  }

  if (printed === 0) {
    console.log(kleur.green("✓ No gaps, drift, or unreviewed rules. Catalog is clean."));
  }

  // Exit nonzero if there are gaps — useful for CI
  return gaps.length > 0 ? 1 : 0;
}
