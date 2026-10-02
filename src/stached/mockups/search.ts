import type { TodayState } from "./sample";

/** What the mockups show, from the address: ?design=a&look=dark&today=none. */
export interface MockupSearch {
  design: "a" | "b" | "c" | "now";
  look: "light" | "dark";
  today: TodayState;
  days: 3 | 7;
}

/** The option that matches, or the first. */
const pick = <T extends string | number>(value: unknown, options: T[]) =>
  options.find((option) => String(option) === String(value)) ?? options[0];

export const parseMockupSearch = (
  search: Record<string, unknown>,
): MockupSearch => ({
  design: pick(search.design, ["a", "b", "c", "now"]),
  look: pick(search.look, ["light", "dark"]),
  today: pick(search.today, ["some", "none", "all"]),
  days: pick(search.days, [3, 7]),
});
