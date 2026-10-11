import { getRouteApi, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StachedContext } from "../../session";
import styles from "../../stached.module.css";
import x from "../mockups.module.css";
import { Rivals } from "./Rivals";
import { Cards, Now, Season, Titles } from "./Standings";
import { DESIGNS, type DesignId, type LeaderboardSearch, YOU } from "./search";
import { type Sample, sampleOf } from "./stats";
import { Bulletins, Podium, Timeline } from "./Today";

const route = getRouteApi("/stached/leaderboard-mockups");

const noop = () => {};

// Each design: its name in the switcher, what it shows, and what it would
// take to build.
const NOTES: Record<DesignId, [string, string]> = {
  now: [
    "Now",
    "The leaderboard as it is: the real component and rules, on made-up players.",
  ],
  season: [
    "Season",
    "Week, Month and All time. The week starts over each Monday, with last week's champ on top; arrows are places since yesterday. API only: the same points on fewer puzzles.",
  ],
  card: [
    "Player card",
    "Tap a name: their last two weeks, solve rate, streaks, best stache, mistakes, board time, and your record against them. API only.",
  ],
  podium: [
    "Podium",
    "Today's race: the three fastest staches on a podium, everyone else with their lives left, and who's still to play before it stops counting. API only.",
  ],
  timeline: [
    "Timeline",
    "Today from the push to now: when each game finished, and the fastest stache changing hands. Shows when people play (kept already, never shown yet). API only.",
  ],
  rivals: [
    "Rivals",
    "The players either side of you, and your record against everyone: a solve beats a miss, then the faster stache. Switch You to see it from the top or the bottom. API only.",
  ],
  titles: [
    "Titles",
    "This week's titles as solved bars, worn under names. Early bird and Night owl use finish times. API only.",
  ],
  bulletins: [
    "Bulletins",
    "Today's news, newest first: who's in, the fastest stache changing hands, places gained, streaks. Each line is a push it could send. API only.",
  ],
};

const DESIGN: Record<DesignId, (props: { sample: Sample }) => ReactNode> = {
  now: Now,
  season: Season,
  card: Cards,
  podium: Podium,
  timeline: Timeline,
  rivals: Rivals,
  titles: Titles,
  bulletins: Bulletins,
};

type Options<K extends keyof LeaderboardSearch> = [
  LeaderboardSearch[K],
  string,
][];

// The switches under the design's name, each kept in the address.
const SWITCHES: {
  [K in "today" | "you" | "look"]: { label: string; options: Options<K> };
} = {
  today: {
    label: "Today",
    options: [
      ["none", "Nobody"],
      ["some", "Midday"],
      ["all", "Everyone"],
    ],
  },
  you: { label: "You", options: YOU.map((name) => [name, name]) },
  look: {
    label: "Look",
    options: [
      ["light", "Light"],
      ["dark", "Dark"],
    ],
  },
};

/** The switcher above the screen: back and forth, every design, the data. */
const Controls = ({ search }: { search: LeaderboardSearch }) => {
  const at = DESIGNS.indexOf(search.design);
  const step = (by: number) =>
    DESIGNS[(at + by + DESIGNS.length) % DESIGNS.length];
  const go = (
    to: Partial<LeaderboardSearch>,
    label: string,
    on: boolean,
    className = x.choice,
  ) => (
    <Link
      to="/stached/leaderboard-mockups"
      search={{ ...search, ...to }}
      replace
      className={className}
      data-on={on || undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className={x.controls}>
      <div className="flex items-center gap-2">
        {go({ design: step(-1) }, "‹", false, x.stepper)}
        <span className={`${styles.display} flex-1 text-center text-[13px]`}>
          {at + 1}/{DESIGNS.length} · {NOTES[search.design][0]}
        </span>
        {go({ design: step(1) }, "›", false, x.stepper)}
      </div>
      <p className={x.controlsNote}>{NOTES[search.design][1]}</p>
      <details>
        <summary className={styles.label}>Every design</summary>
        <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
          {DESIGNS.map((design) => (
            <span key={design}>
              {go({ design }, NOTES[design][0], design === search.design)}
            </span>
          ))}
        </div>
      </details>
      {(Object.keys(SWITCHES) as (keyof typeof SWITCHES)[]).map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-x-1">
          <span className={`${styles.label} w-[52px]`}>
            {SWITCHES[key].label}
          </span>
          {SWITCHES[key].options.map(([value, label]) => (
            <span key={value}>
              {go({ [key]: value }, label, search[key] === value)}
            </span>
          ))}
        </div>
      ))}
    </nav>
  );
};

/**
 * Leaderboard ideas, each a design on the same made-up players (sample.ts),
 * in the game's own frame and components. Dev only: no API, and a pretend
 * session as whoever You picks.
 */
const LeaderboardMockups = () => {
  const search = route.useSearch();
  const sample = sampleOf(search.today, search.you);
  const Design = DESIGN[search.design];
  return (
    <div data-look={search.look} className={styles.stached}>
      <div aria-hidden="true" className={styles.crt} />
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        <Controls search={search} />
        <StachedContext
          value={{
            session: { token: "mockup", name: search.you },
            signOut: noop,
            openRules: noop,
          }}
        >
          <Design sample={sample} />
        </StachedContext>
      </div>
    </div>
  );
};

export default LeaderboardMockups;
