/** Every screen and state the mockups show, in the order you'd meet them. */
export const SCREENS = [
  "runs",
  "paste",
  "organizing",
  "board",
  "word",
  "title",
  "shuffled",
  "problems",
  "too-many",
  "push",
  "saved",
  "confirm",
  "published",
  "live",
  "confirm-live",
] as const;

export type ScreenId = (typeof SCREENS)[number];

/** What the mockups show, from the address: ?screen=board&look=dark. */
export interface MockupSearch {
  screen: ScreenId;
  look: "light" | "dark";
}

/** The option that matches, or the first. */
const pick = <T extends string>(value: unknown, options: readonly T[]) =>
  options.find((option) => option === value) ?? options[0];

export const parseMockupSearch = (
  search: Record<string, unknown>,
): MockupSearch => ({
  screen: pick(search.screen, SCREENS),
  look: pick(search.look, ["light", "dark"]),
});
