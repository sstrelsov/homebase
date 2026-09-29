import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../css/typewriter.module.css";
import { useLinkColor } from "../utils/ColorContext";

interface Keystroke {
  /** Text on screen after this keystroke. */
  text: string;
  /** Milliseconds to wait before it lands. */
  delay: number;
}

// Nearby keys on a QWERTY keyboard, for believable typos.
const NEIGHBORS: Record<string, string> = {
  a: "qsz",
  b: "vgn",
  c: "xdv",
  d: "sfe",
  e: "wrd",
  f: "dgr",
  g: "fht",
  h: "gjy",
  i: "uok",
  j: "hku",
  k: "jli",
  l: "ko",
  m: "nj",
  n: "bmh",
  o: "ipl",
  p: "ol",
  r: "etf",
  s: "adw",
  t: "ryg",
  u: "yij",
  v: "cfb",
  w: "qes",
  y: "tuh",
};

const TYPO_RATE = 0.025;

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** How long a typist lingers after a character before the next one. */
function pauseAfter(char: string): number {
  if (/[.!?]/.test(char)) return between(450, 750);
  if (/[,;:]/.test(char)) return between(200, 350);
  if (char === "\n") return between(350, 550);
  if (char === " " && Math.random() < 0.06) return between(150, 350);
  return 0;
}

/** Plans every keystroke, typos and corrections included, before typing starts. */
function planKeystrokes(text: string): Keystroke[] {
  const strokes: Keystroke[] = [];
  let screen = "";
  let pause = between(500, 800);
  const press = (next: string, delay: number) => {
    screen = next;
    strokes.push({ text: screen, delay: Math.round(delay) });
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const near = NEIGHBORS[char];
    if (near && /[a-z]/.test(text[i - 1] ?? "") && Math.random() < TYPO_RATE) {
      press(
        screen + near[Math.floor(Math.random() * near.length)],
        pause + between(50, 115),
      );
      press(screen.slice(0, -1), between(250, 500));
      pause = between(80, 160);
    }
    press(screen + char, pause + between(50, 115));
    pause = pauseAfter(char);
  }
  return strokes;
}

interface HumanTypingProps {
  text: string;
  onDone: () => void;
}

/** Types text out like a person would. Click to skip ahead. */
const HumanTyping = ({ text, onDone }: HumanTypingProps) => {
  const { linkColor } = useLinkColor();
  const strokes = useMemo(() => planKeystrokes(text), [text]);
  const [step, setStep] = useState(0);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const done = step === strokes.length;

  useEffect(() => {
    if (done) {
      onDone();
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), strokes[step].delay);
    return () => clearTimeout(id);
  }, [done, onDone, step, strokes]);

  const shown = step === 0 ? "" : strokes[step - 1].text;

  // Keep the line being typed in view as the story grows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per keystroke
  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest" });
  }, [shown]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: skipping is a mouse nicety; the full text is always available to screen readers
    // biome-ignore lint/a11y/noStaticElementInteractions: same as above
    <div onClick={() => setStep(strokes.length)}>
      <p className="sr-only">{text}</p>
      <p aria-hidden className="whitespace-pre-line">
        {shown}
        {!done && (
          <span
            ref={cursorRef}
            className={`border-r-[2.5px] solid ml-[1.8px] ${styles.blink}`}
            style={{ borderColor: linkColor }}
          />
        )}
      </p>
    </div>
  );
};

export default HumanTyping;
