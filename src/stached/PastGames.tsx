import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  api,
  formatTime,
  nyToday,
  type PastGame,
  type Session,
} from "./api";
import { Mustache } from "./Logo";
import styles from "./stached.module.css";

/** "2026-09-29" → { day: "Tue", date: "Sep 29" }, as a calendar day. */
function calendar(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const when = new Date(year, month - 1, day);
  return {
    day: when.toLocaleDateString("en-US", { weekday: "short" }),
    date: when.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

type TileState = "unplayed" | "playing" | "stached" | "unstached";

function stateOf({ play }: PastGame): TileState {
  if (!play) return "unplayed";
  if (!play.finished) return "playing";
  return play.stachedMs === null ? "unstached" : "stached";
}

const Tile = ({ game, today }: { game: PastGame; today: string }) => {
  const { play } = game;
  const state = stateOf(game);
  const { day, date } = calendar(game.date);
  return (
    <Link
      to="/stached/$date"
      params={{ date: game.date }}
      className={styles.dayTile}
      data-state={state}
    >
      <span className="flex w-full items-baseline justify-between">
        <span className={styles.label}>#{game.number}</span>
        <span className={styles.label}>
          {game.date === today ? "Today" : day}
        </span>
      </span>
      <span className={`${styles.display} text-[17px]`}>{date}</span>
      <Mustache aria-hidden="true" className={styles.dayTileStache} />
      <span className={`${styles.display} text-[12px]`}>
        {state === "unplayed"
          ? "▶ Play"
          : state === "playing"
            ? "Resume"
            : formatTime(play?.stachedMs ?? null)}
      </span>
      <span className={`${styles.label} min-h-3`}>
        {play?.finished && (play.completed ? "✓ Solved" : "✗ Missed")}
        {play?.late && " · late"}
      </span>
    </Link>
  );
};

interface PastGamesProps {
  session: Session;
  onSignOut: () => void;
}

/** Every puzzle so far: your result and answers, or a way to play a missed day. */
const PastGames = ({ session, onSignOut }: PastGamesProps) => {
  const [games, setGames] = useState<PastGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.pastGames(session.token).then(setGames, (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onSignOut();
      else setError(err instanceof Error ? err.message : "Something broke");
    });
  }, [session.token, onSignOut]);

  useEffect(load, [load]);

  const today = nyToday();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <Link
          to="/stached"
          aria-label="Stached home"
          className={`${styles.title} -ml-1 py-2 pr-3 text-lg`}
        >
          Stached
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className={`${styles.title} text-[26px]`}>Past games</h1>
        <div className={`${styles.stripes} w-28`} />
      </div>

      {error ? (
        <button
          type="button"
          onClick={load}
          className={`${styles.label} ${styles.alert} text-left`}
        >
          {error}. Tap to retry
        </button>
      ) : !games ? (
        <p className={styles.label}>Loading…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <li key={game.date}>
              <Tile game={game} today={today} />
            </li>
          ))}
        </ul>
      )}

      <p className={`${styles.label} leading-relaxed`}>
        Tap a day to see your board and the answers, or to play a day you
        missed. Days played late count for you, but not toward streaks or the
        leaderboard.
      </p>
    </div>
  );
};

export default PastGames;
