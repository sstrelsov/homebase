import { type CSSProperties, useEffect, useRef, useState } from "react";
import { shuffle } from "./Game";
import QUOTES from "./quotes.json";
import styles from "./stached.module.css";

/** How long each quote stays up, counted from when the reel stops moving. */
const QUOTE_MS = 4000;

/**
 * Mustache wisdom, one line at a time, rolling up on its own. A swipe either
 * way moves it sooner, and the wait starts over. Each visit starts somewhere
 * new. Each puzzle's push notification borrows a line (stached-api/push.ts).
 */
const Quotes = ({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => {
  const [quotes] = useState(() => shuffle(QUOTES));
  const reel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = reel.current;
    if (!box || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      // Exact, since a quote can be a fraction of a pixel taller than clientHeight.
      const { height } = box.getBoundingClientRect();
      let i = Math.round(box.scrollTop / height);
      // The last is the first again: jump back to it unseen, so it loops.
      if (i === quotes.length) {
        box.scrollTo({ top: 0, behavior: "instant" });
        i = 0;
      }
      box.scrollTo({ top: (i + 1) * height, behavior: "smooth" });
    };
    // Any scroll, the reel's own or a swipe, starts the wait over.
    const wait = () => {
      clearTimeout(timer);
      timer = setTimeout(next, QUOTE_MS);
    };
    wait();
    box.addEventListener("scroll", wait, { passive: true });
    return () => {
      clearTimeout(timer);
      box.removeEventListener("scroll", wait);
    };
  }, [quotes.length]);

  return (
    <div className={`${styles.quotes} ${className}`} style={style}>
      <div ref={reel} className={styles.quotesReel}>
        {quotes.map((quote) => (
          <p key={quote} className={styles.quote}>
            “{quote}”
          </p>
        ))}
        <p aria-hidden="true" className={styles.quote}>
          “{quotes[0]}”
        </p>
      </div>
    </div>
  );
};

export default Quotes;
