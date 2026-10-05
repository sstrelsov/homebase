import { type ReactNode, useState } from "react";
import {
  type AdminGame,
  type AdminPuzzle,
  api,
  formatDate,
  formatTime,
} from "./api";
import GuessGrid from "./GuessGrid";
import Screen from "./Screen";
import { useLoad } from "./session";
import styles from "./stached.module.css";

const puzzleTitle = ({ number, date }: AdminPuzzle) =>
  `#${number} · ${formatDate(date, { weekday: "short", month: "short", day: "numeric" })}`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The parts that apply, between dots. */
const dotted = (...parts: (string | false)[]) =>
  parts.filter(Boolean).join(" · ");

/** Solved first, then by fewest mistakes; late games last. */
const byResult = (a: AdminGame, b: AdminGame) =>
  Number(a.late) - Number(b.late) ||
  Number(b.completed) - Number(a.completed) ||
  a.mistakes - b.mistakes;

/** One finished game: whose (or which puzzle), how it went, and its grid. */
const GameLine = ({ title, game }: { title: string; game: AdminGame }) => (
  <li className={styles.game}>
    <div className="flex min-w-0 flex-col gap-2">
      <span className={`${styles.display} break-words text-[15px]`}>
        {title}
      </span>
      <span className={styles.label}>
        {game.completed ? "✓ Solved" : "✗ Missed"} ·{" "}
        {game.mistakes === 0 ? "No mistakes" : plural(game.mistakes, "mistake")}
      </span>
      {game.stachedMs === null ? (
        <span className={styles.label}>No stache</span>
      ) : (
        <span className="flex items-baseline gap-2">
          <span className={styles.label}>Stache</span>
          <span
            className={`${styles.display} ${styles.stacheText} text-[15px]`}
          >
            {formatTime(game.stachedMs)}
          </span>
        </span>
      )}
      {game.late && <span className={styles.label}>Played late</span>}
      {game.homeScreen !== null && (
        <span className={styles.label}>
          {game.homeScreen ? "Home screen" : "Website"} ·{" "}
          {game.dark ? "Dark mode" : "Light mode"}
        </span>
      )}
      {game.afterPush && (
        <span className={styles.label}>Within 15 min of the push</span>
      )}
    </div>
    <GuessGrid grid={game.grid} className="shrink-0" />
  </li>
);

interface RowProps {
  title: string;
  detail: string;
  /** The game cards it opens to; none says so. */
  children: ReactNode[];
}

/**
 * A row that opens to show its games, one to a line. They mount only while it's
 * open, since every game appears twice, under its puzzle and its player.
 */
const Row = ({ title, detail, children }: RowProps) => {
  const [open, setOpen] = useState(false);
  return (
    <details
      className={styles.disclosure}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="flex min-w-0 flex-col gap-2">
          <span className={`${styles.display} break-words text-[16px]`}>
            {title}
          </span>
          <span className={styles.label}>{detail}</span>
        </span>
      </summary>
      {open &&
        (children.length > 0 ? (
          <ul className="px-4">{children}</ul>
        ) : (
          <p className={`${styles.label} ${styles.game} mx-4`}>
            No finished games yet
          </p>
        ))}
    </details>
  );
};

/**
 * For the admin: how many play, and how each puzzle went. Open a puzzle to see
 * everyone's grid for it, or a player to see theirs across puzzles.
 */
const Admin = () => {
  const { data: stats, error, load } = useLoad(api.admin);

  const players = new Map<string, { puzzle: AdminPuzzle; game: AdminGame }[]>();
  for (const puzzle of stats?.puzzles ?? [])
    for (const game of puzzle.games)
      players.set(game.name, [
        ...(players.get(game.name) ?? []),
        { puzzle, game },
      ]);
  const names = [...players.keys()].sort((a, b) => a.localeCompare(b));
  const homeScreen = new Set(stats?.homeScreen);

  return (
    <Screen title="Admin" error={error} onRetry={load}>
      {stats && (
        <div className="flex flex-col gap-8">
          <dl className={styles.totals}>
            <div>
              <dt className={styles.label}>Players</dt>
              <dd>{stats.players}</dd>
            </div>
            <div>
              <dt className={styles.label}>This week</dt>
              <dd>{stats.playedThisWeek}</dd>
            </div>
            <div>
              <dt className={styles.label}>Notified</dt>
              <dd>{stats.notifications}</dd>
            </div>
            <div>
              <dt className={styles.label}>Home screen</dt>
              <dd>{homeScreen.size}</dd>
            </div>
          </dl>

          <section className="flex flex-col gap-3">
            <h2 className={styles.label}>Puzzles</h2>
            {stats.puzzles.map((puzzle) => (
              <Row
                key={puzzle.date}
                title={puzzleTitle(puzzle)}
                detail={dotted(
                  `${puzzle.played} played`,
                  `${puzzle.solved} solved`,
                  puzzle.late > 0 && `${puzzle.late} late`,
                  puzzle.afterPush > 0 &&
                    `${puzzle.afterPush} within 15 min of the push`,
                )}
              >
                {[...puzzle.games].sort(byResult).map((game) => (
                  <GameLine key={game.name} title={game.name} game={game} />
                ))}
              </Row>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={styles.label}>Players</h2>
            {names.map((name) => {
              const games = players.get(name) ?? [];
              return (
                <Row
                  key={name}
                  title={name}
                  detail={dotted(
                    plural(games.length, "game"),
                    `${games.filter(({ game }) => game.completed).length} solved`,
                    homeScreen.has(name) && "Home screen",
                  )}
                >
                  {games.map(({ puzzle, game }) => (
                    <GameLine
                      key={puzzle.date}
                      title={puzzleTitle(puzzle)}
                      game={game}
                    />
                  ))}
                </Row>
              );
            })}
          </section>
        </div>
      )}
    </Screen>
  );
};

export default Admin;
