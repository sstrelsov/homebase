#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs-extra";
import fetch from "node-fetch";
import path from "path";
import kill from "tree-kill"; // <--- new

const ROUTES_TO_EXPORT = [
  "/",
  "/bio",
  "/projects",
  "/projects/earth",
  "/projects/cafe-belle",
];
const EXPORT_DIR = path.join(process.cwd(), "static-export");
let serverProcess;

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function buildRemixApp() {
  console.log("🏗  Building Remix app with `remix vite:build`...");
  await runCommand("npx", ["remix", "vite:build"]);
}

async function startServer() {
  console.log("🚀 Starting Remix server on http://localhost:3000...");
  serverProcess = spawn("npx", ["remix-serve", "build/server/index.js"], {
    stdio: "pipe",
    env: { ...process.env, PORT: "3000" },
  });

  return new Promise((resolve, reject) => {
    let serverStarted = false;

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      console.log("[server]", msg);
      if (msg.includes("[remix-serve] http://localhost:3000")) {
        serverStarted = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[server error]", data.toString());
    });

    serverProcess.on("close", (code) => {
      if (!serverStarted) {
        reject(new Error(`Remix server closed prematurely with code ${code}`));
      }
    });
  });
}

async function stopServer() {
  console.log("🛑 Stopping Remix server...");
  if (!serverProcess) return;

  await new Promise((resolve) => {
    kill(serverProcess.pid, "SIGTERM", (err) => {
      if (err) {
        console.error("Failed to kill Remix server with tree-kill:", err);
      } else {
        console.log("🛑 Remix server killed via tree-kill");
      }
      resolve();
    });
  });
}

async function fetchHTML(routePath) {
  const url = `http://localhost:3000${routePath}`;
  console.log(`   Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function exportRoutes() {
  console.log(`📂 Clearing output directory: ${EXPORT_DIR}`);
  await fs.remove(EXPORT_DIR);
  await fs.mkdir(EXPORT_DIR);

  console.log(`   Copying public/ => ${EXPORT_DIR}`);
  await fs.copy(path.join(process.cwd(), "public"), EXPORT_DIR);

  console.log("   Copying client assets => /assets");
  await fs.copy(
    path.join(process.cwd(), "build", "client", "assets"),
    path.join(EXPORT_DIR, "assets")
  );

  // ... copy flags/, images/ if exist ...

  for (const routePath of ROUTES_TO_EXPORT) {
    const html = await fetchHTML(routePath);
    const filePath =
      routePath === "/"
        ? path.join(EXPORT_DIR, "index.html")
        : path.join(EXPORT_DIR, routePath, "index.html");

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, html);
    console.log(`   Wrote: ${filePath}`);
  }

  console.log("✅ Static export complete!");
}

(async function main() {
  try {
    await buildRemixApp();
    await startServer();
    await exportRoutes();
  } catch (error) {
    console.error("Error during static export:", error);
    await stopServer();
    process.exit(1);
  }

  await stopServer();
  console.log("✅ Done. Exiting process.");
  process.exit(0); // <--- force exit if needed
})();
