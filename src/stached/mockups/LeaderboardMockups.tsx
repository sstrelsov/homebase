import { getRouteApi, Link } from "@tanstack/react-router";
import { LeaderboardView } from "../Leaderboard";
import { StachedContext } from "../session";
import styles from "../stached.module.css";
import { OneTable, Points, Simple, TodayAndWeek } from "./designs";
import x from "./mockups.module.css";
import { currentBoard, ME, type ProdRows, prod, sample } from "./sample";
import type { MockupSearch } from "./search";

const route = getRouteApi("/stached/leaderboard-mockups");

// The real players, if fetch-prod.sh has copied them here (gitignored).
const PROD = Object.values(
  import.meta.glob<ProdRows>("./prod.local.json", {
    eager: true,
    import: "default",
  }),
)[0];

const noop = () => {};

const NOTES: Record<MockupSearch["design"], string> = {
  now: "The leaderboard as it is: by streak, then best stache time, losses included.",
  a: "A, recommended: today's games, then the week by puzzles solved.",
  b: "B: points for the week.",
  c: "C, simpler: today's fastest, then the week by puzzles solved.",
  d: "D, simplest: C with green for solved, red for missed, Gerald on green for the day's win.",
};

type Options<K extends keyof MockupSearch> = [MockupSearch[K], string][];

const CHOICES: {
  [K in keyof MockupSearch]: { label: string; options: Options<K> };
} = {
  design: {
    label: "Design",
    options: [
      ["now", "Now"],
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
      ["d", "D"],
    ],
  },
  data: {
    label: "Data",
    options: [
      ["prod", "Real"],
      ["sample", "Made up"],
    ],
  },
  today: {
    label: "Today",
    options: [
      ["none", "Nobody"],
      ["some", "Midday"],
      ["all", "Everyone"],
    ],
  },
  days: {
    label: "Puzzles",
    options: [
      [3, "3 so far"],
      [7, "Full week"],
    ],
  },
  look: {
    label: "Look",
    options: [
      ["light", "Light"],
      ["dark", "Dark"],
    ],
  },
};

/** Real players have a real today and only the puzzles out so far. */
const showChoice = (key: keyof MockupSearch, real: boolean) =>
  key === "data"
    ? Boolean(PROD)
    : !(real && (key === "today" || key === "days"));

/** The mockup's own switches, above the screen: each is in the address. */
const Controls = ({
  search,
  real,
}: {
  search: MockupSearch;
  real: boolean;
}) => (
  <nav className={x.controls}>
    {(Object.keys(CHOICES) as (keyof MockupSearch)[])
      .filter((key) => showChoice(key, real))
      .map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-x-2">
          <span className={`${styles.label} w-[60px]`}>
            {CHOICES[key].label}
          </span>
          {CHOICES[key].options.map(([value, text]) => (
            <Link
              key={text}
              to="/stached/leaderboard-mockups"
              search={{ ...search, [key]: value }}
              replace
              className={x.choice}
              data-on={search[key] === value || undefined}
            >
              {text}
            </Link>
          ))}
        </div>
      ))}
    <p className={x.note}>{NOTES[search.design]}</p>
  </nav>
);

/**
 * Leaderboard redesigns side by side, on made-up players (sample.ts) or the
 * real ones, in the game's own frame and components. Dev only: no API, and a
 * pretend session.
 */
const LeaderboardMockups = () => {
  const search = route.useSearch();
  const real = search.data === "prod" && PROD !== undefined;
  const week = real ? prod(PROD) : sample(search.today, search.days);
  return (
    <div data-look={search.look} className={styles.stached}>
      <div aria-hidden="true" className={styles.crt} />
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        <StachedContext
          value={{
            session: { token: "mockup", name: real ? "" : ME },
            signOut: noop,
            openRules: noop,
          }}
        >
          <Controls search={search} real={real} />
          {search.design === "now" && (
            <LeaderboardView
              board={currentBoard(week)}
              error={null}
              onRetry={noop}
            />
          )}
          {search.design === "a" && <TodayAndWeek week={week} />}
          {search.design === "b" && <Points week={week} />}
          {search.design === "c" && <OneTable week={week} />}
          {search.design === "d" && <Simple week={week} />}
        </StachedContext>
      </div>
    </div>
  );
};

export default LeaderboardMockups;
