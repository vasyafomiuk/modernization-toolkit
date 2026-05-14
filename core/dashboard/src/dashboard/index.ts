#!/usr/bin/env node
import { exec } from "node:child_process";
import { startServer } from "./server.js";

interface DashboardOptions {
  port: number;
  host: string;
  open: boolean;
  dbPath?: string;
}

function parseArgs(argv: string[]): DashboardOptions {
  const opts: DashboardOptions = {
    port: 4000,
    host: "127.0.0.1",
    open: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === "-p" || arg === "--port") && next) {
      opts.port = Number(next);
      i += 1;
    } else if (arg === "--host" && next) {
      opts.host = next;
      i += 1;
    } else if (arg === "--db" && next) {
      opts.dbPath = next;
      i += 1;
    } else if (arg === "--no-open") {
      opts.open = false;
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isInteger(opts.port) || opts.port <= 0) {
    throw new Error("Port must be a positive integer");
  }

  return opts;
}

function printHelp(): void {
  console.log(`Modernization Toolkit Dashboard

Usage:
  npm start -- [options]

Options:
  -p, --port <port>  Port to bind (default 4000)
  --host <host>      Host to bind (default 127.0.0.1)
  --db <path>        Override SQLite DB path
  --no-open          Do not open the browser automatically
  -h, --help         Show help
`);
}

function openInBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? `open "${url}"` :
    process.platform === "win32" ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => { /* best effort */ });
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const { url, close } = startServer({
    port: opts.port,
    host: opts.host,
    dbPath: opts.dbPath,
  });

  console.log(`Dashboard running at ${url}`);
  console.log("Press Ctrl+C to stop.");

  if (opts.open) openInBrowser(url);

  const shutdown = () => {
    console.log("\nShutting down...");
    close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
