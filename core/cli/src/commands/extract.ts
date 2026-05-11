// `rules extract` — invoke the extract-business-rules skill on a source file.
//
// This command is a thin wrapper that:
//   1. Parses the target file (using the appropriate parser per language)
//   2. Calls the AI agent with the extraction system prompt
//   3. Writes results to rules-raw/<system>/<domain>/<source-path>.yaml
//
// SCAFFOLD: integration with your AI provider (Anthropic API, Bedrock, etc.)
// is project-specific. The structure below shows where to plug it in.

import fs from "node:fs/promises";
import path from "node:path";
import kleur from "kleur";

export interface ExtractOptions {
  sourcePath: string;
  system: "legacy" | "modern";
  domain?: string;
  outDir?: string;
  model?: string;
}

export async function runExtract(options: ExtractOptions): Promise<number> {
  const { sourcePath, system } = options;

  // 1. Verify source exists
  try {
    await fs.access(sourcePath);
  } catch {
    console.error(kleur.red(`Source not found: ${sourcePath}`));
    return 1;
  }

  // 2. Determine language
  const ext = path.extname(sourcePath).toLowerCase();
  const language = detectLanguage(ext);
  if (!language) {
    console.error(kleur.red(`Unsupported file type: ${ext}`));
    return 1;
  }

  // 3. Determine domain
  const domain = options.domain ?? inferDomain(sourcePath);
  console.log(kleur.dim(`Extracting from ${sourcePath} (${language}, domain=${domain})`));

  // 4. Determine output path
  const outDir = options.outDir ?? "rules-raw";
  const outPath = path.join(
    outDir,
    system,
    domain,
    sourcePath.replace(/[/\\]/g, "_") + ".yaml",
  );

  // 5. INTEGRATION POINT: call AI agent
  //
  //   Pseudocode:
  //
  //   const sourceText = await fs.readFile(sourcePath, "utf8");
  //   const callees = await inlineCallees(sourcePath, language); // AST-based
  //   const systemPrompt = await fs.readFile(
  //     ".kiro/skills/extract-business-rules/references/extraction-system-prompt.md",
  //     "utf8"
  //   );
  //   const userPrompt = buildUserPrompt({ sourceText, callees, language, domain });
  //   const yamlOutput = await callAnthropicAPI({
  //     model: options.model ?? "claude-opus-4-7",
  //     system: systemPrompt,
  //     user: userPrompt,
  //   });
  //
  //   await fs.mkdir(path.dirname(outPath), { recursive: true });
  //   await fs.writeFile(outPath, yamlOutput);

  console.log(kleur.yellow("\n⚠ Extract command is a scaffold."));
  console.log(kleur.dim("  Wire in your AI provider integration here."));
  console.log(kleur.dim(`  Target output: ${outPath}`));
  console.log("");
  console.log(kleur.dim("  See .kiro/skills/extract-business-rules/SKILL.md for full guidance,"));
  console.log(kleur.dim("  or invoke the skill directly from Kiro for interactive extraction."));

  return 0;
}

function detectLanguage(ext: string): string | null {
  switch (ext) {
    case ".cs":
      return "csharp";
    case ".pck":
    case ".pkb":
    case ".sql":
    case ".prc":
    case ".fnc":
      return "plsql";
    case ".ts":
      return "typescript";
    default:
      return null;
  }
}

function inferDomain(sourcePath: string): string {
  // Best-effort: take the first directory segment after legacy/ or modern/.
  const norm = sourcePath.replace(/\\/g, "/");
  const m = norm.match(/(?:legacy|modern)\/(?:src\/)?([a-zA-Z][a-zA-Z0-9_-]+)/);
  return (m?.[1] ?? "unknown").toLowerCase();
}
