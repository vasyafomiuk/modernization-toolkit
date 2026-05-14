// `rules init` — guided scaffold of a target repo from the toolkit.
//
// Copies the chosen example as a base, overlays the catalog schema from core/,
// and (optionally) installs the CLI under tools/rules-cli. Single positional
// argument: the target directory.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import kleur from "kleur";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// From dist/commands/init.js up to the toolkit root: commands -> dist -> cli -> core -> root.
const TOOLKIT_ROOT = path.resolve(__dirname, "../../../..");

export interface InitOptions {
  target: string;
  example?: string;
  installCli: boolean;
  force: boolean;
}

interface CopyPlanEntry {
  from: string;
  to: string;
  label: string;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listExamples(): Promise<string[]> {
  const examplesDir = path.join(TOOLKIT_ROOT, "examples");
  const entries = await fs.readdir(examplesDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function ensureCleanTarget(target: string, force: boolean): Promise<void> {
  const exists = await pathExists(target);
  if (!exists) {
    await fs.mkdir(target, { recursive: true });
    return;
  }
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) {
    throw new Error(`Target exists and is not a directory: ${target}`);
  }
  const contents = await fs.readdir(target);
  const nonHidden = contents.filter((n) => !n.startsWith("."));
  if (nonHidden.length > 0 && !force) {
    throw new Error(
      `Target is not empty: ${target}\n` +
        `Re-run with --force to scaffold into a non-empty directory.`,
    );
  }
}

async function copyDir(from: string, to: string): Promise<void> {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
}

async function buildCopyPlan(
  example: string,
): Promise<{ steps: CopyPlanEntry[]; exampleAbs: string }> {
  const exampleAbs = path.join(TOOLKIT_ROOT, "examples", example);
  if (!(await pathExists(exampleAbs))) {
    throw new Error(`Example not found: ${example}`);
  }
  const steps: CopyPlanEntry[] = [
    { from: exampleAbs, to: "{target}", label: `example: ${example}` },
    {
      from: path.join(TOOLKIT_ROOT, "core/schema"),
      to: "{target}/rules/.schema",
      label: "core/schema -> rules/.schema",
    },
  ];
  return { steps, exampleAbs };
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function installCliInto(target: string): Promise<void> {
  const cliDest = path.join(target, "tools/rules-cli");
  console.log(kleur.cyan(`\nInstalling CLI into ${path.relative(target, cliDest) || "."}…`));
  await copyDir(path.join(TOOLKIT_ROOT, "core/cli"), cliDest);
  // Skip copying node_modules / dist from the source CLI if present.
  for (const junk of ["node_modules", "dist"]) {
    const p = path.join(cliDest, junk);
    if (await pathExists(p)) {
      await fs.rm(p, { recursive: true, force: true });
    }
  }
  await runCommand("npm", ["install"], cliDest);
  await runCommand("npm", ["run", "build"], cliDest);
  console.log(
    kleur.green("CLI installed.") +
      kleur.dim(`  Run \`npm link\` in ${path.relative(target, cliDest)} to expose \`rules\` globally.`),
  );
}

export async function runInit(opts: InitOptions): Promise<number> {
  const target = path.resolve(opts.target);

  // Resolve example (default: the only one if there's exactly one).
  let example = opts.example;
  if (!example) {
    const available = await listExamples();
    if (available.length === 1) {
      example = available[0];
    } else {
      console.error(
        kleur.red("Multiple examples available; pick one with --example:\n  ") +
          available.map((e) => `- ${e}`).join("\n  "),
      );
      return 1;
    }
  }

  console.log(kleur.bold(`Scaffolding modernization toolkit into ${target}`));
  console.log(kleur.dim(`Example: ${example}`));

  try {
    await ensureCleanTarget(target, opts.force);
    const { steps } = await buildCopyPlan(example);
    for (const step of steps) {
      const dest = step.to.replace("{target}", target);
      console.log(kleur.cyan("  copy ") + step.label);
      await copyDir(step.from, dest);
    }
  } catch (err) {
    console.error(kleur.red(String((err as Error).message)));
    return 1;
  }

  if (opts.installCli) {
    try {
      await installCliInto(target);
    } catch (err) {
      console.error(kleur.red("CLI install failed: ") + (err as Error).message);
      console.error(
        kleur.yellow("Scaffold is in place; finish manually with:\n") +
          `  cd ${path.join(target, "tools/rules-cli")}\n` +
          `  npm install && npm run build && npm link`,
      );
      return 1;
    }
  }

  console.log(kleur.green().bold("\nDone."));
  console.log("Next steps:");
  console.log(`  1. cd ${target}`);
  console.log(`  2. Edit rules/*.yaml for your domains, owners, and source paths`);
  if (opts.installCli) {
    console.log(`  3. cd tools/rules-cli && npm link    # expose \`rules\` globally`);
    console.log(`  4. rules lint                         # confirm catalog parses`);
  } else {
    console.log(`  3. cd tools/rules-cli && npm install && npm run build && npm link`);
    console.log(`  4. rules lint                         # confirm catalog parses`);
  }
  return 0;
}
