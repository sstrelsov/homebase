import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

// Absolute base for link-preview URLs. `make phone-preview` points it at this
// Mac so a phone can fetch the preview before the site is live.
const SITE = process.env.STACHED_SITE ?? "https://www.spencerstrelsov.com";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        /* jsxImportSource: …, otherOptions… */
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    viteTsconfigPaths(),
    svgr({
      include: "**/*.svg?react",
    }),
    {
      name: "spa-fallback",
      closeBundle() {
        const outDir = resolve(__dirname, "build");
        const index = resolve(outDir, "index.html");
        // 404.html for unknown routes
        copyFileSync(index, resolve(outDir, "404.html"));
        // Static copies for known routes so GitHub Pages returns 200
        for (const route of ["about", "projects"]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          copyFileSync(index, resolve(outDir, route, "index.html"));
        }
        // Stached is unlisted: noindex in the static HTML, before any JS runs,
        // plus its own title and preview card for when the link is shared.
        // A fingerprint in the image URL, so apps that cached an old card fetch
        // the new picture.
        const image = createHash("sha256")
          .update(readFileSync(resolve(__dirname, "public/images/stached-og.png")))
          .digest("hex")
          .slice(0, 8);
        const stached = `
    <meta name="robots" content="noindex, nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Stached" />
    <meta property="og:description" content="Got ’stache?" />
    <meta property="og:url" content="${SITE}/stached" />
    <meta property="og:image" content="${SITE}/images/stached-og.png?v=${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />`;
        mkdirSync(resolve(outDir, "stached"), { recursive: true });
        writeFileSync(
          resolve(outDir, "stached", "index.html"),
          readFileSync(index, "utf8")
            .replace("<head>", `<head>${stached}`)
            .replace(/<title>.*<\/title>/, "<title>Stached</title>")
            .replace(
              /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
              '<meta name="description" content="Got ’stache?" />',
            ),
        );
      },
    },
  ],
  build: {
    outDir: "build",
  },
  // Dev: /stached-api goes to a local Stached API, and Tailscale Serve may
  // front the dev server on a *.ts.net host (see `make phone`).
  server: {
    allowedHosts: [".ts.net"],
    proxy: {
      "/stached-api": {
        target: "http://localhost:3999",
        rewrite: (path) => path.replace(/^\/stached-api/, ""),
      },
    },
  },
});
