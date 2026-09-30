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

/** Days from a puzzle's date to today in New York, where the puzzle day turns. */
function daysAgo(date: string) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  return Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
}

/** "Today", "Yesterday", then the weekday; the date sits right under it. */
function dayName(game: PastGame) {
  if (game.today) return "Today";
  if (daysAgo(game.date) === 1) return "Yesterday";
  return formatDate(game.date, { weekday: "long" });
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
      <span className={styles.label}>{dayName(game)}</span>
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
      <span className={`${styles.label} h-4 leading-4`}>
        {play?.finished && (play.completed ? "✓ Solved" : "✗ Missed")}
      </span>
    </Link>
  );
};

/** Every puzzle so far: your result and answers, or a way to play a missed day. */
const PastGames = () => {
  const { data: games, error, load } = useLoad(api.pastGames);

  return (
    <Screen title="Past games" error={error} onRetry={load}>
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
