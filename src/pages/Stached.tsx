import { Outlet } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { loadSession, type Session, saveSession } from "../stached/api";
import Login from "../stached/Login";
import RulesDialog from "../stached/RulesDialog";
import { StachedContext } from "../stached/session";
import styles from "../stached/stached.module.css";

// The router loads every Stached screen from here, so they share one chunk.
export { default as StachedDay } from "../stached/DayGame";
export { default as StachedHome } from "../stached/Home";
export { default as StachedLeaderboard } from "../stached/Leaderboard";
export { default as StachedPast } from "../stached/PastGames";

/**
 * The page around every Stached screen: home, a day's game, past games and
 * the leaderboard. It signs you in and holds the session for all of them.
 */
const StachedPage = () => {
  const [session, setSession] = useState(loadSession);
  const [rulesOpen, setRulesOpen] = useState(false);

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
          <StachedContext
            value={{ session, signOut, openRules: () => setRulesOpen(true) }}
          >
            <Outlet />
            <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
          </StachedContext>
        ) : (
          <Login onSignIn={signIn} />
        )}
      </div>
    </div>
  );
};

export default StachedPage;
