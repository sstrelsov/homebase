import {
  api,
  type Leaderboard as Board,
  formatDate,
  formatTime,
  type Mark,
} from "./api";
import { Mustache } from "./Logo";
import Screen from "./Screen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

const MARKS: Record<Mark, string> = {
  won: "Solved, with the fastest stache",
  "won-missed": "Missed, with the fastest stache",
  solved: "Solved",
  missed: "Missed",
  none: "Not finished on its day",
  open: "Still to play",
};

/** A day: green solved, red missed, Gerald on the day's fastest stache. */
const Square = ({ mark }: { mark: Mark }) => (
  <span
    className={styles.mark}
    data-mark={mark}
    role="img"
    aria-label={MARKS[mark]}
    title={MARKS[mark]}
  >
    {mark === "won" || mark === "won-missed" ? (
      <Mustache className={styles.markStache} />
    ) : (
      mark === "none" && "·"
    )}
  </span>
);

/** Today's fastest stache, in a gold box. Ties share it. */
const FastestToday = ({ board }: { board: Board }) => {
  const { session } = useStached();
  const today = board.days.at(-1);
  if (!today) return null;
  return (
    <div className={`${styles.stacheBox} flex flex-col gap-1 p-3`}>
      <p className={styles.label}>
        Fastest stache today · #{today.number} ·{" "}
        {formatDate(today.date, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </p>
      {board.fastestToday.length > 0 ? (
        board.fastestToday.map((fastest) => (
          <p
            key={fastest.name}
            className={`flex items-center gap-3 text-[22px] leading-tight ${
              fastest.name === session.name ? styles.me : ""
            }`}
          >
            <Square mark={fastest.solved ? "won" : "won-missed"} />
            <span className="flex-1 truncate">{fastest.name}</span>
            <span className={styles.stacheText}>
              {formatTime(fastest.stachedMs)}
            </span>
          </p>
        ))
      ) : (
        <p className="text-[19px]">Still up for grabs.</p>
      )}
    </div>
  );
};

/** The score, without words: a green square is a point, and so is Gerald. */
const PointKey = () => (
  <p className={styles.pointKey}>
    <span>
      <Square mark="solved" />
      +1
    </span>
    <span>
      <Mustache className={styles.pointKeyStache} />
      <span className="sr-only">Fastest stache</span>
      +1
    </span>
  </p>
);

/** The week: a row per player, a square per day, and their points. */
const Week = ({ board: { days, players } }: { board: Board }) => {
  const { session } = useStached();
  return (
    <section className="flex flex-col gap-3">
      {/* The key goes under the title if it can't fit beside it. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 whitespace-nowrap">
        <h2 className={`${styles.display} text-[15px]`}>This week</h2>
        <PointKey />
      </div>
      {players.length === 0 ? (
        <p className="text-[19px]">
          No one has finished a puzzle this week. Be the first!
        </p>
      ) : (
        <div>
          <div className={`${styles.standingHead} ${styles.rule}`}>
            <span />
            <span />
            <span className={styles.week}>
              {days.map((day, i) => (
                <span
                  key={day.date}
                  className={styles.weekday}
                  data-today={i === days.length - 1 || undefined}
                >
                  {formatDate(day.date, { weekday: "short" }).slice(0, 2)}
                </span>
              ))}
            </span>
            <span className={`${styles.label} text-right`}>Pts</span>
          </div>
          <ol>
            {players.map((player) => (
              <li
                key={player.name}
                className={`${styles.standing} ${styles.rule} ${
                  player.name === session.name ? styles.me : ""
                }`}
              >
                <span className="opacity-50">{player.rank}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[18px] leading-tight">
                    {player.name}
                  </span>
                  {player.streak >= 2 && (
                    <span
                      className={`${styles.label} ${styles.stacheText} whitespace-nowrap`}
                    >
                      {player.streak} in a row
                    </span>
                  )}
                </span>
                <span className={styles.week}>
                  {player.marks.map((mark, i) => (
                    <Square key={days[i].date} mark={mark} />
                  ))}
                </span>
                <span
                  className={`${styles.points} ${styles.stacheText}`}
                  title={`${player.solved} solved, ${player.fastest} fastest`}
                >
                  {player.points}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

/**
 * Today's fastest stache, then the last week's puzzles: a point for each solve
 * and each fastest stache.
 */
const Leaderboard = () => {
  const { data: board, error, load } = useLoad(api.leaderboard);
  return (
    <Screen title="Leaderboard" error={error} onRetry={load}>
      {board && (
        <div className="flex flex-col gap-6">
          <FastestToday board={board} />
          <Week board={board} />
        </div>
      )}
    </Screen>
  );
};

export default Leaderboard;
