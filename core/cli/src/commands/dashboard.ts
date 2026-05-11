// `rules dashboard` — start the local dashboard server.

import { exec } from "node:child_process";
import kleur from "kleur";
import { startServer } from "../dashboard/server.js";

export interface DashboardOptions {
  port: number;
  host: string;
  open: boolean;
  dbPath?: string;
}

function openInBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? `open "${url}"` :
    process.platform === "win32" ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => { /* best effort */ });
}

export async function runDashboard(opts: DashboardOptions): Promise<number> {
  const { url, close } = startServer({ port: opts.port, host: opts.host, dbPath: opts.dbPath });

  console.log(kleur.bold().green(`Dashboard running at ${url}`));
  console.log(kleur.dim("Press Ctrl+C to stop."));

  if (opts.open) openInBrowser(url);

  return new Promise<number>((resolve) => {
    const shutdown = () => {
      console.log(kleur.dim("\nShutting down…"));
      close();
      resolve(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });
}
