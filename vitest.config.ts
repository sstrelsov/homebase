import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.mts";

export default defineConfig(
  mergeConfig(
    viteConfig,
    defineConfig({
      test: {
        exclude: ["packages/template/*"],
      },
    })
  )
);
