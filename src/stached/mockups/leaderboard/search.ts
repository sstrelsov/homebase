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
