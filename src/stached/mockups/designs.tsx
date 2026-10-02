import { type CSSProperties, Fragment, type ReactNode } from "react";
import { formatDate, formatTime } from "../api";
import { Mustache } from "../Logo";
import Screen from "../Screen";
import { useStached } from "../session";
import styles from "../stached.module.css";
import x from "./mockups.module.css";
import {
  byPoints,
  byWeek,
  type Mark,
  type Player,
  today,
  type Week,
} from "./sample";

const noop = () => {};

const MARK_LABELS: Record<Mark, string> = {
  won: "Won",
  solved: "Solved",
  missed: "Missed",
  open: "To play",
  none: "Didn't play",
};

/** One day in a player's week. */
const Day = ({ mark, children }: { mark: Mark; children?: ReactNode }) => (
  <span className={x.day} data-mark={mark} title={MARK_LABELS[mark]}>
    {children ??
      {
        won: <Mustache />,
        solved: "✓",
        missed: "✗",
        open: null,
        none: "·",
      }[mark]}
  </span>
);

/** A titled part of the screen, with a note on the right. */
const Section = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={`${styles.display} text-[15px]`}>{title}</h2>
      {note && <p className={styles.label}>{note}</p>}
    </div>
    {children}
  </section>
);

type Ranked = Player & { rank: number };

interface DayTableProps {
  week: Week;
  rows: Ranked[];
  /** Each day's cell for a row, oldest first. */
  days: (row: Ranked) => ReactNode[];
  totalLabel: string;
  total: (row: Ranked) => ReactNode;
}

/** A row per player: rank, name, a cell per day and a total. */
const DayTable = ({ week, rows, days, totalLabel, total }: DayTableProps) => {
  const { session } = useStached();
  const style = { "--days": week.dates.length } as CSSProperties;
  return (
    <div style={style}>
      <div className={`${x.row} ${x.head} ${styles.rule}`}>
        <span />
        <span />
        <span className={x.days}>
          {week.dates.map((date, i) => (
            <span
              key={date}
              className={x.dayHead}
              data-today={i === week.dates.length - 1 || undefined}
            >
              {formatDate(date, { weekday: "narrow" })}
            </span>
          ))}
        </span>
        <span className={`${styles.label} text-right`}>{totalLabel}</span>
      </div>
      <ol>
        {rows.map((row) => (
          <li
            key={row.name}
            className={`${x.row} ${styles.rule} ${
              row.name === session.name ? styles.me : ""
            }`}
          >
            <span className="opacity-50">{row.rank}</span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[18px] leading-tight">
                {row.name}
              </span>
              {row.streak >= 2 && (
                <span className={`${styles.label} ${styles.stacheText}`}>
                  {row.streak} in a row
                </span>
              )}
            </span>
            <span className={x.days}>{days(row)}</span>
            <span className={`${x.total} ${styles.stacheText}`}>
              {total(row)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const Legend = ({ marks }: { marks: Mark[] }) => (
  <p className={x.legend}>
    {marks.map((mark) => (
      <span key={mark}>
        <Day mark={mark} />
        {MARK_LABELS[mark]}
      </span>
    ))}
  </p>
);

/** The week by puzzles solved: the table designs A and C share. */
const SolvedTable = ({ week }: { week: Week }) => (
  <>
    <DayTable
      week={week}
      rows={byWeek(week.players)}
      days={(row) =>
        row.marks.map((mark, i) => <Day key={week.dates[i]} mark={mark} />)
      }
      totalLabel="✓"
      total={(row) => row.solved}
    />
    <Legend marks={["won", "solved", "missed", "none", "open"]} />
    <p className={x.note}>
      Most puzzles solved, then most wins, then fastest stache on a solved
      puzzle, then most played. A win is the day's fastest stache among those
      who solved it.
    </p>
  </>
);

/** Today's date: "Fri, Oct 2". */
const todayDate = ({ dates }: Week) =>
  formatDate(dates[dates.length - 1], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** Today's games, like the results scoreboard, solvers first. */
const TodayBoard = ({ week }: { week: Week }) => {
  const { session } = useStached();
  const { scores, toPlay } = today(week);
  return (
    <>
      {scores.length === 0 ? (
        <p className="text-[19px]">No one has finished today's puzzle yet.</p>
      ) : (
        <ol className="text-[19px] leading-tight">
          {scores.map((score) => (
            <li
              key={score.name}
              className={`flex items-center gap-3 py-1.5 ${styles.rule} ${
                score.name === session.name ? styles.me : ""
              }`}
            >
              <span className="w-6 shrink-0">
                {score.won ? (
                  <Day mark="won" />
                ) : (
                  score.completed && (
                    <span className="opacity-50">{score.rank}</span>
                  )
                )}
              </span>
              <span className="flex-1 truncate">{score.name}</span>
              <span className={score.completed ? styles.stacheText : x.note}>
                {formatTime(score.stachedMs)}
              </span>
              <span className="w-6 text-right" title="Solved the board">
                {score.completed ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {toPlay.length > 0 && (
        <p className={x.note}>
          <span className={styles.label}>Still to play </span>
          {toPlay.map(({ name, playing }, i) => (
            <Fragment key={name}>
              {i > 0 && ", "}
              <span className={name === session.name ? styles.me : undefined}>
                {name}
              </span>
              {playing && " (playing)"}
            </Fragment>
          ))}
        </p>
      )}
    </>
  );
};

/** A: today's games, then the week by puzzles solved. */
export const TodayAndWeek = ({ week }: { week: Week }) => (
  <Screen title="Leaderboard" error={null} onRetry={noop}>
    <div className="flex flex-col gap-9">
      <Section title={`Today · #${week.number}`} note={todayDate(week)}>
        <TodayBoard week={week} />
      </Section>
      <Section title="This week" note={`Last ${week.dates.length} puzzles`}>
        <SolvedTable week={week} />
      </Section>
    </div>
  </Screen>
);

/** B: points for the week. */
export const Points = ({ week }: { week: Week }) => (
  <Screen
    title="Leaderboard"
    subtitle={
      <p className={styles.label}>Points · last {week.dates.length} puzzles</p>
    }
    error={null}
    onRetry={noop}
  >
    <div className="flex flex-col gap-3">
      <DayTable
        week={week}
        rows={byPoints(week.players)}
        days={(row) =>
          row.points.map((points, i) => (
            <Day key={week.dates[i]} mark={row.marks[i]}>
              {points}
            </Day>
          ))
        }
        totalLabel="Pts"
        total={(row) => row.total}
      />
      <p className={x.note}>
        Solve 2 and the stache 1, so a solve is 3. A miss that found the stache
        is 1. The day's win, its fastest stache among the solvers, is +1, in
        gold.
      </p>
    </div>
  </Screen>
);

/** D's day: green for a solve, red for a miss, Gerald on green for the win. */
const Fill = ({ mark }: { mark: Mark }) => (
  <span className={x.fill} data-mark={mark} title={MARK_LABELS[mark]}>
    {mark === "won" ? <Mustache /> : mark === "none" && "·"}
  </span>
);

/** Today's fastest stache among the solvers, in a gold box, won like `Cell`. */
const FastestToday = ({
  week,
  Cell,
}: {
  week: Week;
  Cell: (props: { mark: Mark }) => ReactNode;
}) => {
  const { scores, toPlay } = today(week);
  const winner = scores.find((score) => score.won);
  return (
    <div className={`${styles.stacheBox} flex flex-col gap-1 p-3`}>
      <p className={styles.label}>
        Fastest today · #{week.number} · {todayDate(week)}
      </p>
      {winner ? (
        <p className="flex items-center gap-3 text-[22px] leading-tight">
          <Cell mark="won" />
          <span className="flex-1 truncate">{winner.name}</span>
          <span className={styles.stacheText}>
            {formatTime(winner.stachedMs)}
          </span>
        </p>
      ) : (
        <p className="text-[19px]">No one has solved it yet.</p>
      )}
      <p className={x.note}>
        {scores.length} finished · {toPlay.length} still to play
      </p>
    </div>
  );
};

/** C: one table, with today's fastest above it. */
export const OneTable = ({ week }: { week: Week }) => (
  <Screen title="Leaderboard" error={null} onRetry={noop}>
    <div className="flex flex-col gap-6">
      <FastestToday week={week} Cell={Day} />
      <Section title="This week" note={`Last ${week.dates.length} puzzles`}>
        <SolvedTable week={week} />
      </Section>
    </div>
  </Screen>
);

/** D: C in green and red, with nothing to explain. */
export const Simple = ({ week }: { week: Week }) => (
  <Screen title="Leaderboard" error={null} onRetry={noop}>
    <div className={`${x.simple} flex flex-col gap-6`}>
      <FastestToday week={week} Cell={Fill} />
      <Section title="This week" note={`Last ${week.dates.length} puzzles`}>
        <DayTable
          week={week}
          rows={byWeek(week.players)}
          days={(row) =>
            row.marks.map((mark, i) => <Fill key={week.dates[i]} mark={mark} />)
          }
          totalLabel="✓"
          total={(row) => row.solved}
        />
      </Section>
    </div>
  </Screen>
);
