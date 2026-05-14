// SQLite-backed registry for the dashboard.
// Source of truth for catalog data remains the YAML files on disk — this DB
// only tracks which project paths the user has registered.

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
