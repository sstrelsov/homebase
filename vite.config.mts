import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";

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
        const index = readFileSync(resolve(outDir, "index.html"), "utf8");
        // Every other route skips the landing page's headshot preload
        const html = index.replace(/\s*<!-- Headshot preload[\s\S]*?\/>/, "");
        // 404.html for unknown routes
        writeFileSync(resolve(outDir, "404.html"), html);
        // Static copies for known routes so GitHub Pages returns 200
        for (const route of ["about", "projects"]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          writeFileSync(resolve(outDir, route, "index.html"), html);
        }
        // Unlisted routes: noindex in the static HTML, before any JS runs
        for (const route of ["mustache"]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          writeFileSync(
            resolve(outDir, route, "index.html"),
            html.replace(
              "<head>",
              '<head>\n    <meta name="robots" content="noindex, nofollow" />',
            ),
          );
        }
      },
    },
  ],
  build: {
    outDir: "build",
  },
});
