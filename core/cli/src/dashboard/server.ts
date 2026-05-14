// Tiny HTTP server for the dashboard. Built on node:http to avoid pulling in
// a framework. Routes are matched with a small regex table.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { openDb } from "./db.js";
import {
  ApiError,
  apiAddProject,
  apiAddRule,
  apiDeleteProject,
  apiGetCatalog,
  apiGetStatus,
  apiListProjects,
  apiListRuleFiles,
  apiListRuns,
  apiReadRuleFile,
  apiRunCommand,
  apiWriteRuleFile,
} from "./api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From dist/dashboard/server.js -> ../../static/index.html resolves to
// core/cli/static/index.html (sibling of dist/).
const STATIC_DIR = path.resolve(__dirname, "../../static");

interface Route {
  method: string;
  pattern: RegExp;
  handler: (
    db: Database.Database,
    match: RegExpMatchArray,
    body: unknown,
  ) => unknown | Promise<unknown>;
}

const routes: Route[] = [
  {
    method: "GET",
    pattern: /^\/api\/projects$/,
    handler: (db) => apiListProjects(db),
  },
  {
    method: "POST",
    pattern: /^\/api\/projects$/,
    handler: (db, _m, body) => apiAddProject(db, body as { name?: string; path?: string }),
  },
  {
    method: "DELETE",
    pattern: /^\/api\/projects\/(\d+)$/,
    handler: (db, m) => apiDeleteProject(db, Number(m[1])),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/(\d+)\/status$/,
    handler: (db, m) => apiGetStatus(db, Number(m[1])),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/(\d+)\/catalog$/,
    handler: (db, m) => apiGetCatalog(db, Number(m[1])),
  },
  {
    method: "POST",
    pattern: /^\/api\/projects\/(\d+)\/run$/,
    handler: (db, m, body) =>
      apiRunCommand(db, Number(m[1]), body as { command?: string; args?: string[] }),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/(\d+)\/runs$/,
    handler: (db, m) => apiListRuns(db, Number(m[1])),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/(\d+)\/rules$/,
    handler: (db, m) => apiListRuleFiles(db, Number(m[1])),
  },
  {
    method: "POST",
    pattern: /^\/api\/projects\/(\d+)\/rules$/,
    handler: (db, m, body) =>
      apiAddRule(db, Number(m[1]), body as { domain?: string; rule?: unknown }),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/(\d+)\/rules\/([^/]+)$/,
    handler: (db, m) => apiReadRuleFile(db, Number(m[1]), decodeURIComponent(m[2])),
  },
  {
    method: "PUT",
    pattern: /^\/api\/projects\/(\d+)\/rules\/([^/]+)$/,
    handler: (db, m, body) =>
      apiWriteRuleFile(db, Number(m[1]), decodeURIComponent(m[2]), body as { content?: string }),
  },
];

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const urlPath = req.url === "/" || !req.url ? "/index.html" : req.url.split("?")[0];
  const safe = path.normalize(urlPath).replace(/^[/\\]+/, "");
  const abs = path.join(STATIC_DIR, safe);
  if (!abs.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const content = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const ctype =
      ext === ".html" ? "text/html; charset=utf-8" :
      ext === ".js" ? "application/javascript; charset=utf-8" :
      ext === ".css" ? "text/css; charset=utf-8" :
      "application/octet-stream";
    res.writeHead(200, { "content-type": ctype });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

export interface ServerOptions {
  port: number;
  host: string;
  dbPath?: string;
}

export function startServer(opts: ServerOptions): { close: () => void; url: string } {
  const db = openDb(opts.dbPath);

  const server = http.createServer(async (req, res) => {
    try {
      const url = req.url ?? "/";
      const pathname = url.split("?")[0];

      // API routes
      if (pathname.startsWith("/api/")) {
        for (const route of routes) {
          if (route.method !== req.method) continue;
          const match = pathname.match(route.pattern);
          if (!match) continue;
          let body: unknown = undefined;
          if (req.method === "POST" || req.method === "PUT") {
            const raw = await readBody(req);
            if (raw) {
              try {
                body = JSON.parse(raw);
              } catch {
                sendJson(res, 400, { error: "Invalid JSON body" });
                return;
              }
            }
          }
          try {
            const result = await route.handler(db, match, body);
            sendJson(res, 200, result);
          } catch (err) {
            if (err instanceof ApiError) {
              sendJson(res, err.status, { error: err.message });
            } else {
              console.error(err);
              sendJson(res, 500, { error: (err as Error).message });
            }
          }
          return;
        }
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      // Static
      await serveStatic(req, res);
    } catch (err) {
      console.error(err);
      try {
        sendJson(res, 500, { error: (err as Error).message });
      } catch {
        // headers already sent
      }
    }
  });

  server.listen(opts.port, opts.host);
  const url = `http://${opts.host}:${opts.port}`;
  return {
    url,
    close: () => {
      server.close();
      db.close();
    },
  };
}
