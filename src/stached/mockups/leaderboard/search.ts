// The leaderboard mockups' switches, from the address. Kept free of the sample
// data, so the router's import of it leaves nothing in a production build.
import type { Look } from "../../api";
import { pick } from "../search";
import type { TodayState } from "./sample";

/** The board as it is, then each idea, in the order the switcher steps. */
export const DESIGNS = [
  "now",
  "season",
  "card",
  "podium",
  "timeline",
  "rivals",
  "titles",
  "bulletins",
] as const;

export type DesignId = (typeof DESIGNS)[number];

/** Who the mockups sign in as: mid-table, the leader, and the newcomer. */
export const YOU = ["Marisol", "Juniper", "Hazel"] as const;

/** ?design=podium&today=all&you=Hazel&look=dark */
export interface LeaderboardSearch {
  design: DesignId;
  today: TodayState;
  you: (typeof YOU)[number];
  look: Look;
}

export const parseLeaderboardSearch = (
  search: Record<string, unknown>,
): LeaderboardSearch => ({
  design: pick(search.design, DESIGNS),
  today: pick<TodayState>(search.today, ["some", "all", "none"]),
  you: pick(search.you, YOU),
  look: pick<Look>(search.look, ["light", "dark"]),
});

/** The tour's steps, an idea each, in the order it walks them (steps.tsx). */
export const STEPS = [
  "seasons",
  "cards",
  "dethroned",
  "podium",
  "timeline",
  "rivals",
  "titles",
  "bulletins",
  "switch",
  "weekly",
  "streak",
  "passed",
  "morning",
  "digest",
  "your-move",
  "ghost",
  "rematch",
  "stache-five",
  "leagues",
  "here-now",
  "arrows",
  "best-five",
  "freeze",
  "board",
  "clean",
] as const;

export type StepId = (typeof STEPS)[number];

/** /tour?step=3&look=dark: steps count from 1. */
export interface TourSearch {
  step: number;
  look: Look;
}

export const parseTourSearch = (
  search: Record<string, unknown>,
): TourSearch => {
  const step = Number(search.step);
  return {
    step:
      Number.isInteger(step) && step >= 1 && step <= STEPS.length ? step : 1,
    look: pick<Look>(search.look, ["light", "dark"]),
  };
};
