import { AnimatePresence, motion, stagger, useAnimate } from "motion/react";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MUSTACHE_PATH } from "../components/RetroMustache";
import {
  api,
  COLOR_HEX,
  formatDate,
  formatTime,
  type Group,
  type Play,
  type Today,
} from "./api";
import ResultsDialog from "./ResultsDialog";
import styles from "./stached.module.css";

const PRAISE = ["Perfect!", "Great!", "Solid!", "Phew!"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The groups shown as bars: the ones solved, then the rest once it's over. */
function barsFor(play: Play): Group[] {
  const missed = (play.answers ?? []).filter(
    (answer) => !play.solved.some((group) => group.title === answer.title),
  );
  return [...play.solved, ...missed];
}

/** Shrinks a word until it fits its tile. */
const FitWord = ({ word }: { word: string }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const span = ref.current;
    const tile = span?.parentElement;
    if (!span || !tile) return;
    const shrink = () => {
      const room = tile.clientHeight - 8;
      let size = 26;
      span.style.fontSize = `${size}px`;
      while (
        size > 11 &&
        (span.scrollWidth > span.clientWidth || span.offsetHeight > room)
      ) {
        size -= 1;
        span.style.fontSize = `${size}px`;
      }
    };
    shrink();
    document.fonts.ready.then(shrink);
    const observer = new ResizeObserver(shrink);
    observer.observe(tile);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={styles.word}>
      {word}
    </span>
  );
};

const Mustache = ({ className }: { className?: string }) => (
  <svg viewBox="0 12 200 54" aria-hidden="true" className={className}>
    <path d={MUSTACHE_PATH} />
  </svg>
);

interface GameProps {
  token: string;
  player: string;
  today: Today;
  play: Play;
  onToday: (today: Today) => void;
  onHome: () => void;
  onRules: () => void;
}

const Game = ({
  token,
  player,
  today,
  play,
  onToday,
  onHome,
  onRules,
}: GameProps) => {
  const { puzzle, board } = today;
  const [bars, setBars] = useState(() => barsFor(play));
  const [order, setOrder] = useState(() =>
    shuffle(puzzle.words.filter((w) => !bars.some((g) => g.words.includes(w)))),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(play.mistakes);
  const [over, setOver] = useState(play.finished);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stached, setStached] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(play.finished);
  const [scope, animate] = useAnimate();
  const toastTimer = useRef<number>(undefined);

  // The server keeps the real clock; this one just shows it ticking.
  const startedAt = useRef(Date.now() - play.elapsedMs);
  const [now, setNow] = useState(Date.now);
  const ticking = play.stachedMs === null && !play.finished;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [ticking]);
  const clock =
    play.stachedMs ?? (play.finished ? null : now - startedAt.current);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const say = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  };

  const toggle = (word: string) => {
    if (busy || over) return;
    setSelected((s) =>
      s.includes(word)
        ? s.filter((w) => w !== word)
        : s.length < 4
          ? [...s, word]
          : s,
    );
  };

  /** Slides a group's tiles into the top open row, then locks in its bar. */
  const lockIn = async (group: Group) => {
    const inGroup = (w: string) => group.words.includes(w);
    setOrder((o) => [...o.filter(inGroup), ...o.filter((w) => !inGroup(w))]);
    await sleep(500);
    setBars((b) => [...b, group]);
    setOrder((o) => o.filter((w) => !inGroup(w)));
    await sleep(450);
  };

  const submit = async () => {
    const key = (words: string[]) => [...words].sort().join("|");
    if (play.guesses.some((g) => key(g) === key(selected)))
      return say("Already guessed!");

    setBusy(true);
    try {
      // Tiles hop in grid order while the server checks the guess.
      const [next] = await Promise.all([
        api.guess(
          token,
          puzzle.id,
          order.filter((w) => selected.includes(w)),
        ),
        animate(
          "[data-selected]",
          { y: [0, -16, 0] },
          { duration: 0.32, delay: stagger(0.09) },
        ),
      ]);
      await sleep(120);
      onToday(next);
      const result = next.play as Play;

      if (next.result === "correct") {
        const group = result.solved[result.solved.length - 1];
        await lockIn(group);
        setSelected([]);
        if (group.color === "stache") {
          setStached(true);
          await sleep(2200);
          setStached(false);
        }
      } else if (next.result === "repeat") {
        say("Already guessed!");
      } else {
        if (next.result === "one_away") say("One away…");
        await animate(
          "[data-selected]",
          { x: [0, -9, 9, -7, 7, -3, 3, 0] },
          { duration: 0.45 },
        );
        setMistakes(result.mistakes);
      }

      if (result.finished) {
        setSelected([]);
        if (result.completed) say(PRAISE[result.mistakes] ?? "Phew!");
        else {
          say("Game over");
          await sleep(900);
          for (const group of barsFor(result).slice(result.solved.length))
            await lockIn(group);
        }
        await sleep(1300);
        setOver(true);
        setResultsOpen(true);
      }
    } catch (err) {
      say(err instanceof Error ? err.message : "Something broke");
    } finally {
      setBusy(false);
    }
  };

  const lives = puzzle.maxMistakes - mistakes;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onHome}
          className={`${styles.pixel} -ml-1 py-2 pr-3 text-[10px]`}
        >
          ‹ Home
        </button>
        <div className="flex flex-col items-center gap-1.5">
          <span className={`${styles.title} text-sm`}>Stached</span>
          <span className={styles.label}>{formatDate(puzzle.date)}</span>
        </div>
        <button
          type="button"
          onClick={onRules}
          className={`${styles.pixel} -mr-1 py-2 pl-3 text-[10px]`}
        >
          Rules
        </button>
      </header>

      <div className="flex items-end justify-between">
        <div>
          <p className={styles.label}>Stache time</p>
          <p
            className="text-[36px] leading-none tabular-nums"
            style={{
              color: play.stachedMs === null ? undefined : COLOR_HEX.stache,
            }}
          >
            {clock === null ? "—" : formatTime(clock, play.stachedMs !== null)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 pb-1">
          <p className={styles.label}>Lives</p>
          <div
            role="img"
            aria-label={`${lives} of ${puzzle.maxMistakes} lives left`}
            className="flex gap-1.5"
          >
            {Array.from({ length: puzzle.maxMistakes }, (_, i) => (
              <svg
                // biome-ignore lint/suspicious/noArrayIndexKey: lives are positional
                key={i}
                viewBox="0 12 200 54"
                aria-hidden="true"
                className={styles.life}
                data-lost={i >= lives || undefined}
              >
                <path d={MUSTACHE_PATH} />
              </svg>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scope}
        className={styles.board}
        style={{ "--rows": puzzle.groupCount } as CSSProperties}
      >
        {toast && (
          <p role="status" className={styles.toast}>
            {toast}
          </p>
        )}

        <AnimatePresence initial={false}>
          {bars.map((group) => (
            <motion.div
              key={group.title}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className={`${styles.bar} ${group.color === "stache" ? styles.stacheBar : ""}`}
              style={{ "--color": COLOR_HEX[group.color] } as CSSProperties}
            >
              <span className={styles.barTitle}>
                {group.color === "stache" && <Mustache className="w-7" />}
                {group.title}
              </span>
              <span className={styles.barWords}>{group.words.join(", ")}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {order.map((word) => (
          <motion.div
            key={word}
            layout
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <button
              type="button"
              onClick={() => toggle(word)}
              aria-pressed={selected.includes(word)}
              data-selected={selected.includes(word) || undefined}
              className={styles.tile}
            >
              <FitWord word={word} />
            </button>
          </motion.div>
        ))}

        {stached && (
          <div role="status" className={styles.stacheFlash}>
            <Mustache />
            <p className={`${styles.title} text-2xl`}>Stached!</p>
            <p className="text-5xl" style={{ color: COLOR_HEX.stache }}>
              {formatTime(play.stachedMs ?? 0, true)}
            </p>
          </div>
        )}
      </div>

      {over ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onHome}
            className={`${styles.button} ${styles.secondary}`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setResultsOpen(true)}
            className={`${styles.button} ${styles.primary}`}
          >
            Results
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOrder(shuffle)}
            disabled={busy}
            className={`${styles.button} ${styles.secondary}`}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            disabled={busy || selected.length === 0}
            className={`${styles.button} ${styles.secondary}`}
          >
            Deselect
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || selected.length !== 4}
            className={`${styles.button} ${styles.primary}`}
          >
            Submit
          </button>
        </div>
      )}

      <ResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        onHome={onHome}
        puzzle={puzzle}
        play={play}
        board={board}
        player={player}
      />
    </div>
  );
};

export default Game;
