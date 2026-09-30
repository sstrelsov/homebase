import { describe, expect, test } from "bun:test";
import {
  CARD_COLORS,
  type CardColor,
  dayLine,
  nextColor,
  renderCard,
} from "./card";
import glyphs from "./card/glyphs.json";
import { decodePng, encodePng, type Picture } from "./png";
import examples from "./puzzles.example.json";

const COLORS = Object.keys(CARD_COLORS) as CardColor[];
// The made-up sample puzzle, as its card sees it: #1, Thu, Jan 1.
const PUZZLE = { number: 1, date: examples[0].date };

/** A box of a card's pixels, as one string to compare. */
function box(card: Picture, x0: number, y0: number, x1: number, y1: number) {
  const { data, width } = card;
  const rows = [];
  for (let y = y0; y < y1; y++)
    rows.push(data.subarray((y * width + x0) * 3, (y * width + x1) * 3));
  return Buffer.concat(rows).toString("base64");
}

describe("a card", () => {
  const cards = Object.fromEntries(
    COLORS.map((color) => [color, decodePng(renderCard(PUZZLE, color))]),
  ) as Record<CardColor, Picture>;

  test("is the size the site's preview tags promise", () => {
    const { width, height } = cards.gold;
    expect([width, height]).toEqual([1200, 630]);
  });

  test("lights its border in its color", () => {
    for (const color of COLORS) {
      const { data, width } = cards[color];
      // The middle of the tube along the top, off a phosphor column.
      const i = (24 * width + 601) * 3;
      const lit = [...data.subarray(i, i + 3)];
      const hex = CARD_COLORS[color];
      const want = [1, 3, 5].map((j) =>
        Number.parseInt(hex.slice(j, j + 2), 16),
      );
      // The CRT dims it, so compare the mix of red, green and blue.
      const mix = (rgb: number[]) => rgb.map((c) => c / Math.max(...rgb));
      mix(lit).forEach((c, k) => {
        expect(c).toBeCloseTo(mix(want)[k], 1);
      });
    }
  });

  test("changes nothing but the border between colors", () => {
    const inside = (color: CardColor) => box(cards[color], 150, 130, 1050, 500);
    for (const color of COLORS) expect(inside(color)).toBe(inside("gold"));
    const top = (color: CardColor) => box(cards[color], 0, 0, 1200, 60);
    expect(new Set(COLORS.map(top)).size).toBe(COLORS.length);
  });

  test("sets the puzzle's number and date, and only there", () => {
    const next = decodePng(
      renderCard({ number: 2, date: "2026-01-02" }, "gold"),
    );
    const line = (card: Picture) => box(card, 300, 440, 900, 530);
    expect(line(next)).not.toBe(line(cards.gold));
    expect(box(next, 0, 0, 1200, 440)).toBe(box(cards.gold, 0, 0, 1200, 440));
  });

  test("is drawn once per day and color", () => {
    expect(renderCard(PUZZLE, "red")).toBe(renderCard(PUZZLE, "red"));
  });

  test("has a letter for every day it can show", () => {
    const needed = new Set<string>();
    for (
      let day = Date.UTC(2026, 0, 1);
      day < Date.UTC(2033, 0, 1);
      day += 864e5
    )
      for (const char of dayLine({
        number: 1234567890,
        date: new Date(day).toISOString().slice(0, 10),
      }))
        needed.add(char);
    for (const char of needed) expect(glyphs.chars).toContain(char);
  });
});

test("the day's line reads like the game's labels", () => {
  expect(dayLine(PUZZLE)).toBe("#1 · THU, JAN 1");
  expect(dayLine({ number: 12, date: "2026-09-30" })).toBe("#12 · WED, SEP 30");
});

test("the border takes the colors in turn, never the same twice running", () => {
  const turns = Array.from({ length: COLORS.length * 2 }, nextColor);
  expect(new Set(turns.slice(0, COLORS.length)).size).toBe(COLORS.length);
  turns.slice(1).forEach((color, i) => {
    expect(color).not.toBe(turns[i]);
  });
});

test("the border colors are the site's palette", async () => {
  const css = await Bun.file(
    new URL("../src/stached/stached.module.css", import.meta.url),
  ).text();
  COLORS.forEach((color, i) => {
    expect(css).toContain(`--c${i + 1}: ${CARD_COLORS[color]};`);
  });
});

test("a picture survives a round trip through PNG", () => {
  const picture = {
    width: 3,
    height: 2,
    data: Uint8Array.from({ length: 18 }, (_, i) => (i * 47) % 256),
  };
  expect(decodePng(encodePng(picture))).toEqual(picture);
});
