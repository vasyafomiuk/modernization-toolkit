#!/usr/bin/env node
// rules-cli entry point.

import { Command } from "commander";
import { runLint } from "./commands/lint.js";
import { runStatus } from "./commands/status.js";
import { runDiff } from "./commands/diff.js";
import { runVerify } from "./commands/verify.js";
import { runExtract } from "./commands/extract.js";
import { runLink } from "./commands/link.js";
import { runInit } from "./commands/init.js";
import { runDashboard } from "./commands/dashboard.js";

const program = new Command();

program
  .name("rules")
  .description("Modernization rule catalog CLI")
  .version("0.1.0");

program
  .command("lint")
  .description("Validate catalog files against the schema and cross-file constraints")
  .argument("[target]", "File or directory to lint", "rules")
  .option("--skip-path-check", "Skip source-path-existence check", false)
  .action(async (target, opts) => {
    const code = await runLint({ target, skipPathCheck: opts.skipPathCheck });
    process.exit(code);
  });

program
  .command("status")
  .description("Show rollup of rule counts by domain and status")
  .option("-d, --domain <domain>", "Filter to a single domain")
  .option("-f, --format <format>", "Output format: table|json", "table")
  .option("--rules-dir <dir>", "Path to rules directory", "rules")
  .action(async (opts) => {
    const code = await runStatus({
      domain: opts.domain,
      format: opts.format as "table" | "json",
      rulesDir: opts.rulesDir,
    });
    process.exit(code);
  });

program
  .command("diff")
  .description("Show gaps, drift, orphans, and unreviewed rules")
  .option("-d, --domain <domain>", "Filter to a single domain")
  .option("-a, --all", "Show all categories even when empty", false)
  .option("--rules-dir <dir>", "Path to rules directory", "rules")
  .action(async (opts) => {
    const code = await runDiff({
      domain: opts.domain,
      showAll: opts.all,
      rulesDir: opts.rulesDir,
    });
    process.exit(code);
  });

program
  .command("verify")
  .description("Run rule examples as tests against the modern implementation")
  .option("-d, --domain <domain>", "Verify rules in a single domain")
  .option("-r, --rule <id>", "Verify a single rule by ID")
  .option("--changed-since <ref>", "Verify only rules touching files changed since <ref>")
  .option("--promote", "On success, propose status promotion (does NOT auto-write)", false)
  .option("--emit <format>", "Output format: human|junit|json", "human")
  .option("--rules-dir <dir>", "Path to rules directory", "rules")
  .action(async (opts) => {
    let changedFiles: string[] | undefined;
    if (opts.changedSince) {
      // For brevity, this implementation expects callers to pre-compute the
      // list and pass it via env or extend this branch with a git invocation.
      changedFiles = (process.env.RULES_CHANGED_FILES ?? "")
        .split("\n")
        .filter(Boolean);
    }
    const code = await runVerify({
      domain: opts.domain,
      ruleId: opts.rule,
      changedFiles,
      changedSince: opts.changedSince,
      promote: opts.promote,
      emit: opts.emit as "human" | "junit" | "json",
      rulesDir: opts.rulesDir,
    });
    process.exit(code);
  });

program
  .command("extract")
  .description("Extract business rules from a source file via the AI agent")
  .argument("<source>", "Path to source file (legacy or modern)")
  .requiredOption("--system <legacy|modern>", "Which side this source belongs to")
  .option("-d, --domain <domain>", "Override inferred domain")
  .option("--out <dir>", "Output directory", "rules-raw")
  .option("--model <model>", "Model identifier", "claude-opus-4-7")
  .action(async (source, opts) => {
    const code = await runExtract({
      sourcePath: source,
      system: opts.system,
      domain: opts.domain,
      outDir: opts.out,
      model: opts.model,
    });
    process.exit(code);
  });

program
  .command("link")
  .description("Link legacy and modern extractions, classify matches and gaps")
  .option("-d, --domain <domain>", "Restrict linking to a single domain")
  .option("-t, --threshold <n>", "Similarity threshold for auto-match", "0.92")
  .option("--raw-dir <dir>", "Raw extractions directory", "rules-raw")
  .option("--model <model>", "Model identifier", "claude-opus-4-7")
  .action(async (opts) => {
    const code = await runLink({
      domain: opts.domain,
      threshold: Number(opts.threshold),
      rawDir: opts.rawDir,
      model: opts.model,
    });
    process.exit(code);
  });

program
  .command("init")
  .description("Scaffold a target repo with the toolkit (example + universal pieces + CLI)")
  .argument("<target>", "Target directory to scaffold into")
  .option("-e, --example <name>", "Example to use as base (defaults to the only one if unambiguous)")
  .option("--no-install-cli", "Skip copying and installing the CLI into <target>/tools/rules-cli")
  .option("-f, --force", "Scaffold even if the target directory is not empty", false)
  .action(async (target, opts) => {
    const code = await runInit({
      target,
      example: opts.example,
      installCli: opts.installCli !== false,
      force: opts.force,
    });
    process.exit(code);
  });

program
  .command("dashboard")
  .description("Start the local dashboard UI for managing modernization projects")
  .option("-p, --port <port>", "Port to bind (default 4000)", "4000")
  .option("--host <host>", "Host to bind (default 127.0.0.1)", "127.0.0.1")
  .option("--no-open", "Do not open the browser automatically")
  .option("--db <path>", "Override SQLite DB path (default ~/.modernization-toolkit/dashboard.db)")
  .action(async (opts) => {
    const code = await runDashboard({
      port: Number(opts.port),
      host: opts.host,
      open: opts.open !== false,
      dbPath: opts.db,
    });
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
