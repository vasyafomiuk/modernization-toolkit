// `rules status` — display rollup of rule counts by domain and status.

import kleur from "kleur";
import { loadAllCatalogs, statusRollup } from "../catalog.js";
import type { RuleStatus } from "../schema.js";

const STATUS_ORDER: RuleStatus[] = [
  "extracted",
  "implemented_unverified",
  "implemented_verified",
  "gap",
  "drift",
  "net_new",
  "deprecated",
];

const STATUS_COLORS: Record<RuleStatus, (s: string) => string> = {
  extracted: kleur.dim,
  implemented_unverified: kleur.yellow,
  implemented_verified: kleur.green,
  gap: kleur.red,
  drift: kleur.magenta,
  net_new: kleur.blue,
  deprecated: kleur.dim,
};

export interface StatusOptions {
  rulesDir?: string;
  domain?: string;
  format?: "table" | "json";
}

export async function runStatus(options: StatusOptions): Promise<number> {
  const rulesDir = options.rulesDir ?? "rules";
  const catalogs = await loadAllCatalogs(rulesDir);
  if (options.domain) {
    catalogs.splice(
      0,
      catalogs.length,
      ...catalogs.filter((c) => c.domain === options.domain),
    );
    if (catalogs.length === 0) {
      console.log(kleur.yellow(`No catalog found for domain: ${options.domain}`));
      return 1;
    }
  }

  const rollup = statusRollup(catalogs);

  if (options.format === "json") {
    console.log(JSON.stringify(rollup, null, 2));
    return 0;
  }

  // Table format
  const domains = Object.keys(rollup).sort();
  if (domains.length === 0) {
    console.log(kleur.yellow("No domains found."));
    return 0;
  }

  // Compute totals
  const totals: Record<string, number> = {};
  let grandTotal = 0;
  for (const d of domains) {
    for (const status of STATUS_ORDER) {
      const n = rollup[d][status] ?? 0;
      totals[status] = (totals[status] ?? 0) + n;
      grandTotal += n;
    }
  }

  // Header
  const domainCol = Math.max(8, ...domains.map((d) => d.length));
  const statusCols = STATUS_ORDER.map((s) => Math.max(s.length, 4));

  const header =
    "Domain".padEnd(domainCol) +
    "  " +
    STATUS_ORDER.map((s, i) => s.padStart(statusCols[i])).join("  ") +
    "  " +
    "Total".padStart(6);
  console.log(kleur.bold(header));
  console.log("-".repeat(header.length));

  for (const d of domains) {
    let rowTotal = 0;
    const cells = STATUS_ORDER.map((s, i) => {
      const n = rollup[d][s] ?? 0;
      rowTotal += n;
      const text = n === 0 ? kleur.dim("0") : STATUS_COLORS[s](String(n));
      const pad = statusCols[i];
      return text.padStart(pad + (text.length - String(n).length));
    });
    console.log(
      d.padEnd(domainCol) +
        "  " +
        cells.join("  ") +
        "  " +
        kleur.bold(String(rowTotal).padStart(6)),
    );
  }

  // Totals row
  console.log("-".repeat(header.length));
  const totalCells = STATUS_ORDER.map((s, i) => {
    const n = totals[s] ?? 0;
    const text = n === 0 ? kleur.dim("0") : kleur.bold(STATUS_COLORS[s](String(n)));
    const pad = statusCols[i];
    return text.padStart(pad + (text.length - String(n).length));
  });
  console.log(
    "TOTAL".padEnd(domainCol) +
      "  " +
      totalCells.join("  ") +
      "  " +
      kleur.bold(String(grandTotal).padStart(6)),
  );

  // Health hints
  console.log("");
  const verified = totals.implemented_verified ?? 0;
  const gaps = totals.gap ?? 0;
  const drift = totals.drift ?? 0;
  const extracted = totals.extracted ?? 0;

  if (verified > 0) {
    const pct = ((verified / grandTotal) * 100).toFixed(1);
    console.log(kleur.green(`✓ ${pct}% of rules verified`));
  }
  if (gaps > 0) {
    console.log(kleur.red(`✗ ${gaps} gap(s) — legacy rules with no modern implementation`));
  }
  if (drift > 0) {
    console.log(kleur.magenta(`⚠ ${drift} drift(s) — intentional divergence, check drift_reason`));
  }
  if (extracted > 0) {
    console.log(kleur.yellow(`◷ ${extracted} unreviewed extraction(s) awaiting human review`));
  }

  return 0;
}
