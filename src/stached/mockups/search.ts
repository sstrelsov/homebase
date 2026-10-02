import type { TodayState } from "./sample";

/** What the mockups show, from the address: ?design=d&look=dark&today=none. */
export interface MockupSearch {
  design: "d" | "a" | "b" | "c" | "now";
  /** Made-up players, or the real ones (fetch-prod.sh), if fetched. */
  data: "prod" | "sample";
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
  design: pick(search.design, ["d", "a", "b", "c", "now"]),
  data: pick(search.data, ["prod", "sample"]),
  look: pick(search.look, ["light", "dark"]),
  today: pick(search.today, ["some", "none", "all"]),
  days: pick(search.days, [3, 7]),
});
