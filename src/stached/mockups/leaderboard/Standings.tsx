// The designs built on the standings: the board as it is, seasons, a card
// for each player, and titles.
import { useState } from "react";
import { type Day, WEEK } from "../../../../stached-api/leaderboard";
import { formatDate, formatTime } from "../../api";
import Dialog from "../../Dialog";
import {
  FastestToday,
  LeaderboardView,
  PointKey,
  Square,
} from "../../Leaderboard";
import { Mustache } from "../../Logo";
import styles from "../../stached.module.css";
import admin from "../mockups.module.css";
import x from "./leaderboard.module.css";
import { Board, Section, Squares, Streak, Table, WeekHead } from "./parts";
import {
  byTime,
  cardOf,
  championsOver,
  finished,
  headToHead,
  names,
  type Period,
  periods,
  type Sample,
  standingsOver,
  titlesOf,
} from "./stats";

/** The leaderboard as it is: the real component, on the made-up games. */
export const Now = ({ sample }: { sample: Sample }) => (
  <Board>
    <LeaderboardView board={sample.board} />
  </Board>
);

const short = (date: string) =>
  formatDate(date, { month: "short", day: "numeric" });

const monthName = (date: string) => formatDate(date, { month: "long" });

/** Places since yesterday: ▲2, ▼1, or New. */
export const Moved = ({ by }: { by: number | null }) =>
  by === null ? (
    <span className={x.moved}>New</span>
  ) : by !== 0 ? (
    <span className={x.moved} data-way={by > 0 ? "up" : "down"}>
      {by > 0 ? "▲" : "▼"}
      {Math.abs(by)}
    </span>
  ) : null;

/** Last week's or last month's champ, crowned, or the records for all time. */
const Champ = ({
  sample,
  period,
  before,
}: {
  sample: Sample;
  period: Period;
  before: Day[];
}) => {
  if (period === "all") return <Records sample={sample} />;
  const first = before[0];
  const champs = championsOver(sample, before);
  if (!first || champs.length === 0) return null;
  return (
    <div className={`${styles.stacheBox} flex flex-col gap-1 p-3`}>
      <p className={styles.label}>
        {period === "week"
          ? `Last week's champ · ${short(first.date)} – ${short((before.at(-1) as Day).date)}`
          : `${monthName(first.date)}'s champ`}
      </p>
      {champs.map((champ) => (
        <p
          key={champ.name}
          className="flex items-center gap-3 text-[22px] leading-tight"
        >
          <Mustache className={x.crown} />
          <span className="flex-1 truncate">{champ.name}</span>
          <span className={styles.stacheText}>{champ.points} pts</span>
        </p>
      ))}
    </div>
  );
};

/** The best ever: fastest stache, longest streak, most solves. */
const Records = ({ sample }: { sample: Sample }) => {
  const fastest = finished(sample.plays).reduce((a, b) =>
    byTime(b.stachedMs, a.stachedMs) < 0 ? b : a,
  );
  const cards = sample.board.players.map((p) => cardOf(sample, p.name));
  const top = (key: "best" | "solved") =>
    cards.reduce((a, b) => (b[key] > a[key] ? b : a));
  const number = sample.days.find((d) => d.id === fastest.puzzleId)?.number;
  const rows: [string, string, string][] = [
    [
      "Fastest stache",
      `${fastest.name} · #${number}`,
      formatTime(fastest.stachedMs),
    ],
    ["Longest streak", top("best").name, `${top("best").best} in a row`],
    ["Most solved", top("solved").name, String(top("solved").solved)],
  ];
  return (
    <div className={`${styles.stacheBox} flex flex-col gap-2 p-3`}>
      {rows.map(([label, who, what]) => (
        <div key={label}>
          <p className={styles.label}>{label}</p>
          <p className={x.record}>
            <span className="truncate">{who}</span>
            <span className={styles.stacheText}>{what}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

/** Season's counts, in place of the squares: solves, then fastest staches. */
const CountsHead = () => (
  <span className={x.counts}>
    <Square mark="solved" />
    <Mustache className={x.countStache} />
  </span>
);

/**
 * Seasons: points for this week (from Monday), this month, or all time, with
 * last time's champ on top and each player's places since yesterday.
 */
export const Season = ({ sample }: { sample: Sample }) => {
  const [period, setPeriod] = useState<Period>("week");
  const spans = periods(sample.days);
  const { now, before } = spans[period];
  // Streaks run across every puzzle, whatever the tab.
  const streaks = new Map(sample.board.players.map((p) => [p.name, p.streak]));
  const rows = standingsOver(sample, now).map((player) => ({
    ...player,
    tag: <Moved by={player.moved} />,
    sub: <Streak streak={streaks.get(player.name) ?? 0} />,
  }));
  const later = WEEK - now.length;
  const title = {
    week: "This week",
    month: monthName((now[0] as Day).date),
    all: "All time",
  }[period];
  return (
    <Board
      subtitle={
        <div role="tablist" className={x.periods}>
          {(
            [
              ["week", "Week"],
              ["month", "Month"],
              ["all", "All time"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              data-on={period === id || undefined}
              onClick={() => setPeriod(id)}
              className={admin.tab}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Champ sample={sample} period={period} before={before} />
        <Section title={title} aside={<PointKey />}>
          {period === "week" ? (
            <Table
              rows={rows}
              head={<WeekHead days={now} later={later} />}
              middle={(row) => <Squares marks={row.marks} later={later} />}
            />
          ) : (
            <Table
              rows={rows}
              head={<CountsHead />}
              middle={(row) => (
                <span className={`${x.counts} ${x.countValues}`}>
                  <span>{row.solved}</span>
                  <span>{row.fastest}</span>
                </span>
              )}
            />
          )}
        </Section>
      </div>
    </Board>
  );
};

/** Your record against someone, as a bar: yours green, theirs red. */
export const Versus = ({
  won,
  tied,
  lost,
}: {
  won: number;
  tied: number;
  lost: number;
}) => (
  <span className={x.versus} role="img" aria-label={`${won} to ${lost}`}>
    <span style={{ flex: won }} />
    <span style={{ flex: tied }} />
    <span style={{ flex: lost }} />
  </span>
);

/** "6–12", green when you lead and red when they do. */
export const Score = ({ won, lost }: { won: number; lost: number }) => (
  <span
    className={x.score}
    data-lead={won > lost ? "you" : won < lost ? "them" : undefined}
  >
    {won}–{lost}
  </span>
);

/**
 * A player's card: two weeks of squares, their numbers, and their record
 * against you.
 */
export const PlayerCard = ({
  sample,
  name,
}: {
  sample: Sample;
  name: string;
}) => {
  const card = cardOf(sample, name);
  const versus = headToHead(sample, sample.me, name);
  const stats: [string, string, string?][] = [
    [
      "Solved",
      `${card.solved}/${card.played}`,
      `${Math.round((card.solved / Math.max(card.played, 1)) * 100)}%`,
    ],
    ["Streak", String(card.streak), `Best ${card.best}`],
    ["Fastest", String(card.fastest), "Staches"],
    [
      "Best stache",
      formatTime(card.bestMs),
      `Avg ${formatTime(card.stacheMs)}`,
    ],
    ["Mistakes", (card.mistakes ?? 0).toFixed(1), "A game"],
    ["Board time", formatTime(card.solveMs, false), "A solve"],
  ];
  return (
    <>
      <p className={`${styles.label} -mt-3`}>
        #{card.rank} · {card.points} pts
        {card.late > 0 && ` · ${card.late} played late`}
      </p>
      <div className="flex flex-col items-center gap-1">
        <WeekHead days={sample.board.days} />
        <Squares marks={card.marks.slice(-2 * WEEK, -WEEK)} />
        <Squares marks={card.marks.slice(-WEEK)} />
      </div>
      <div className={x.stats}>
        {stats.map(([label, value, sub]) => (
          <div key={label} className={x.stat}>
            <p className={styles.label}>{label}</p>
            <p className={x.statValue}>{value}</p>
            {sub && <p className={x.note}>{sub}</p>}
          </div>
        ))}
      </div>
      {name !== sample.me && versus.shared > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className={styles.label}>You vs {name}</h3>
            <Score won={versus.won} lost={versus.lost} />
          </div>
          <Versus {...versus} />
        </section>
      )}
    </>
  );
};

/** The board as it is, but each name opens their card. */
export const Cards = ({ sample }: { sample: Sample }) => {
  const [open, setOpen] = useState<string | null>(null);
  const { board } = sample;
  return (
    <Board>
      <div className="flex flex-col gap-6">
        <FastestToday board={board} />
        <Section title="Standings" aside={<PointKey />}>
          <Table
            rows={board.players.map((player) => ({
              ...player,
              sub: <Streak streak={player.streak} />,
            }))}
            head={<WeekHead days={board.days} />}
            middle={(player) => <Squares marks={player.marks} />}
            onPick={(player) => setOpen(player.name)}
          />
        </Section>
      </div>
      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ?? ""}
      >
        {open && <PlayerCard sample={sample} name={open} />}
      </Dialog>
    </Board>
  );
};

/**
 * This week's titles, each a solved group's bar, then the standings with each
 * player's titles under their name.
 */
export const Titles = ({ sample }: { sample: Sample }) => {
  const titles = titlesOf(sample);
  const { board } = sample;
  return (
    <Board>
      <div className="flex flex-col gap-6">
        <Section title="Titles" aside={`Last ${WEEK} puzzles`}>
          <div className="flex flex-col gap-2">
            {titles.map((title) => (
              <div
                key={title.title}
                className={`${styles.bar} ${x.titleBar}`}
                data-color={title.color}
              >
                <span className={styles.barTitle}>
                  {title.title}
                  {title.holders.length > 0 && ` · ${title.stat}`}
                </span>
                <span className={styles.barWords}>
                  {title.holders.length > 0
                    ? names(title.holders)
                    : "Up for grabs"}
                </span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Standings" aside={<PointKey />}>
          <Table
            rows={board.players.map((player) => ({
              ...player,
              sub: (
                <span className={x.chips}>
                  {titles
                    .filter((title) => title.holders.includes(player.name))
                    .map((title) => (
                      <span
                        key={title.title}
                        className={x.chip}
                        data-color={title.color}
                      >
                        {title.short}
                      </span>
                    ))}
                </span>
              ),
            }))}
            head={<WeekHead days={board.days} />}
            middle={(player) => <Squares marks={player.marks} />}
          />
        </Section>
      </div>
    </Board>
  );
};
