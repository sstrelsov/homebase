const { nextui } = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Include your project's src folder for Tailwind scanning
  ],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
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
  plugins: [nextui(), require("@tailwindcss/typography")],
};
