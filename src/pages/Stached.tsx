import { useCallback, useEffect, useState } from "react";
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
import Crawl from "../stached/Crawl";
import Game from "../stached/Game";
import Login from "../stached/Login";
import Logo from "../stached/Logo";
import RulesDialog from "../stached/RulesDialog";
import styles from "../stached/stached.module.css";

function status({ play }: Today) {
  if (!play) return null;
  if (!play.finished) return "Game in progress";
  const stache =
    play.stachedMs === null
      ? "No stache"
      : `Stached in ${formatTime(play.stachedMs)}`;
  return `${stache} · ${play.completed ? "Solved" : "Missed"}`;
}

interface SignedInProps {
  session: Session;
  onSignOut: () => void;
}

/** Signed in: the logo and its two buttons, or the game itself. */
const SignedIn = ({ session, onSignOut }: SignedInProps) => {
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
      // Starts the game, or picks it up from the server's copy, which may have
      // moved on since this screen last looked.
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
          puzzle={today.puzzle}
          board={today.board}
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
  const note = today ? status(today) : "Loading…";

  return (
    <div className="flex min-h-[calc(100dvh-40px)] flex-col gap-7 pt-4">
      <Logo intro={intro} />
      <div
        className={`${rise} flex flex-col items-center gap-3`}
        style={{ animationDelay: "1.1s" }}
      >
        <h1 className={`${styles.title} text-[32px]`}>Stached</h1>
        <p className={styles.label}>
          {today ? formatDate(today.puzzle.date) : " "}
        </p>
      </div>
      <div
        className={`${rise} grid grid-cols-2 gap-3`}
        style={{ animationDelay: "1.3s" }}
      >
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className={styles.button}
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
        className={`${rise} flex flex-col items-center gap-4 text-center`}
        style={{ animationDelay: "1.5s" }}
      >
        {error ? (
          <button
            type="button"
            onClick={load}
            className={`${styles.label} ${styles.alert}`}
          >
            {error}. Tap to retry
          </button>
        ) : (
          note && <p className={styles.label}>{note}</p>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className={`${styles.label} underline underline-offset-4`}
        >
          Not {session.name}? Switch player
        </button>
      </div>
      <Crawl />
      {rules}
    </div>
  );
};

const StachedPage = () => {
  const [session, setSession] = useState(loadSession);

  const signIn = (next: Session) => {
    saveSession(next);
    setSession(next);
  };

  const signOut = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  return (
    <div className={`self-start w-full ${styles.stached}`}>
      <div aria-hidden="true" className={styles.crt} />
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        {session ? (
          <SignedIn key={session.token} session={session} onSignOut={signOut} />
        ) : (
          <Login onSignIn={signIn} />
        )}
      </div>
    </div>
  );
};

export default StachedPage;
