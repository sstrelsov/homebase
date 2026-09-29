import type { Ref } from "react";
import styles from "../css/cursor.module.css";

interface CursorProps {
  color: string;
  ref?: Ref<HTMLSpanElement>;
}

/** A blinking text cursor, sized to the surrounding font. */
const Cursor = ({ color, ref }: CursorProps) => (
  <span
    ref={ref}
    className={`inline-block w-[2.5px] h-[1em] ml-[1.8px] align-text-bottom ${styles.blink}`}
    style={{ backgroundColor: color }}
  />
);

export default Cursor;
