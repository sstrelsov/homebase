#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs-extra";
import fetch from "node-fetch";
import path from "path";

const ROUTES_TO_EXPORT = [
  "/",
  "/bio",
  "/projects",
  "/projects/earth",
  "/projects/cafe-belle",
];
const EXPORT_DIR = path.join(process.cwd(), "static-export");

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

// We declare this at module level so we can reference it in stopServer.
let serverProcess;

async function startServer() {
  console.log("🚀 Starting Remix server on http://localhost:3000...");

  serverProcess = spawn("npx", ["remix-serve", "build/server/index.js"], {
    stdio: "pipe",
    env: { ...process.env, PORT: "3000" },
  });

  return new Promise((resolve, reject) => {
    let serverStarted = false;

    serverProcess.stdout.on("data", (data) => {
      const message = data.toString().trim();
      console.log("[server]", message);

      if (message.includes("[remix-serve] http://localhost:3000")) {
        serverStarted = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[server error]", data.toString());
    });

    serverProcess.on("close", (code) => {
      // If the server closed before we set `serverStarted = true`,
      // then we never got "http://localhost:3000" in stdout,
      // meaning it died early and we should reject.
      if (!serverStarted) {
        reject(new Error(`Remix server closed prematurely with code ${code}`));
      }
    });
  });
}

async function stopServer() {
  console.log("🛑 Stopping Remix server...");

  if (serverProcess) {
    // Send a SIGTERM (the default is SIGTERM anyway, but let's be explicit)
    serverProcess.kill("SIGTERM");

    // Wait for the 'close' event so we know the process is really done
    await new Promise((resolve) => {
      serverProcess.on("close", (code) => {
        console.log(`🛑 Remix server closed with code ${code}`);
        resolve();
      });
    });
  }
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

  // Copy the client assets => /assets
  const clientAssetsSrc = path.join(process.cwd(), "build", "client", "assets");
  const clientAssetsDest = path.join(EXPORT_DIR, "assets");
  console.log(`   Copying ${clientAssetsSrc} => ${clientAssetsDest}`);
  await fs.copy(clientAssetsSrc, clientAssetsDest);

  // Copy flags/ if exists
  const flagsSrc = path.join(process.cwd(), "build", "client", "flags");
  const flagsDest = path.join(EXPORT_DIR, "flags");
  if (await fs.pathExists(flagsSrc)) {
    console.log(`   Copying ${flagsSrc} => ${flagsDest}`);
    await fs.copy(flagsSrc, flagsDest);
  }

  // Copy images/ if exists
  const imagesSrc = path.join(process.cwd(), "build", "client", "images");
  const imagesDest = path.join(EXPORT_DIR, "images");
  if (await fs.pathExists(imagesSrc)) {
    console.log(`   Copying ${imagesSrc} => ${imagesDest}`);
    await fs.copy(imagesSrc, imagesDest);
  }

  // Fetch each route's HTML and save
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
    // If there's an error, we still want to attempt stopping the server
    await stopServer();
    process.exit(1);
  }

  // Finally, stop the server gracefully
  await stopServer();
})();
