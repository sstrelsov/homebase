// The tour's pictures for ideas with no design of their own: the race
// pushes switch, light multiplayer and scoring mechanics, each a small piece
// of the game on the made-up players (sample.ts).
import { useState } from "react";
import {
  type Day,
  leaderboardOf,
  type Mark,
  WEEK,
} from "../../../../stached-api/leaderboard";
import { formatTime } from "../../api";
import { FastestToday, PointKey, Square } from "../../Leaderboard";
import { Mustache } from "../../Logo";
import styles from "../../stached.module.css";
import admin from "../mockups.module.css";
import { dayName } from "../rules";
import x from "./leaderboard.module.css";
import { Lives, Section, Squares, Streak, Table, WeekHead } from "./parts";
import { Moved, periods } from "./Standings";
import type { Play } from "./sample";
import {
  byTime,
  cardOf,
  finished,
  type Sample,
  standingsOver,
  stillToPlay,
  todayOf,
  todays,
} from "./stats";
import { todayMarks } from "./Today";

/** Settings, with the race pushes on a switch of their own. */
export const PushSwitch = () => {
  const [on, setOn] = useState({ puzzle: true, race: true });
  const rows = [
    ["puzzle", "Daily puzzle"],
    ["race", "Race pushes"],
  ] as const;
  return (
    <Section title="Notifications">
      <div className="flex flex-col gap-4 text-[19px]">
        {rows.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on[key]}
            onClick={() => setOn({ ...on, [key]: !on[key] })}
            className={styles.toggleRow}
          >
            {label}
            <span aria-hidden="true" className={styles.switch} />
          </button>
        ))}
      </div>
      <p className={styles.label}>Race pushes: dethroned, passed, results</p>
    </Section>
  );
};

/**
 * Your best late game, placed among the games that counted that day: where
 * you'd have been. It still never counts.
 */
export const GhostRace = ({ sample }: { sample: Sample }) => {
  const counted = finished(sample.plays);
  const fasterThan = (play: Play) =>
    counted.filter(
      (g) =>
        g.puzzleId === play.puzzleId && byTime(g.stachedMs, play.stachedMs) < 0,
    ).length;
  const [ghost] = sample.plays
    .filter((p) => p.late && p.name === sample.me && p.stachedMs !== null)
    .sort((a, b) => fasterThan(a) - fasterThan(b));
  if (!ghost) return null;
  const day = sample.days.find((d) => d.id === ghost.puzzleId) as Day;
  const games = counted
    .filter((g) => g.puzzleId === ghost.puzzleId)
    .sort((a, b) => byTime(a.stachedMs, b.stachedMs));
  const fastest = games[0]?.stachedMs;
  const mark = (game: Play): Mark =>
    game.stachedMs === fastest
      ? game.completed
        ? "won"
        : "won-missed"
      : game.completed
        ? "solved"
        : "missed";
  const place = fasterThan(ghost);
  const rows = [...games.slice(0, place), ghost, ...games.slice(place)].slice(
    0,
    4,
  );
  return (
    <Section
      title={`#${day.number} · ${dayName(day.date)}`}
      aside="Played late"
    >
      <p className="text-[22px] leading-tight">
        You'd have been <span className={styles.stacheText}>#{place + 1}</span>
      </p>
      <ol>
        {rows.map((game, i) => (
          <li
            key={game.name}
            className={`${x.finisher} ${styles.rule} ${
              game === ghost ? `${x.ghost} ${styles.me}` : ""
            }`}
          >
            <span className="opacity-50">{i + 1}</span>
            {game === ghost ? (
              <Square mark="open" />
            ) : (
              <Square mark={mark(game)} />
            )}
            <span className="truncate">{game.name}</span>
            <Lives mistakes={game.mistakes} bonus={game.stachedMs !== null} />
            <span className={`${styles.stacheText} text-right`}>
              {formatTime(game.stachedMs)}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
};

/** Who the rematch is against, and their made-up time on it. */
const CHALLENGER = { name: "Hazel", stachedMs: 47_300 };

/**
 * A challenge to a past puzzle neither of you played: both games are late,
 * so they're scored only between you two.
 */
export const Rematch = ({ sample }: { sample: Sample }) => {
  const played = new Set(
    sample.plays
      .filter((g) => g.name === sample.me || g.name === CHALLENGER.name)
      .map((g) => g.puzzleId),
  );
  const day = sample.days.slice(0, -1).findLast((d) => !played.has(d.id));
  if (!day) return null;
  return (
    <div className={`${styles.panel} flex flex-col gap-4 p-4`}>
      <p className={styles.label}>
        Rematch · #{day.number} · {dayName(day.date)}
      </p>
      <p className="text-[22px] leading-tight">
        {CHALLENGER.name} challenges you
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className={x.side}>
          <p className={styles.label}>{CHALLENGER.name}</p>
          <p className="flex items-center gap-2 text-[19px]">
            <Square mark="solved" />
            <span className={styles.stacheText}>
              {formatTime(CHALLENGER.stachedMs)}
            </span>
          </p>
        </div>
        <div className={x.side}>
          <p className={styles.label}>You</p>
          <p className="flex items-center gap-2 text-[19px]">
            <Square mark="open" />
            Not yet
          </p>
        </div>
      </div>
      <button type="button" className={`${styles.button} ${styles.primary}`}>
        Play #{day.number}
      </button>
    </div>
  );
};

/** Stache-fives already sent, fastest first: made up. */
const FIVES = [3, 2, 1, 0];

/** Today's fastest staches, each with Gerald to tap: a stache-five. */
export const StacheFive = ({ sample }: { sample: Sample }) => {
  const [mine, setMine] = useState<Set<string>>(new Set());
  const marks = todayMarks(sample);
  const games = todays(sample)
    .filter((g) => g.stachedMs !== null)
    .sort((a, b) => byTime(a.stachedMs, b.stachedMs))
    .slice(0, FIVES.length);
  const toggle = (name: string) => {
    const next = new Set(mine);
    if (!next.delete(name)) next.add(name);
    setMine(next);
  };
  return (
    <Section title="Today" aside="Tap Gerald">
      <ol>
        {games.map((game, i) => (
          <li key={game.name} className={`${x.five} ${styles.rule}`}>
            <Square mark={marks.get(game.name) ?? "solved"} />
            <span className="truncate">{game.name}</span>
            <span className={styles.stacheText}>
              {formatTime(game.stachedMs)}
            </span>
            <button
              type="button"
              aria-pressed={mine.has(game.name)}
              aria-label={`Stache-five ${game.name}`}
              onClick={() => toggle(game.name)}
              className={x.fiveButton}
            >
              <Mustache />
              {FIVES[i] + Number(mine.has(game.name))}
            </button>
          </li>
        ))}
      </ol>
    </Section>
  );
};

/** Made-up leagues inside the one game, and the codes that join them. */
const LEAGUES = {
  Everyone: null,
  Family: { code: "FAM482", members: ["Marisol", "Theo", "Hazel", "Ozzie"] },
  Work: {
    code: "WRK115",
    members: ["Marisol", "Juniper", "Priya", "Bea", "Wendell"],
  },
} as const;

type League = keyof typeof LEAGUES;

/** The board for one league: the same rules, on its members' games. */
export const Leagues = ({ sample }: { sample: Sample }) => {
  const [league, setLeague] = useState<League>("Family");
  const joined = LEAGUES[league];
  const board = joined
    ? leaderboardOf(
        sample.days,
        sample.plays.filter((g) =>
          (joined.members as readonly string[]).includes(g.name),
        ),
      )
    : sample.board;
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className={x.periods}>
        {(Object.keys(LEAGUES) as League[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={league === id}
            data-on={league === id || undefined}
            onClick={() => setLeague(id)}
            className={admin.tab}
          >
            {id}
          </button>
        ))}
      </div>
      <Section
        title={league}
        aside={joined ? `Code ${joined.code}` : undefined}
      >
        <Table
          rows={board.players.map((player) => ({
            ...player,
            sub: <Streak streak={player.streak} />,
          }))}
          head={<WeekHead days={board.days} />}
          middle={(player) => <Squares marks={player.marks} />}
        />
      </Section>
    </div>
  );
};

/** Who has Stached open right now: made up, since the game never tracks it. */
const HERE = ["Wendell"];

/** Who's still to play, with a live dot for anyone on Stached right now. */
export const HereNow = ({ sample }: { sample: Sample }) => (
  <Section title="Still to play">
    <ol>
      {stillToPlay(sample).map(({ name, playing }) => (
        <li key={name} className={`${x.here} ${styles.rule}`}>
          <Square mark="open" />
          <span className="truncate">{name}</span>
          {playing ? (
            <span className={styles.label}>Playing</span>
          ) : (
            HERE.includes(name) && <span className={x.live}>Here now</span>
          )}
        </li>
      ))}
    </ol>
  </Section>
);

/** The board as it is, with each player's places since yesterday. */
export const Arrows = ({ sample }: { sample: Sample }) => (
  <Section title="Standings" aside={<PointKey />}>
    <Table
      rows={standingsOver(sample, sample.days).map((player) => ({
        ...player,
        tag: <Moved by={player.moved} />,
        sub: <Streak streak={player.streak} />,
      }))}
      head={<WeekHead days={sample.board.days} />}
      middle={(player) => <Squares marks={player.marks} />}
    />
  </Section>
);

/** A day's points: one for a solve, one for the fastest stache. */
const pointsOf = (mark: Mark) =>
  Number(mark === "won" || mark === "solved") +
  Number(mark === "won" || mark === "won-missed");

/** The days a week counts: each player's best five of seven. */
const COUNTED = 5;

/**
 * Last week, on each player's best five days: the other two (faded) don't
 * count. Ties share a place.
 */
export const BestFive = ({ sample }: { sample: Sample }) => {
  const days = periods(sample.days).week.before;
  const scored = leaderboardOf(days, sample.plays)
    .players.map((player) => {
      const dropped = new Set(
        player.marks
          .map((_, i) => i)
          .sort((a, b) => pointsOf(player.marks[a]) - pointsOf(player.marks[b]))
          .slice(0, WEEK - COUNTED),
      );
      const points = player.marks.reduce(
        (sum, mark, i) => (dropped.has(i) ? sum : sum + pointsOf(mark)),
        0,
      );
      return { ...player, dropped, was: player.points, points };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const rows = scored.map((row) => ({
    ...row,
    rank: scored.findIndex((r) => r.points === row.points) + 1,
    sub: row.was !== row.points && (
      <span className={styles.label}>Was {row.was}</span>
    ),
  }));
  return (
    <Section title="Last week" aside={`Best ${COUNTED} of ${WEEK}`}>
      <Table
        rows={rows}
        head={<WeekHead days={days} past />}
        middle={(row) => (
          <span className={styles.week}>
            {row.marks.map((mark, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: days never reorder
                key={i}
                className={row.dropped.has(i) ? x.dropped : undefined}
              >
                <Square mark={mark} />
              </span>
            ))}
          </span>
        )}
      />
    </Section>
  );
};

/** Whose streak the freeze saves. */
const FROZEN = "Juniper";

/**
 * A player's every puzzle so far, a week to a row, with one miss frozen: the
 * streak runs through it. One is all Juniper needs; the rule is one a week.
 */
export const Freeze = ({ sample }: { sample: Sample }) => {
  const { marks, streak } = cardOf(sample, FROZEN);
  const days = sample.days.map((day, i) => ({ id: day.id, mark: marks[i] }));
  // From today back: solves count, the first miss is frozen, the next ends it.
  let frozen: number | null = null;
  let run = 0;
  for (const { id, mark } of days.toReversed()) {
    if (mark === "open") continue;
    if (mark === "won" || mark === "solved") run++;
    else if (frozen === null) frozen = id;
    else break;
  }
  const weeks = Array.from({ length: days.length / WEEK }, (_, w) =>
    days.slice(w * WEEK, (w + 1) * WEEK),
  );
  return (
    <Section title={FROZEN} aside={<Streak streak={run} />}>
      <div className="flex flex-col items-center gap-1">
        <WeekHead days={sample.board.days} />
        {weeks.map((week) => (
          <span key={week[0].id} className={styles.week}>
            {week.map(({ id, mark }) =>
              id === frozen ? (
                <span
                  key={id}
                  role="img"
                  aria-label="Missed, and frozen: the streak goes on"
                  className={x.frozen}
                >
                  ❄︎
                </span>
              ) : (
                <Square key={id} mark={mark} />
              ),
            )}
          </span>
        ))}
      </div>
      <p className={styles.label}>Without the freeze: {streak} in a row</p>
    </Section>
  );
};

/** Today's fastest stache as it is, then a second race: the fastest board. */
export const BoardRace = ({ sample }: { sample: Sample }) => {
  const solves = todays(sample).filter((g) => g.solveMs !== null);
  const best = Math.min(...solves.map((g) => g.solveMs as number));
  const winners = solves.filter((g) => g.solveMs === best);
  return (
    <div className="flex flex-col gap-4">
      <FastestToday board={sample.board} />
      <div className={`${styles.stacheBox} flex flex-col gap-1 p-3`}>
        <p className={styles.label}>
          Fastest board today · #{todayOf(sample).number}
        </p>
        {winners.length > 0 ? (
          winners.map((game) => (
            <p
              key={game.name}
              className="flex items-center gap-3 text-[22px] leading-tight"
            >
              <Square mark="solved" />
              <span className="flex-1 truncate">{game.name}</span>
              <span className={styles.stacheText}>
                {formatTime(game.solveMs, false)}
              </span>
            </p>
          ))
        ) : (
          <p className="text-[19px]">Still up for grabs.</p>
        )}
      </div>
    </div>
  );
};

/**
 * The board with a point more for each solve with no mistakes, and each
 * player's places from it. Cat stays first, pinned as on the leaderboard.
 */
export const CleanBonus = ({ sample }: { sample: Sample }) => {
  const games = finished(sample.plays);
  const scored = sample.board.players
    .map((player) => {
      const clean = games.filter(
        (g) => g.name === player.name && g.completed && g.mistakes === 0,
      ).length;
      return {
        ...player,
        clean,
        was: player.rank,
        points: player.points + clean,
      };
    })
    .sort(
      (a, b) =>
        Number(b.name === "Cat") - Number(a.name === "Cat") ||
        b.points - a.points ||
        a.name.localeCompare(b.name),
    );
  const rows = scored.map((row) => {
    const rank = scored.findIndex((r) => r.points === row.points) + 1;
    return {
      ...row,
      rank,
      tag: <Moved by={row.was - rank} />,
      sub: <span className={styles.label}>+{row.clean} clean</span>,
    };
  });
  return (
    <Section
      title="Standings"
      aside={
        <div className="flex items-center gap-3">
          <PointKey />
          <span className={x.cleanKey}>Clean +1</span>
        </div>
      }
    >
      <Table
        rows={rows}
        head={<WeekHead days={sample.board.days} />}
        middle={(row) => <Squares marks={row.marks} />}
      />
    </Section>
  );
};
