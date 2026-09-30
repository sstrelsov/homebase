import type { CSSProperties } from "react";
import { api, formatDate, formatTime, type Standing } from "./api";
import Screen from "./Screen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

/** "2026-09-29" → "9/29". */
const shortDate = (date: string) =>
  formatDate(date, { month: "numeric", day: "numeric" });

interface RecentProps {
  standing: Standing;
  dates: string[];
  /** The slowest recent time on the board, so every row shares one scale. */
  slowest: number;
}

/** Stache times on the last few puzzles: a bar per day, the time beneath. */
const Recent = ({ standing, dates, slowest }: RecentProps) => (
  <div
    className={styles.recent}
    style={{ "--days": dates.length } as CSSProperties}
  >
    {standing.recent.map((ms, i) => (
      <div
        key={dates[i]}
        className={styles.recentDay}
        role="img"
        aria-label={`${shortDate(dates[i])}: ${ms === null ? "no stache" : formatTime(ms)}`}
      >
        <div className={styles.recentBar}>
          {ms === null ? (
            <span className={styles.recentNone} />
          ) : (
            <span
              className={styles.recentFill}
              style={{ height: `${Math.max(8, (ms / slowest) * 100)}%` }}
            />
          )}
        </div>
        <span className={styles.recentValue}>
          {ms === null ? "—" : formatTime(ms, false)}
        </span>
      </div>
    ))}
  </div>
);

/** Everyone's streaks and stache times, ranked by streak, then best time. */
const Leaderboard = () => {
  const { session } = useStached();
  const { data: board, error, load } = useLoad(api.leaderboard);

  const slowest = Math.max(
    1,
    ...(board?.players.flatMap((p) => p.recent) ?? []).filter(
      (ms): ms is number => ms !== null,
    ),
  );
  const dates = board?.recentDates ?? [];

  return (
    <Screen
      title="Leaderboard"
      subtitle={
        dates.length > 0 && (
          <p className={styles.label}>
            Last {dates.length} {dates.length === 1 ? "puzzle" : "puzzles"} ·{" "}
            {shortDate(dates[0])}
            {dates.length > 1 && `–${shortDate(dates[dates.length - 1])}`}
          </p>
        )
      }
      error={error}
      onRetry={load}
      note="Streak: puzzles solved in a row. Today's puzzle doesn't break it until it's over. Bars are stache times: shorter is faster."
    >
      {board &&
        (board.players.length === 0 ? (
          <p className="text-[19px]">No one has played yet. Be the first!</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {board.players.map((standing, i) => (
              <li
                key={standing.name}
                className={styles.standing}
                data-me={standing.name === session.name || undefined}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className={`${styles.label} w-5 shrink-0`}>
                      {i + 1}
                    </span>
                    <span className={`${styles.display} truncate text-[15px]`}>
                      {standing.name}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className={styles.label}>Streak</span>
                    <span className={`${styles.stacheText} text-[17px]`}>
                      {standing.streak}
                    </span>
                  </span>
                </div>
                <dl className={styles.standingStats}>
                  <div>
                    <dt className={styles.label}>Best</dt>
                    <dd>{formatTime(standing.bestStacheMs)}</dd>
                  </div>
                  <div>
                    <dt className={styles.label}>Average</dt>
                    <dd>{formatTime(standing.avgStacheMs)}</dd>
                  </div>
                  <div>
                    <dt className={styles.label}>Solved</dt>
                    <dd>
                      {standing.solved}/{standing.games}
                    </dd>
                  </div>
                </dl>
                <Recent standing={standing} dates={dates} slowest={slowest} />
              </li>
            ))}
          </ol>
        ))}
    </Screen>
  );
};

export default Leaderboard;
