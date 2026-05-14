// `rules link` — cross-reference legacy and modern extractions to find
// matches, gaps, drift, and orphans. Writes proposals to
// rules-raw/_link-proposals.yaml.
//
// SCAFFOLD: like extract, the heavy lift is an AI call. The structure below
// is the integration point.

import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";
import { glob } from "glob";
import YAML from "yaml";
import type { Rule } from "../schema.js";

export interface LinkOptions {
  rawDir?: string;
  domain?: string;
  threshold?: number;
  model?: string;
}

interface LinkProposal {
  legacy_id: string | null;
  modern_id: string | null;
  classification:
    | "match"
    | "drift:minor"
    | "drift:major"
    | "gap"
    | "orphan";
  similarity: number;
  reasoning: string;
}

export async function runLink(options: LinkOptions): Promise<number> {
  const rawDir = options.rawDir ?? "rules-raw";
  const threshold = options.threshold ?? 0.92;

  // 1. Load raw extractions from both sides
  const legacyDir = path.join(rawDir, "legacy");
  const modernDir = path.join(rawDir, "modern");

  let legacyRules: Rule[];
  let modernRules: Rule[];
  try {
    legacyRules = await loadRulesFromDir(legacyDir, options.domain);
    modernRules = await loadRulesFromDir(modernDir, options.domain);
  } catch (err) {
    console.error(kleur.red((err as Error).message));
    return 1;
  }

  if (legacyRules.length === 0 && modernRules.length === 0) {
    console.log(kleur.yellow("No raw extractions found. Run `rules extract` first."));
    return 0;
  }

  console.log(
    kleur.bold(
      `Linking ${legacyRules.length} legacy rule(s) ↔ ${modernRules.length} modern rule(s)`,
    ),
  );

  // 2. INTEGRATION POINT: AI-driven linking
  //
  //   Pseudocode:
  //
  //   const systemPrompt = buildLinkingSystemPrompt({ threshold });
  //   const userPrompt = JSON.stringify({ legacy: legacyRules, modern: modernRules });
  //   const proposalsYaml = await callAnthropicAPI({ ... });
  //   const proposals = YAML.parse(proposalsYaml).proposals as LinkProposal[];

  const proposals: LinkProposal[] = [];

  // STUB: simple ID-matching as a placeholder for the AI call
  const modernById = new Map(modernRules.map((r) => [r.id, r]));
  for (const lr of legacyRules) {
    if (modernById.has(lr.id)) {
      proposals.push({
        legacy_id: lr.id,
        modern_id: lr.id,
        classification: "match",
        similarity: 1.0,
        reasoning: "Stub: matched on identical ID. Replace with AI-driven semantic linking.",
      });
      modernById.delete(lr.id);
    } else {
      proposals.push({
        legacy_id: lr.id,
        modern_id: null,
        classification: "gap",
        similarity: 0.0,
        reasoning: "Stub: no modern rule with matching ID. Replace with AI-driven semantic linking.",
      });
    }
  }
  for (const mr of modernById.values()) {
    proposals.push({
      legacy_id: null,
      modern_id: mr.id,
      classification: "orphan",
      similarity: 0.0,
      reasoning: "Stub: no legacy counterpart. Likely net_new — confirm.",
    });
  }

  // 3. Write proposals
  const outPath = path.join(rawDir, "_link-proposals.yaml");
  const yamlOut = YAML.stringify({ threshold, proposals });
  await fs.writeFile(outPath, yamlOut);

  // 4. Summary
  const summary = {
    match: proposals.filter((p) => p.classification === "match").length,
    "drift:minor": proposals.filter((p) => p.classification === "drift:minor").length,
    "drift:major": proposals.filter((p) => p.classification === "drift:major").length,
    gap: proposals.filter((p) => p.classification === "gap").length,
    orphan: proposals.filter((p) => p.classification === "orphan").length,
  };

  console.log("");
  console.log(kleur.bold("Proposals:"));
  console.log(`  ${kleur.green("match")}        ${summary.match}`);
  console.log(`  ${kleur.yellow("drift:minor")}  ${summary["drift:minor"]}`);
  console.log(`  ${kleur.red("drift:major")}  ${summary["drift:major"]}`);
  console.log(`  ${kleur.red("gap")}          ${summary.gap}`);
  console.log(`  ${kleur.blue("orphan")}       ${summary.orphan}`);
  console.log("");
  console.log(kleur.dim(`Written to ${outPath}`));
  console.log(kleur.yellow("\n⚠ Stub linker — replace with AI-driven semantic linking."));

  return 0;
}

async function loadRulesFromDir(dir: string, domain?: string): Promise<Rule[]> {
  try {
    await fs.access(dir);
  } catch {
    return [];
  }
  const pattern = domain ? `${domain}/**/*.yaml` : "**/*.yaml";
  const files = await glob(pattern, { cwd: dir });
  const out: Rule[] = [];
  for (const f of files) {
    const text = await fs.readFile(path.join(dir, f), "utf8");
    const parsed = YAML.parse(text);
    if (Array.isArray(parsed)) out.push(...parsed);
  }
  return out;
}
