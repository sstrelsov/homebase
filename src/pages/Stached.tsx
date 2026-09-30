import { Link, useNavigate, useParams } from "@tanstack/react-router";
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
import DayGame from "../stached/DayGame";
import Leaderboard from "../stached/Leaderboard";
import Login from "../stached/Login";
import Logo from "../stached/Logo";
import PastGames from "../stached/PastGames";
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

// The logo powers on once per visit, not every time you come back home.
let introShown = false;

interface HomeProps {
  session: Session;
  onRules: () => void;
  onSignOut: () => void;
}

/** The logo, Rules and Play, and ways to the leaderboard and past games. */
const Home = ({ session, onRules, onSignOut }: HomeProps) => {
  const navigate = useNavigate();
  const [today, setToday] = useState<Today | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intro] = useState(() => !introShown);

  useEffect(() => {
    introShown = true;
  }, []);

  const load = useCallback(() => {
    setError(null);
    api.today(session.token).then(setToday, (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onSignOut();
      else setError(err instanceof Error ? err.message : "Something broke");
    });
  }, [session.token, onSignOut]);

  useEffect(load, [load]);

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
          {today ? formatDate(today.puzzle.date) : " "}
        </p>
      </div>
      <div
        className={`${rise} grid grid-cols-2 gap-3`}
        style={{ animationDelay: "1.3s" }}
      >
        <button type="button" onClick={onRules} className={styles.button}>
          Rules
        </button>
        <button
          type="button"
          onClick={() =>
            today &&
            navigate({
              to: "/stached/$date",
              params: { date: today.puzzle.date },
            })
          }
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
        <div className="flex gap-6">
          <Link
            to="/stached/leaderboard"
            className={`${styles.display} ${styles.stacheText} text-[13px]`}
          >
            🔥 Leaderboard
          </Link>
          <Link
            to="/stached/past"
            className={`${styles.display} ${styles.stacheText} text-[13px]`}
          >
            Past games
          </Link>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className={`${styles.label} underline underline-offset-4`}
        >
          Not {session.name}? Switch player
        </button>
      </div>
      <Crawl />
    </div>
  );
};

type View = "home" | "leaderboard" | "past" | "day";

interface SignedInProps {
  session: Session;
  view: View;
  date?: string;
  onSignOut: () => void;
}

/** Signed in: home, a day's game, past games, or the leaderboard. */
const SignedIn = ({ session, view, date, onSignOut }: SignedInProps) => {
  const [rulesOpen, setRulesOpen] = useState(false);
  const openRules = () => setRulesOpen(true);

  return (
    <>
      {view === "day" && date ? (
        <DayGame
          session={session}
          date={date}
          onSignOut={onSignOut}
          onRules={openRules}
        />
      ) : view === "leaderboard" ? (
        <Leaderboard
          token={session.token}
          player={session.name}
          onSignOut={onSignOut}
        />
      ) : view === "past" ? (
        <PastGames session={session} onSignOut={onSignOut} />
      ) : (
        <Home session={session} onRules={openRules} onSignOut={onSignOut} />
      )}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
};

const StachedPage = ({
  view = "home",
  date,
}: {
  view?: View;
  date?: string;
}) => {
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
          <SignedIn
            key={session.token}
            session={session}
            view={view}
            date={date}
            onSignOut={signOut}
          />
        ) : (
          <Login onSignIn={signIn} />
        )}
      </div>
    </div>
  );
};

export const StachedLeaderboardPage = () => <StachedPage view="leaderboard" />;

export const StachedPastPage = () => <StachedPage view="past" />;

export const StachedDayPage = () => {
  const { date } = useParams({ strict: false }) as { date?: string };
  return <StachedPage view="day" date={date} />;
};

export default StachedPage;
