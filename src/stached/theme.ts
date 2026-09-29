import { createContext } from "react";
import type { Color } from "./api";

export const THEMES = [
  {
    id: "arcade",
    name: "Arcade",
    blurb: "The original. Neon, pixels, a glowing CRT.",
  },
  {
    id: "broadcast",
    name: "1984",
    blurb: "A TV-station ident, late at night.",
  },
  {
    id: "daylight",
    name: "Daylight",
    blurb: "1984 in print, on cream paper.",
  },
] as const;

export type Theme = (typeof THEMES)[number]["id"];

export const ThemeContext = createContext<Theme>("arcade");

// Share grids in each theme's colors; the stache group is always Gerald.
const ARCADE_EMOJI = ["🟨", "🟩", "🟦", "🟪"];
const BROADCAST_EMOJI = ["🟨", "🟧", "🟥", "🟦"];

export function shareEmoji(theme: Theme, color: Color) {
  if (color === "stache") return "🥸";
  const set = theme === "arcade" ? ARCADE_EMOJI : BROADCAST_EMOJI;
  return set[Number(color) - 1];
}

// A per-device preference, so browser storage is enough.
const THEME_KEY = "stached.theme";

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.find((t) => t.id === saved)?.id ?? "arcade";
  } catch {
    return "arcade";
  }
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the theme lasts as long as the tab.
  }
}
