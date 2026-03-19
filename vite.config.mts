import { copyFileSync, mkdirSync } from "node:fs";
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
        const index = resolve(outDir, "index.html");
        // 404.html for unknown routes
        copyFileSync(index, resolve(outDir, "404.html"));
        // Static copies for known routes so GitHub Pages returns 200
        for (const route of ["about", "projects"]) {
          mkdirSync(resolve(outDir, route), { recursive: true });
          copyFileSync(index, resolve(outDir, route, "index.html"));
        }
      },
    },
  ],
  build: {
    outDir: "build",
  },
});
