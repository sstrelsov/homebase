// The tour's steps: each idea from the brainstorm, in a sentence, an example
// on the made-up players (sample.ts), and its picture. The examples are the
// sample's own numbers, so each matches the picture beside it.
import type { ReactNode } from "react";
import { formatDate } from "../../api";
import { LockScreen } from "../../IPhone";
import styles from "../../stached.module.css";
import { addDays } from "../rules";
import {
  Arrows,
  BestFive,
  BoardRace,
  CleanBonus,
  Freeze,
  GhostRace,
  HereNow,
  Leagues,
  PushSwitch,
  Rematch,
  StacheFive,
} from "./Ideas";
import { Rivals } from "./Rivals";
import { PlayerCard, Season, Titles } from "./Standings";
import type { TodayState } from "./sample";
import type { StepId } from "./search";
import { periods, type Sample, todayOf } from "./stats";
import { Bulletins, Podium, Timeline } from "./Today";

/** The brainstorm's order: the strongest three, then by kind. */
export const SECTIONS = [
  "Strongest",
  "Designs",
  "Push",
  "Multiplayer",
  "Mechanics",
] as const;

/** What building it takes, beyond the site. */
type Cost = "API" | "Migration" | "Push";

interface Step {
  /** One or two words. */
  title: string;
  section: (typeof SECTIONS)[number];
  /** What it is, in one sentence. */
  what: string;
  /** It happening, on the made-up players. */
  example: string;
  cost: Cost[];
  /** Only if there is one, in a line. */
  risk?: string;
  /** The picture's day (everyone by default) and who's signed in (Marisol). */
  today?: TodayState;
  you?: string;
  Visual: (props: { sample: Sample }) => ReactNode;
}

/** "Thursday, October 8". */
const longDate = (date: string) =>
  formatDate(date, { weekday: "long", month: "long", day: "numeric" });

/** A day from today, as the lock screen shows it. */
const dayFrom = (sample: Sample, days = 0) =>
  longDate(addDays(todayOf(sample).date, days));

/** Juniper's card, open, as a tap on the name shows it. */
const CardVisual = ({ sample }: { sample: Sample }) => (
  <div className="space-y-5 px-1">
    <h2 className={`${styles.title} text-lg`}>Juniper</h2>
    <div className={`${styles.stripes} -mt-2 w-28`} />
    <PlayerCard sample={sample} name="Juniper" />
  </div>
);

export const STEP: Record<StepId, Step> = {
  seasons: {
    title: "Seasons",
    section: "Strongest",
    what: "Points start over every Monday, and last week's champ is crowned on top.",
    example: "Juniper won last week with 8. This week, Hazel has 5 so far.",
    cost: ["API"],
    risk: "Cat's pin crowns Cat weekly",
    Visual: Season,
  },
  cards: {
    title: "Player cards",
    section: "Strongest",
    what: "Tap any name for their streaks, best stache and your record against them.",
    example: "Juniper: 12 in a row, best stache 0:42.7. You 6, Juniper 12.",
    cost: ["API"],
    Visual: CardVisual,
  },
  dethroned: {
    title: "Dethroned",
    section: "Strongest",
    what: "When someone takes today's fastest stache, whoever held it gets a push.",
    example:
      "Cat staches in 0:38.5 at 11:12pm, so Priya and Hazel each get this.",
    cost: ["API", "Migration", "Push"],
    risk: "Never to everyone: that's spam",
    you: "Hazel",
    Visual: ({ sample }) => (
      <LockScreen
        title="Dethroned"
        time="11:12 PM"
        day={dayFrom(sample)}
        line="Cat just stached in 0:38.5. Today's fastest stache is Cat's now."
      />
    ),
  },
  podium: {
    title: "Podium",
    section: "Designs",
    what: "Today's three fastest staches on a podium, everyone's lives, and who's left.",
    example:
      "At 1:05pm, Priya and Hazel share first at 0:41.2, and Theo's mid-game.",
    cost: ["API"],
    today: "some",
    Visual: Podium,
  },
  timeline: {
    title: "Timeline",
    section: "Designs",
    what: "Today from the push to now, with a stop for every finished game.",
    example:
      "Juniper's first in at 9:21am. Cat takes the fastest stache at 11:12pm.",
    cost: ["API"],
    risk: "Shows when people play",
    Visual: Timeline,
  },
  rivals: {
    title: "Rivals",
    section: "Designs",
    what: "The players just ahead of you and just behind, and your record against everyone.",
    example:
      "Theo's 2 points ahead, Hazel 5 behind. Juniper beats you most, 12 to 6.",
    cost: ["API"],
    Visual: Rivals,
  },
  titles: {
    title: "Titles",
    section: "Designs",
    what: "Weekly titles for being best at one thing, worn under names.",
    example:
      "Bea is Clean shave, with 5 solves and no mistakes. Cat is Night owl.",
    cost: ["API"],
    risk: "Shows when people play",
    Visual: Titles,
  },
  bulletins: {
    title: "Bulletins",
    section: "Designs",
    what: "Today's news, newest first, and each line a push it could send.",
    example: "11:12pm, Cat: takes the fastest stache from Priya and Hazel.",
    cost: ["API"],
    Visual: Bulletins,
  },
  switch: {
    title: "Race pushes",
    section: "Push",
    what: "One switch in settings for every push but the daily puzzle's.",
    example: "Wendell turns off Race pushes and still gets the 9:12 puzzle.",
    cost: ["API", "Migration"],
    you: "Wendell",
    Visual: PushSwitch,
  },
  weekly: {
    title: "Weekly results",
    section: "Push",
    what: "Sunday at 9pm, everyone who played that week hears who won.",
    example: "Week 40: Juniper wins with 8, and Marisol ties for #4.",
    cost: ["API", "Migration", "Push"],
    Visual: ({ sample }) => (
      <LockScreen
        title="Week 40: Juniper wins"
        time="9:00 PM"
        day={longDate(periods(sample.days).week.before.at(-1)?.date ?? "")}
        line="8 points. You tied for #4, with 4."
      />
    ),
  },
  streak: {
    title: "Streak saver",
    section: "Push",
    what: "Three hours before a puzzle stops counting, a push to anyone it would cost a streak of 3 or more.",
    example:
      "Theo has 3 in a row and pauses #21 mid-game. If it's still open at 6:12am, Theo gets this.",
    cost: ["API", "Migration", "Push"],
    risk: "Can nag: long streaks only",
    today: "some",
    you: "Theo",
    Visual: ({ sample }) => (
      <LockScreen
        title="Your streak ends at 9:12"
        time="6:12 AM"
        day={dayFrom(sample, 1)}
        line="3 in a row so far. Puzzle #21 is still open."
      />
    ),
  },
  passed: {
    title: "Passed",
    section: "Push",
    what: "A push when someone passes you in the standings.",
    example: "Bea's solve at 10:05am passes Wendell for #4.",
    cost: ["API", "Migration", "Push"],
    risk: "Several a day: cap at one",
    you: "Wendell",
    Visual: ({ sample }) => (
      <LockScreen
        title="Bea passed you"
        time="10:05 AM"
        day={dayFrom(sample)}
        line="Bea's #4 now. You're #5, a point behind."
      />
    ),
  },
  morning: {
    title: "Yesterday",
    section: "Push",
    what: "The 9:12 push adds yesterday's fastest stache when the puzzle has no line of its own.",
    example:
      "Friday's push: Puzzle #22 is up, and Thursday's fastest was Cat's 0:38.5.",
    cost: ["API"],
    Visual: ({ sample }) => (
      <LockScreen
        number={todayOf(sample).number + 1}
        day={dayFrom(sample, 1)}
        line="Yesterday's fastest stache: Cat, in 0:38.5."
      />
    ),
  },
  digest: {
    title: "Digest",
    section: "Push",
    what: "At 9pm, one push to anyone who played: how the day went.",
    example:
      "By 9pm 7 have played, Hazel and Priya are fastest, and Marisol is #7.",
    cost: ["API", "Migration", "Push"],
    risk: "A second daily push: opt in",
    Visual: ({ sample }) => (
      <LockScreen
        title="Today on Stached"
        time="9:00 PM"
        day={dayFrom(sample)}
        line="7 played. Hazel and Priya fastest, in 0:41.2. You're #7."
      />
    ),
  },
  "your-move": {
    title: "Your move",
    section: "Push",
    what: "Pick one rival, and get a push when they play.",
    example: "Marisol picks Theo, who solves #21 at 2:10pm.",
    cost: ["API", "Migration", "Push"],
    risk: "One rival each, or it's spam",
    Visual: ({ sample }) => (
      <LockScreen
        title="Theo just played"
        time="2:10 PM"
        day={dayFrom(sample)}
        line="Solved, with a 1:04.0 stache. Your move."
      />
    ),
  },
  ghost: {
    title: "Ghost race",
    section: "Multiplayer",
    what: "A late game still never counts, but shows where you'd have placed.",
    example: "Ozzie plays #7 late in 0:50.7, faster than anyone that day.",
    cost: ["API"],
    you: "Ozzie",
    Visual: GhostRace,
  },
  rematch: {
    title: "Rematch",
    section: "Multiplayer",
    what: "Challenge someone to a past puzzle neither of you played, scored between you two.",
    example: "Hazel challenges Marisol to #12 and solves it in 0:47.3.",
    cost: ["API", "Migration", "Push"],
    Visual: Rematch,
  },
  "stache-five": {
    title: "Stache-five",
    section: "Multiplayer",
    what: "Tap Gerald on someone's result to send a stache-five.",
    example: "Three players stache-five Cat's 0:38.5.",
    cost: ["API", "Migration"],
    risk: "A push per tap is spam",
    Visual: StacheFive,
  },
  leagues: {
    title: "Leagues",
    section: "Multiplayer",
    what: "Smaller boards inside the game, like Family or Work, joined by a code.",
    example: "Marisol is #7 of 10 on the whole board, and #2 in Family.",
    cost: ["API", "Migration"],
    risk: "Splits ~10 players: not yet",
    Visual: Leagues,
  },
  "here-now": {
    title: "Here now",
    section: "Multiplayer",
    what: "A live dot beside anyone on Stached right now.",
    example: "At 1:05pm, Theo's mid-game and Wendell has the app open.",
    cost: ["API"],
    risk: "AGENTS.md rules out tracking",
    today: "some",
    Visual: HereNow,
  },
  arrows: {
    title: "Arrows",
    section: "Mechanics",
    what: "Places since yesterday, as an arrow beside each name.",
    example: "Juniper passes Priya today, so Priya shows ▼1.",
    cost: ["API"],
    Visual: Arrows,
  },
  "best-five": {
    title: "Best five",
    section: "Mechanics",
    what: "A week counts each player's best five days of seven, so two days off cost nothing.",
    example: "Last week, Juniper's 8 becomes 6 and Priya wins with 7.",
    cost: ["API"],
    risk: "Less simple scoring",
    Visual: BestFive,
  },
  freeze: {
    title: "Streak freeze",
    section: "Mechanics",
    what: "One missed day a week doesn't break a streak.",
    example: "Juniper's one miss, #9, is frozen: 20 in a row, not 12.",
    cost: ["API"],
    risk: "Streaks mean less",
    Visual: Freeze,
  },
  board: {
    title: "Board race",
    section: "Mechanics",
    what: "A second race each day: the fastest whole board, beside the fastest stache.",
    example:
      "Cat has today's fastest stache, 0:38.5. Hazel has the fastest board, 3:18.",
    cost: ["API"],
    risk: "Two races to explain",
    Visual: BoardRace,
  },
  clean: {
    title: "Clean bonus",
    section: "Mechanics",
    what: "A point more for every solve with no mistakes.",
    example: "Bea's 15 clean solves take Bea from #4 to #2.",
    cost: ["API"],
    risk: "Changes the simple score",
    Visual: CleanBonus,
  },
};
