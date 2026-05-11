// SQLite-backed registry + run history for the dashboard.
// Source of truth for catalog data remains the YAML files on disk — this DB
// only tracks (a) which project paths the user has registered, and (b) a
// log of CLI invocations triggered from the dashboard.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface Project {
  id: number;
  name: string;
  path: string;
  added_at: string;
}

export interface RunRecord {
  id: number;
  project_id: number;
  command: string;
  exit_code: number;
  started_at: string;
  finished_at: string;
  output: string;
}

const DEFAULT_DB_PATH = path.join(os.homedir(), ".modernization-toolkit", "dashboard.db");

export function openDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      added_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      command TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      output TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runs_project_started
      ON runs(project_id, started_at DESC);
  `);
  return db;
}

export function listProjects(db: Database.Database): Project[] {
  return db.prepare("SELECT * FROM projects ORDER BY added_at DESC").all() as Project[];
}

export function getProject(db: Database.Database, id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function addProject(
  db: Database.Database,
  name: string,
  projectPath: string,
): Project {
  const absPath = path.resolve(projectPath);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    throw new Error(`Path does not exist or is not a directory: ${absPath}`);
  }
  const info = db
    .prepare(
      "INSERT INTO projects (name, path, added_at) VALUES (?, ?, ?) RETURNING *",
    )
    .get(name, absPath, new Date().toISOString()) as Project;
  return info;
}

export function deleteProject(db: Database.Database, id: number): boolean {
  const res = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return res.changes > 0;
}

export function recordRun(
  db: Database.Database,
  run: Omit<RunRecord, "id">,
): RunRecord {
  return db
    .prepare(
      `INSERT INTO runs (project_id, command, exit_code, started_at, finished_at, output)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(
      run.project_id,
      run.command,
      run.exit_code,
      run.started_at,
      run.finished_at,
      run.output,
    ) as RunRecord;
}

export function recentRuns(
  db: Database.Database,
  projectId: number,
  limit = 20,
): RunRecord[] {
  return db
    .prepare(
      `SELECT * FROM runs
       WHERE project_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
    )
    .all(projectId, limit) as RunRecord[];
}
