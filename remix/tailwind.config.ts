import { nextui } from "@nextui-org/react";
import type { Config } from "tailwindcss";
const { screens } = require("tailwindcss/defaultTheme");

export default {
  content: [
    "./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    screens: {
      xs: "480px",
      ...screens,
    },
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "sans-serif"],
        special: "Special Elite",
        serif: ["IBM Plex Serif", "serif"],
        inter: ["Inter", "sans-serif"],
        code: [
          "source-code-pro",
          "Menlo",
          "Monaco",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [
    nextui(),
    require("@tailwindcss/typography"),
    require("tailwindcss-debug-screens"),
  ],
} satisfies Config;
