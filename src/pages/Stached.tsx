import { useCallback, useEffect, useState } from "react";
import RetroMustache from "../components/RetroMustache";
import {
  ApiError,
  api,
  formatDate,
  formatTime,
  loadSession,
  type Session,
  saveSession,
  type Today,
} from "../stached/api";
import Game from "../stached/Game";
import Login from "../stached/Login";
import RulesDialog from "../stached/RulesDialog";
import styles from "../stached/stached.module.css";

function status(today: Today) {
  const { puzzle, play } = today;
  if (!play) return `Puzzle #${puzzle.id} · ${puzzle.groupCount} groups of 4`;
  if (!play.finished) return "Game on. The clock's running!";
  const stache =
    play.stachedMs === null
      ? "No stache"
      : `Stached in ${formatTime(play.stachedMs, true)}`;
  return `${stache} · ${play.completed ? "Solved" : "Missed"}`;
}

interface ArcadeProps {
  session: Session;
  onSignOut: () => void;
}

/** Signed in: the logo and its two buttons, or the game itself. */
const Arcade = ({ session, onSignOut }: ArcadeProps) => {
  const [today, setToday] = useState<Today | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // The logo powers on once, not every time you come back from a game.
  const [intro, setIntro] = useState(true);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onSignOut();
      else setError(err instanceof Error ? err.message : "Something broke");
    },
    [onSignOut],
  );

  const load = useCallback(() => {
    setError(null);
    api.today(session.token).then(setToday, fail);
  }, [session.token, fail]);

  useEffect(load, [load]);

  const play = async () => {
    if (!today) return;
    try {
      if (!today.play)
        setToday(await api.start(session.token, today.puzzle.id));
      setIntro(false);
      setPlaying(true);
    } catch (err) {
      fail(err);
    }
  };

  const rules = (
    <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
  );

  if (playing && today?.play) {
    return (
      <>
        <Game
          token={session.token}
          player={session.name}
          today={today}
          play={today.play}
          onToday={setToday}
          onHome={() => setPlaying(false)}
          onRules={() => setRulesOpen(true)}
        />
        {rules}
      </>
    );
  }

  const rise = intro ? styles.rise : "";

  return (
    <div className="flex min-h-[calc(100dvh-40px)] flex-col justify-center gap-7">
      <div aria-hidden="true" className={styles.horizon} />
      <div className={`relative ${intro ? styles.powerOn : ""}`}>
        <RetroMustache />
      </div>
      <div
        className={`${rise} relative flex flex-col items-center gap-3`}
        style={{ animationDelay: "0.8s" }}
      >
        <h1 className={`${styles.title} text-[26px]`}>Stached</h1>
        <p className={styles.label}>
          {today ? formatDate(today.puzzle.date) : " "}
        </p>
      </div>
      <div
        className={`${rise} relative grid grid-cols-2 gap-3`}
        style={{ animationDelay: "1s" }}
      >
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className={`${styles.button} ${styles.secondary}`}
        >
          Rules
        </button>
        <button
          type="button"
          onClick={play}
          disabled={!today}
          className={`${styles.button} ${styles.primary}`}
        >
          Play
        </button>
      </div>
      <div
        className={`${rise} relative flex flex-col items-center gap-4 text-center`}
        style={{ animationDelay: "1.2s" }}
      >
        {error ? (
          <button
            type="button"
            onClick={load}
            className={styles.label}
            style={{ color: "#ff2a6d" }}
          >
            {error}. Tap to retry
          </button>
        ) : (
          <p className={styles.label}>{today ? status(today) : "Loading…"}</p>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className={`${styles.label} underline underline-offset-4`}
        >
          Not {session.name}? Switch player
        </button>
      </div>
      {rules}
    </div>
  );
};

const StachedPage = () => {
  const [session, setSession] = useState(loadSession);

  // This page is dark mode only; put the site's theme back on the way out.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.className;
    root.classList.remove("light");
    root.classList.add("dark");
    return () => {
      root.className = previous;
    };
  }, []);

  const signIn = (next: Session) => {
    saveSession(next);
    setSession(next);
  };

  const signOut = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  return (
    <div className={`self-start w-full ${styles.arcade}`}>
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        {session ? (
          <Arcade key={session.token} session={session} onSignOut={signOut} />
        ) : (
          <Login onSignIn={signIn} />
        )}
      </div>
    </div>
  );
};

export default StachedPage;
