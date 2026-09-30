// The link-preview card for Stached: the art in card/ (a browser draws it,
// see card/art.html) with today's puzzle number and date set in, a border in
// one of the logo's colors, and an old TV's phosphor columns over it all. A
// card only ever knows a puzzle's number and date: never its words.
import GLYPHS from "./card/glyphs.json";
import { decodePng, encodePng, type Picture } from "./png";

/**
 * The border colors, in turn: the logo's four bands, --c1 to --c4 at the top
 * of src/stached/stached.module.css.
 */
export const CARD_COLORS = {
  gold: "#ffd23f",
  orange: "#ff8c1a",
  red: "#ff3b2f",
  blue: "#3d5bff",
} as const;

export type CardColor = keyof typeof CARD_COLORS;

const COLOR_NAMES = Object.keys(CARD_COLORS) as CardColor[];

/** What a card may know about a puzzle. */
export interface CardPuzzle {
  number: number;
  date: string;
}

const art = (name: string) =>
  Bun.file(new URL(`./card/${name}`, import.meta.url)).bytes();
const BASE = decodePng(await art("base.png"));
const SHEET = decodePng(await art("glyphs.png"));

// The border: a lit tube just inside the edge, rounded like an old TV's glass.
const TUBE = { inset: 24, radius: 36, width: 10, glow: 16 };

// A bare date ("2026-09-30") reads as midnight UTC, so it's labeled in UTC.
const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** The card's line of text, as the game labels a puzzle: "#12 · WED, SEP 30". */
export const dayLine = ({ number, date }: CardPuzzle) =>
  `#${number} · ${DAY.format(new Date(date))}`.toUpperCase();

let turn = 0;
/** The border colors in turn, so each fetch of a card gets the next one. */
export const nextColor = () => COLOR_NAMES[turn++ % COLOR_NAMES.length];

// Light added over the dark: brightens, never darkens.
const screen = (a: number, b: number) => a + b - (a * b) / 255;

function drawTube({ data, width, height }: Picture, color: CardColor) {
  const hex = CARD_COLORS[color];
  const rgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const halfWidth = width / 2 - TUBE.inset - TUBE.radius;
  const halfHeight = height / 2 - TUBE.inset - TUBE.radius;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // How far this pixel is from the tube's core: the distance to a
      // rounded rectangle, less half the tube.
      const qx = Math.abs(x + 0.5 - width / 2) - halfWidth;
      const qy = Math.abs(y + 0.5 - height / 2) - halfHeight;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const edge =
        Math.abs(outside + Math.min(Math.max(qx, qy), 0) - TUBE.radius) -
        TUBE.width / 2;
      if (edge > TUBE.glow * 6) continue;
      const tube = Math.min(Math.max(0.5 - edge, 0), 1);
      const glow = 0.6 * Math.exp(-Math.max(edge, 0) / TUBE.glow);
      const light = Math.max(tube, glow);
      const i = (y * width + x) * 3;
      for (let k = 0; k < 3; k++)
        data[i + k] = screen(data[i + k], rgb[k] * light);
    }
}

/**
 * Sets a line in the day's letters from the glyph sheet, centered. glyphs.json
 * has each letter's advance, its cell on the sheet (and where its pen and line
 * start), and the day's line on the card: centered on x, its top at y.
 */
function drawLine({ data, width }: Picture, line: string) {
  const { chars, advances, cell, day } = GLYPHS;
  const glyphs = [...line].map((char) => {
    const index = chars.indexOf(char);
    if (index < 0) throw new Error(`No glyph for "${char}"`);
    return index;
  });
  let pen = day.x - glyphs.reduce((sum, i) => sum + advances[i], 0) / 2;
  for (const index of glyphs) {
    const left = (index % cell.perRow) * cell.w;
    const top = Math.floor(index / cell.perRow) * cell.h;
    const x0 = Math.round(pen) - cell.x;
    const y0 = day.y - cell.lineTop;
    for (let y = 0; y < cell.h; y++)
      for (let x = 0; x < cell.w; x++) {
        const from = ((top + y) * SHEET.width + left + x) * 3;
        const to = ((y0 + y) * width + x0 + x) * 3;
        for (let k = 0; k < 3; k++)
          data[to + k] = screen(data[to + k], SHEET.data[from + k]);
      }
    pen += advances[index];
  }
}

/**
 * An old TV over everything, as the site draws it (.crt in
 * stached.module.css): a dark phosphor column every 3px, and dim corners.
 */
function crt({ data, width, height }: Picture) {
  const rx = (width / 2) * Math.SQRT2;
  const ry = (height / 2) * Math.SQRT2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const t = Math.hypot(
        (x + 0.5 - width / 2) / rx,
        (y + 0.5 - height / 2) / ry,
      );
      const corner = 0.6 * Math.min(Math.max((t - 0.55) / 0.45, 0), 1);
      const dim = (1 - corner) * (x % 3 === 0 ? 0.76 : 1);
      const i = (y * width + x) * 3;
      for (let k = 0; k < 3; k++) data[i + k] *= dim;
    }
}

// The cards drawn for the current day, one per color: the card is public and
// never cached downstream, so a flood of fetches doesn't mean a flood of
// drawing.
let drawn = { line: "", cards: new Map<CardColor, Uint8Array<ArrayBuffer>>() };

/** A puzzle's card, as a PNG. */
export function renderCard(puzzle: CardPuzzle, color: CardColor) {
  const line = dayLine(puzzle);
  if (drawn.line !== line) drawn = { line, cards: new Map() };
  let png = drawn.cards.get(color);
  if (!png) {
    const card = { ...BASE, data: BASE.data.slice() };
    drawTube(card, color);
    drawLine(card, line);
    crt(card);
    png = encodePng(card);
    drawn.cards.set(color, png);
  }
  return png;
}
