import type { ReactNode } from "react";
import type { Day } from "../../../../stached-api/leaderboard";
import { plural } from "../../Admin";
import { type Mark, weekday } from "../../api";
import { Square } from "../../Leaderboard";
import { Mustache } from "../../Logo";
import Screen from "../../Screen";
import { useStached } from "../../session";
import styles from "../../stached.module.css";
import { addDays, dayName } from "../rules";
import x from "./leaderboard.module.css";

const noop = () => {};

/** The leaderboard's screen, as every design starts. */
export const Board = ({
  subtitle,
  children,
}: {
  subtitle?: ReactNode;
  children: ReactNode;
}) => (
  <Screen title="Leaderboard" subtitle={subtitle} error={null} onRetry={noop}>
    {children}
  </Screen>
);

/** "Today · #21 · Thu, Oct 8", under the title. */
export const TodayLine = ({ day }: { day: Day }) => (
  <p className={styles.label}>
    Today · #{day.number} · {dayName(day.date)}
  </p>
);

/** A titled part of the screen, with a key or a note on the right (or under). */
export const Section = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 whitespace-nowrap">
      <h2 className={`${styles.display} text-[15px]`}>{title}</h2>
      {typeof aside === "string" ? (
        <span className={styles.label}>{aside}</span>
      ) : (
        aside
      )}
    </div>
    {children}
  </section>
);

/** "12 in a row" under a name, from two on, as the leaderboard has it. */
export const Streak = ({ streak }: { streak: number }) =>
  streak >= 2 && (
    <span className={`${styles.label} ${styles.stacheText} whitespace-nowrap`}>
      {streak} in a row
    </span>
  );

/** Weekday heads, today's in gold, then any days of the week still to come. */
export const WeekHead = ({
  days,
  later = 0,
}: {
  days: Pick<Day, "date">[];
  later?: number;
}) => {
  const last = days.at(-1)?.date ?? "";
  const ahead = Array.from({ length: later }, (_, i) => addDays(last, i + 1));
  return (
    <span className={styles.week}>
      {days.map((day, i) => (
        <span
          key={day.date}
          className={styles.weekday}
          data-today={i === days.length - 1 || undefined}
        >
          {weekday(day.date)}
        </span>
      ))}
      {ahead.map((date) => (
        <span key={date} className={`${styles.weekday} opacity-50`}>
          {weekday(date)}
        </span>
      ))}
    </span>
  );
};

/** A row of squares, oldest first, then blanks for days still to come. */
export const Squares = ({
  marks,
  later = 0,
}: {
  marks: Mark[];
  later?: number;
}) => (
  <span className={styles.week}>
    {marks.map((mark, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: days never reorder
      <Square key={i} mark={mark} />
    ))}
    {Array.from({ length: later }, (_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: blanks, all alike
      <span key={i} className={x.later} />
    ))}
  </span>
);

/** A row of the standings. */
interface Row {
  name: string;
  rank: number;
  points: number;
  /** Beside the name: an arrow. */
  tag?: ReactNode;
  /** Under the name: a streak, titles. */
  sub?: ReactNode;
}

interface TableProps<T extends Row> {
  rows: T[];
  /** Over the middle column: weekdays, or what the counts are. */
  head: ReactNode;
  /** Each row's middle column: squares, or counts. */
  middle: (row: T) => ReactNode;
  /** Makes each row a button. */
  onPick?: (row: T) => void;
}

/** The standings, laid out as the leaderboard's: rank, name, middle, points. */
export function Table<T extends Row>({
  rows,
  head,
  middle,
  onPick,
}: TableProps<T>) {
  const { session } = useStached();
  return (
    <div>
      <div className={`${styles.standingHead} ${styles.rule}`}>
        <span />
        <span />
        {head}
        <span className={`${styles.label} text-right`}>Pts</span>
      </div>
      <ol>
        {rows.map((row) => {
          const className = `${styles.standing} ${styles.rule} ${
            row.name === session.name ? styles.me : ""
          }`;
          const cells = (
            <>
              <span className="opacity-50">{row.rank}</span>
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-baseline gap-1.5 text-[18px] leading-tight">
                  <span className="truncate">{row.name}</span>
                  {row.tag}
                </span>
                {row.sub}
              </span>
              {middle(row)}
              <span className={`${styles.points} ${styles.stacheText}`}>
                {row.points}
              </span>
            </>
          );
          return onPick ? (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => onPick(row)}
                className={`${className} ${x.pick}`}
              >
                {cells}
              </button>
            </li>
          ) : (
            <li key={row.name} className={className}>
              {cells}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Lives left at the end of a game, as the game's row of mustaches: filled for
 * each one left, hollow for each mistake. Solving the stache group adds one.
 */
export const Lives = ({
  mistakes,
  bonus,
}: {
  mistakes: number;
  bonus: boolean;
}) => (
  <span className={x.lives} role="img" aria-label={plural(mistakes, "mistake")}>
    {Array.from({ length: 4 + Number(bonus) }, (_, i) => (
      <Mustache
        // biome-ignore lint/suspicious/noArrayIndexKey: lives never reorder
        key={i}
        className={x.life}
        data-lost={i >= 4 + Number(bonus) - mistakes || undefined}
      />
    ))}
  </span>
);
