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

/** Solved first, then by fewest mistakes; late games last. */
const byResult = (a: AdminGame, b: AdminGame) =>
  Number(a.late) - Number(b.late) ||
  Number(b.completed) - Number(a.completed) ||
  a.mistakes - b.mistakes;

/** One finished game: whose (or which puzzle), how it went, and its grid. */
const GameCard = ({ title, game }: { title: string; game: AdminGame }) => (
  <li className={`${styles.standing} gap-2`}>
    <span className={`${styles.display} text-[14px]`}>{title}</span>
    <span className={styles.label}>
      {game.completed ? "Solved" : "Missed"} ·{" "}
      {plural(game.mistakes, "mistake")}
      {game.late && " · late"}
    </span>
    <span className={styles.label}>
      {game.stachedMs === null
        ? "No stache"
        : `Stache ${formatTime(game.stachedMs)}`}
    </span>
    <GuessGrid grid={game.grid} className="mt-1" />
  </li>
);

interface RowProps {
  title: string;
  detail: string;
  /** The game cards it opens to; none says so. */
  children: ReactNode[];
}

/**
 * A row that opens to show its games, two to a line. They mount only while it's
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
        <span className="flex flex-col gap-1">
          <span className={`${styles.display} text-[14px]`}>{title}</span>
          <span className={styles.label}>{detail}</span>
        </span>
      </summary>
      {open &&
        (children.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-3">{children}</ul>
        ) : (
          <p className={`${styles.label} mt-3`}>No finished games yet</p>
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

  return (
    <Screen title="Admin" error={error} onRetry={load}>
      {stats && (
        <div className="flex flex-col gap-6">
          <dl className={`${styles.standing} ${styles.standingStats}`}>
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
          </dl>

          <section className="flex flex-col gap-4">
            <h2 className={styles.label}>Puzzles</h2>
            {stats.puzzles.map((puzzle) => (
              <Row
                key={puzzle.date}
                title={puzzleTitle(puzzle)}
                detail={`${puzzle.played} played · ${puzzle.solved} solved${puzzle.late > 0 ? ` · ${puzzle.late} late` : ""}`}
              >
                {[...puzzle.games].sort(byResult).map((game) => (
                  <GameCard key={game.name} title={game.name} game={game} />
                ))}
              </Row>
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className={styles.label}>Players</h2>
            {names.map((name) => {
              const games = players.get(name) ?? [];
              return (
                <Row
                  key={name}
                  title={name}
                  detail={`${plural(games.length, "game")} · ${games.filter(({ game }) => game.completed).length} solved`}
                >
                  {games.map(({ puzzle, game }) => (
                    <GameCard
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
