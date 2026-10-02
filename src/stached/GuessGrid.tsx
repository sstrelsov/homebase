import type { Color } from "./api";
import styles from "./stached.module.css";

interface GuessGridProps {
  grid: Color[][];
  className?: string;
}

/** A game's guesses as rows of colored squares, as its share text has them. */
const GuessGrid = ({ grid, className = "" }: GuessGridProps) => (
  <div className={`flex flex-col gap-1 ${className}`} aria-hidden="true">
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
);

export default GuessGrid;
