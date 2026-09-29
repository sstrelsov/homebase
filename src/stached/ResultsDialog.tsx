import { type CSSProperties, useState } from "react";
import {
  COLOR_EMOJI,
  COLOR_HEX,
  formatDate,
  formatTime,
  type Play,
  type Score,
  type Today,
} from "./api";
import Dialog from "./Dialog";
import styles from "./stached.module.css";

interface ResultsDialogProps {
  open: boolean;
  onClose: () => void;
  onHome: () => void;
  puzzle: Today["puzzle"];
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
      `Stached #${puzzle.id} · ${formatDate(puzzle.date)}`,
      play.stachedMs === null
        ? "No stache"
        : `Stache time ${formatTime(play.stachedMs, true)}`,
      ...grid.map((row) => row.map((color) => COLOR_EMOJI[color]).join("")),
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
        Puzzle #{puzzle.id} · {formatDate(puzzle.date)}
      </p>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-white/15 p-3">
          <p className={styles.label}>Stache time</p>
          <p className="text-4xl" style={{ color: COLOR_HEX.stache }}>
            {play.stachedMs === null ? "—" : formatTime(play.stachedMs, true)}
          </p>
        </div>
        <div className="rounded-lg border border-white/15 p-3">
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
                style={{ "--color": COLOR_HEX[color] } as CSSProperties}
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
        <h3 className={styles.label}>Today's scoreboard</h3>
        <ol className="text-[22px] leading-tight">
          {board.map((score, i) => (
            <li
              key={score.name}
              className="flex items-baseline gap-3 py-1 border-b border-white/10"
              style={
                score.name.toLowerCase() === player.toLowerCase()
                  ? { color: COLOR_HEX.green }
                  : undefined
              }
            >
              <span className="w-6 opacity-50">{i + 1}</span>
              <span className="flex-1 truncate">{score.name}</span>
              <span style={{ color: COLOR_HEX.stache }}>
                {score.stachedMs === null
                  ? "—"
                  : formatTime(score.stachedMs, true)}
              </span>
              <span className="w-8 text-right" title="Solved the board">
                {score.completed ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <button
        type="button"
        onClick={onHome}
        className={`${styles.button} ${styles.secondary} w-full`}
      >
        Home
      </button>
    </Dialog>
  );
};

export default ResultsDialog;
