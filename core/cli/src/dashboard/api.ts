// Dashboard HTTP API handlers. Each handler is a plain function returning a
// JSON-serializable value (or throwing an ApiError) — the server module wraps
// them with the request/response plumbing.

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
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
