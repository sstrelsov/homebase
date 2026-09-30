import { Link } from "@tanstack/react-router";
import { api, formatDate, formatTime, type PastGame } from "./api";
import { Mustache } from "./Logo";
import Screen from "./Screen";
import { useLoad } from "./session";
import styles from "./stached.module.css";

type TileState = "unplayed" | "playing" | "stached" | "unstached";

function stateOf({ play }: PastGame): TileState {
  if (!play) return "unplayed";
  if (!play.finished) return "playing";
  return play.stachedMs === null ? "unstached" : "stached";
}

const Tile = ({ game }: { game: PastGame }) => {
  const { play } = game;
  const state = stateOf(game);
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
          {game.today ? "Today" : formatDate(game.date, { weekday: "short" })}
        </span>
      </span>
      <span className={`${styles.display} text-[17px]`}>
        {formatDate(game.date, { month: "short", day: "numeric" })}
      </span>
      <Mustache aria-hidden="true" className={styles.dayTileStache} />
      <span className={`${styles.display} ${styles.dayTileValue} text-[12px]`}>
        {state === "unplayed"
          ? "▶\uFE0E Play"
          : state === "playing"
            ? "Resume"
            : formatTime(play?.stachedMs ?? null)}
      </span>
      <span className={`${styles.label} min-h-3`}>
        {[
          play?.finished && (play.completed ? "✓ Solved" : "✗ Missed"),
          play?.late && "late",
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </Link>
  );
};

/** Every puzzle so far: your result and answers, or a way to play a missed day. */
const PastGames = () => {
  const { data: games, error, load } = useLoad(api.pastGames);

  return (
    <Screen
      title="Past games"
      error={error}
      onRetry={load}
      note="Tap a day to see your board and the answers, or to play a day you missed. Days played late count for you, but not toward streaks or the leaderboard."
    >
      {games && (
        <ul className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <li key={game.date}>
              <Tile game={game} />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
};

export default PastGames;
