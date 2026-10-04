import { useLayoutEffect, useState } from "react";
import x from "./mockups.module.css";

/** Its height, to keep the field being edited in view above it. */
export const KEYBOARD_PX = 300;

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

/**
 * An iPhone's keyboard, drawn, with Safari's bar above it, so a desktop shows
 * how little of the page is left while a field is being edited. A phone puts
 * up its own instead. Return reads what the field asks for: next, or done.
 */
const Keyboard = ({ field }: { field: string }) => {
  const [hint, setHint] = useState("return");
  useLayoutEffect(() => {
    const input = document.querySelector<HTMLInputElement>(
      `[data-field="${field}"]`,
    );
    setHint(input?.enterKeyHint || "return");
  }, [field]);
  return (
    // Pressing it mustn't take the focus from the field.
    <div
      aria-hidden="true"
      onMouseDown={(e) => e.preventDefault()}
      className={x.keyboard}
    >
      <div className={x.keyboardBar}>
        <span>⌃ ⌄</span>
        <span className={x.keyboardTag}>Pretend keyboard · desktop only</span>
        <strong>Done</strong>
      </div>
      {ROWS.map((row, i) => (
        <div key={row} className={x.keyRow}>
          {i === 2 && <span className={`${x.key} ${x.keyWide}`}>⇧</span>}
          {[...row].map((key) => (
            <span key={key} className={x.key}>
              {key}
            </span>
          ))}
          {i === 2 && <span className={`${x.key} ${x.keyWide}`}>⌫</span>}
        </div>
      ))}
      <div className={x.keyRow}>
        <span className={`${x.key} ${x.keyWide}`}>123</span>
        <span className={`${x.key} ${x.keySpace}`}>space</span>
        <span className={`${x.key} ${x.keyReturn}`} data-hint={hint}>
          {hint}
        </span>
      </div>
    </div>
  );
};

export default Keyboard;
