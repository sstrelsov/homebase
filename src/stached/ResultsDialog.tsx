import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  type Color,
  type Day,
  formatDate,
  formatTime,
  type Play,
  type Score,
} from "./api";
import Dialog from "./Dialog";
import styles from "./stached.module.css";

// Share squares in the board's colors; the stache group is Gerald.
const SHARE_EMOJI: Record<Color, string> = {
  "1": "🟨",
  "2": "🟧",
  "3": "🟥",
  "4": "🟦",
  stache: "🥸",
};

interface ResultsDialogProps {
  open: boolean;
  onClose: () => void;
  onHome: () => void;
  puzzle: Day["puzzle"];
  play: Play;
  board: Score[];
  player: string;
}

function headline({ completed, stachedMs }: Play) {
  if (completed && stachedMs !== null) return "Stached!";
  if (completed) return "Solved!";
  if (stachedMs !== null) return "Stached, barely";
  return "Game over";
}

const ResultsDialog = ({
  open,
  onClose,
  onHome,
  puzzle,
  play,
  board,
  player,
}: ResultsDialogProps) => {
  const [shared, setShared] = useState(false);
  const grid = play.grid ?? [];

  const share = async () => {
    const text = [
      `Stached #${puzzle.number} · ${formatDate(puzzle.date)}`,
      play.stachedMs === null
        ? "No stache"
        : `Stache time ${formatTime(play.stachedMs)}`,
      ...grid.map((row) => row.map((color) => SHARE_EMOJI[color]).join("")),
    ].join("\n");
    const url = `${window.location.origin}/stached`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared(true);
      }
    } catch {
      // Closed the share sheet.
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={headline(play)}>
      <p className={`${styles.label} -mt-3`}>
        Puzzle #{puzzle.number} · {formatDate(puzzle.date)}
      </p>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className={`${styles.panel} p-3`}>
          <p className={styles.label}>Stache time</p>
          <p className={`text-4xl ${styles.stacheText}`}>
            {formatTime(play.stachedMs)}
          </p>
        </div>
        <div className={`${styles.panel} p-3`}>
          <p className={styles.label}>Board</p>
          <p className="text-4xl">{play.completed ? "Solved" : "Missed"}</p>
          <p className="text-lg opacity-60">
            {play.mistakes} {play.mistakes === 1 ? "mistake" : "mistakes"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1" aria-hidden="true">
        {grid.map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: guesses never reorder
          <div key={i} className="flex gap-1">
            {row.map((color, j) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: same as above
                key={j}
                className={styles.swatch}
                data-color={color}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={share}
        className={`${styles.button} ${styles.primary} w-full`}
      >
        {shared ? "Copied!" : "Share"}
      </button>

      <section className="space-y-2">
        <h3 className={styles.label}>
          {puzzle.today ? "Today's scoreboard" : "Scoreboard"}
        </h3>
        <ol className="text-[19px] leading-tight">
          {board.map((score, i) => (
            <li
              key={score.name}
              className={`flex items-baseline gap-3 py-1 ${styles.rule} ${
                score.name === player ? styles.me : ""
              }`}
            >
              <span className="w-6 opacity-50">{i + 1}</span>
              <span className="flex-1 truncate">
                {score.name}
                {score.late && (
                  <span className={`${styles.label} ml-2`} title="Played late">
                    late
                  </span>
                )}
              </span>
              <span className={styles.stacheText}>
                {formatTime(score.stachedMs)}
              </span>
              <span className="w-8 text-right" title="Solved the board">
                {score.completed ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onHome} className={styles.button}>
          Home
        </button>
        <Link to="/stached/leaderboard" className={styles.button}>
          Leaderboard
        </Link>
      </div>
    </Dialog>
  );
};

export default ResultsDialog;
