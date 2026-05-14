// Dashboard HTTP API handlers. Each handler is a plain function returning a
// JSON-serializable value (or throwing an ApiError) — the server module wraps
// them with the request/response plumbing.

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type Database from "better-sqlite3";
import {
  addProject,
  deleteProject,
  getProject,
  listProjects,
  recentRuns,
  recordRun,
  type Project,
} from "./db.js";
import { loadAllCatalogs } from "../catalog.js";
import type {
  Confidence,
  Rule,
  RuleCriticality,
  RulePriority,
  RuleStatus,
  RuleType,
  Source,
} from "../schema.js";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From dist/dashboard/api.js: up to cli/, then dist/index.js is the CLI entry.
const CLI_ENTRY = path.resolve(__dirname, "../index.js");

function requireProject(db: Database.Database, id: number): Project {
  const p = getProject(db, id);
  if (!p) throw new ApiError(404, `Project ${id} not found`);
  return p;
}

// --- Projects ---

export function apiListProjects(db: Database.Database) {
  return { projects: listProjects(db) };
}

export function apiAddProject(
  db: Database.Database,
  body: { name?: string; path?: string },
) {
  if (!body.path) throw new ApiError(400, "Missing 'path'");
  const name = body.name?.trim() || path.basename(path.resolve(body.path));
  try {
    return { project: addProject(db, name, body.path) };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("UNIQUE")) throw new ApiError(409, "Path already registered");
    throw new ApiError(400, msg);
  }
}

export function apiDeleteProject(db: Database.Database, id: number) {
  const ok = deleteProject(db, id);
  if (!ok) throw new ApiError(404, `Project ${id} not found`);
  return { ok: true };
}

// --- CLI runs ---

interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
}

function spawnCli(cwd: string, args: string[]): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? -1,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
    });
    child.on("error", (err) => {
      resolve({
        exitCode: -1,
        stdout: "",
        stderr: String(err),
        startedAt,
        finishedAt: new Date().toISOString(),
      });
    });
  });
}

const ALLOWED_COMMANDS = new Set(["lint", "status", "diff", "verify"]);

export async function apiRunCommand(
  db: Database.Database,
  projectId: number,
  body: { command?: string; args?: string[] },
) {
  const project = requireProject(db, projectId);
  const cmd = body.command;
  if (!cmd || !ALLOWED_COMMANDS.has(cmd)) {
    throw new ApiError(400, `Command must be one of: ${[...ALLOWED_COMMANDS].join(", ")}`);
  }
  const extraArgs = Array.isArray(body.args) ? body.args.filter((a) => typeof a === "string") : [];
  const result = await spawnCli(project.path, [cmd, ...extraArgs]);
  const combined = result.stdout + (result.stderr ? "\n[stderr]\n" + result.stderr : "");
  const run = recordRun(db, {
    project_id: project.id,
    command: cmd + (extraArgs.length ? " " + extraArgs.join(" ") : ""),
    exit_code: result.exitCode,
    started_at: result.startedAt,
    finished_at: result.finishedAt,
    output: combined,
  });
  return { run };
}

export function apiListRuns(db: Database.Database, projectId: number) {
  requireProject(db, projectId);
  return { runs: recentRuns(db, projectId, 50) };
}

// --- Status rollup (calls the same CLI as a subprocess for parity) ---

export async function apiGetStatus(db: Database.Database, projectId: number) {
  const project = requireProject(db, projectId);
  const result = await spawnCli(project.path, ["status", "--format", "json"]);
  if (result.exitCode !== 0) {
    return { ok: false, exitCode: result.exitCode, stderr: result.stderr };
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return { ok: true, status: parsed };
  } catch {
    return { ok: false, exitCode: 0, stderr: "Could not parse JSON output", raw: result.stdout };
  }
}

// --- Parsed catalog (for the comparison view) ---

export async function apiGetCatalog(db: Database.Database, projectId: number) {
  const project = requireProject(db, projectId);
  const rulesDir = path.join(project.path, "rules");
  if (!fsSync.existsSync(rulesDir)) return { catalogs: [] };
  try {
    const catalogs = await loadAllCatalogs(rulesDir);
    // Strip absolute paths so the client only sees the file basename.
    return {
      catalogs: catalogs.map((c) => ({
        file: path.basename(c.path),
        domain: c.domain,
        rules: c.rules,
      })),
    };
  } catch (err) {
    throw new ApiError(500, `Failed to load catalog: ${(err as Error).message}`);
  }
}

// --- Rule files (browse + edit) ---

function safeRulePath(project: Project, relPath: string): string {
  const rulesRoot = path.join(project.path, "rules");
  const abs = path.resolve(rulesRoot, relPath);
  if (!abs.startsWith(rulesRoot + path.sep) && abs !== rulesRoot) {
    throw new ApiError(400, "Path escapes rules directory");
  }
  return abs;
}

export async function apiListRuleFiles(db: Database.Database, projectId: number) {
  const project = requireProject(db, projectId);
  const rulesRoot = path.join(project.path, "rules");
  if (!fsSync.existsSync(rulesRoot)) return { files: [] };
  const entries = await fs.readdir(rulesRoot, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => e.name)
    .sort();
  return { files };
}

export async function apiReadRuleFile(
  db: Database.Database,
  projectId: number,
  relPath: string,
) {
  const project = requireProject(db, projectId);
  const abs = safeRulePath(project, relPath);
  try {
    const content = await fs.readFile(abs, "utf8");
    return { path: relPath, content };
  } catch (err) {
    throw new ApiError(404, `Could not read ${relPath}: ${(err as Error).message}`);
  }
}

export async function apiWriteRuleFile(
  db: Database.Database,
  projectId: number,
  relPath: string,
  body: { content?: string },
) {
  if (typeof body.content !== "string") {
    throw new ApiError(400, "Missing 'content' string");
  }
  const project = requireProject(db, projectId);
  const abs = safeRulePath(project, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body.content, "utf8");
  return { ok: true, path: relPath, bytes: body.content.length };
}

// --- Structured rule creation ---

const RULE_TYPES: RuleType[] = [
  "validation",
  "calculation",
  "authorization",
  "state_transition",
  "side_effect",
];

const RULE_STATUSES: RuleStatus[] = [
  "extracted",
  "implemented_unverified",
  "implemented_verified",
  "gap",
  "drift",
  "net_new",
  "deprecated",
];

const CONFIDENCES: Confidence[] = ["high", "medium", "low"];
const PRIORITIES: RulePriority[] = ["P0", "P1", "P2", "P3"];
const CRITICALITIES: RuleCriticality[] = ["critical", "high", "medium", "low"];

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `Missing '${field}'`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ApiError(400, `'${field}' must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function optionalEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return enumValue(value, allowed, field);
}

function stringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, `'${field}' must be an array`);
  const strings = value
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  return strings.length ? strings : undefined;
}

function sourceList(value: unknown, field: string): Source[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, `'${field}' must be an array`);
  const sources: Source[] = [];
  for (const raw of value) {
    const src = asRecord(raw, field);
    const srcPath = optionalString(src.path);
    const symbol = optionalString(src.symbol);
    if (!srcPath && !symbol) continue;
    if (!srcPath || !symbol) {
      throw new ApiError(400, `Each '${field}' source needs both path and symbol`);
    }
    const lines = src.lines;
    if (
      !Array.isArray(lines) ||
      lines.length !== 2 ||
      !lines.every((n) => Number.isInteger(n) && n > 0) ||
      lines[1] < lines[0]
    ) {
      throw new ApiError(400, `Each '${field}' source needs ordered lines: [start, end]`);
    }
    sources.push({ path: srcPath, symbol, lines: [lines[0], lines[1]] });
  }
  return sources.length ? sources : undefined;
}

function normalizeRule(rawRule: unknown, domain: string): Rule {
  const input = asRecord(rawRule, "rule");
  const id = requiredString(input.id, "rule.id");
  if (!/^[A-Z]{2,5}-[A-Z]{3,5}-[0-9]{3,4}$/.test(id)) {
    throw new ApiError(400, "Rule id must match <DOMAIN>-<KIND>-<NUM>, e.g. ORD-CALC-007");
  }

  const examples = input.examples;
  if (!Array.isArray(examples) || examples.length < 2) {
    throw new ApiError(400, "Rule needs at least two examples");
  }

  const legacy = sourceList(input.legacy_sources, "legacy_sources");
  const modern = sourceList(input.modern_sources, "modern_sources");
  if (!legacy && !modern) {
    throw new ApiError(400, "Rule needs at least one legacy or modern source");
  }

  const rule: Rule = {
    id,
    type: enumValue(input.type, RULE_TYPES, "rule.type"),
    domain,
    description: requiredString(input.description, "rule.description"),
    logic: requiredString(input.logic, "rule.logic"),
    sources: {
      ...(legacy ? { legacy } : {}),
      ...(modern ? { modern } : {}),
    },
    examples: examples as Rule["examples"],
    status: enumValue(input.status, RULE_STATUSES, "rule.status"),
    confidence: enumValue(input.confidence, CONFIDENCES, "rule.confidence"),
  };

  const simpleFields = [
    "app",
    "capability",
    "endpoint",
    "owner",
    "target_release",
    "jira_ticket",
    "trigger",
    "effect",
    "notes",
    "drift_reason",
    "deprecated_reason",
    "reviewed_by",
    "reviewed_at",
  ] as const;
  for (const field of simpleFields) {
    const value = optionalString(input[field]);
    if (value) rule[field] = value;
  }

  rule.priority = optionalEnumValue(input.priority, PRIORITIES, "rule.priority");
  rule.criticality = optionalEnumValue(input.criticality, CRITICALITIES, "rule.criticality");
  rule.preconditions = stringArray(input.preconditions, "rule.preconditions");
  rule.tags = stringArray(input.tags, "rule.tags");

  if (rule.status === "drift" && !rule.drift_reason) {
    throw new ApiError(400, "Drift rules need a drift_reason");
  }
  if (rule.status === "deprecated" && !rule.deprecated_reason) {
    throw new ApiError(400, "Deprecated rules need a deprecated_reason");
  }
  if (rule.confidence === "low" && !rule.notes) {
    throw new ApiError(400, "Low-confidence rules need notes");
  }

  return Object.fromEntries(
    Object.entries(rule).filter(([, value]) => value !== undefined),
  ) as Rule;
}

export async function apiAddRule(
  db: Database.Database,
  projectId: number,
  body: { domain?: string; rule?: unknown } = {},
) {
  const project = requireProject(db, projectId);
  const domain = requiredString(body.domain, "domain");
  if (!/^[a-z][a-z0-9_-]*$/.test(domain)) {
    throw new ApiError(400, "Domain must be lowercase, e.g. orders or policy_admin");
  }

  const rule = normalizeRule(body.rule, domain);
  const rulesRoot = path.join(project.path, "rules");
  await fs.mkdir(rulesRoot, { recursive: true });

  const catalogs = fsSync.existsSync(rulesRoot) ? await loadAllCatalogs(rulesRoot) : [];
  const duplicate = catalogs
    .flatMap((c) => c.rules)
    .find((existing) => existing.id === rule.id);
  if (duplicate) throw new ApiError(409, `Rule id already exists: ${rule.id}`);

  const fileName = `${domain}.yaml`;
  const filePath = safeRulePath(project, fileName);
  let existingRules: Rule[] = [];
  if (fsSync.existsSync(filePath)) {
    const parsed = YAML.parse(await fs.readFile(filePath, "utf8"));
    if (!Array.isArray(parsed)) throw new ApiError(400, `${fileName} must contain a YAML array`);
    existingRules = parsed as Rule[];
  }

  existingRules.push(rule);
  const yaml = YAML.stringify(existingRules, {
    lineWidth: 100,
    minContentWidth: 20,
  });
  await fs.writeFile(filePath, yaml, "utf8");

  return { ok: true, file: fileName, rule };
}
