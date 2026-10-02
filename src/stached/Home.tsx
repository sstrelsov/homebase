import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Day, formatDate, formatTime } from "./api";
import Crawl from "./Crawl";
import HomeScreen from "./HomeScreen";
import Logo from "./Logo";
import { useNotifications } from "./push";
import { Retry } from "./Screen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

function status({ play }: Day) {
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

/** A bell, ringing: drawn in the text's color, like the home-screen tip's. */
const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-6 w-6"
  >
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    <path d="M2.5 9a9.5 9.5 0 0 1 2.5-6M21.5 9A9.5 9.5 0 0 0 19 3" />
  </svg>
);

/** The logo, Rules and Play, and ways to the leaderboard and past games. */
const Home = () => {
  const navigate = useNavigate();
  const { session, signOut, openRules } = useStached();
  const { data: today, error, load, fail } = useLoad(api.today);
  const notifications = useNotifications();
  const [intro] = useState(() => !introShown);

  useEffect(() => {
    introShown = true;
  }, []);

  // Asks again, in case the day has turned since this screen loaded.
  const play = () =>
    api.today(session.token).then(
      (next) =>
        navigate({
          to: "/stached/$date",
          params: { date: next.puzzle.date },
        }),
      fail,
    );

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
      <div className={`${rise} flex gap-3`} style={{ animationDelay: "1.3s" }}>
        {/* Until notifications are on: iOS asks only right after a tap. */}
        {notifications.bell && (
          <button
            type="button"
            onClick={notifications.turnOn}
            disabled={notifications.busy}
            aria-label="Get notified when a puzzle is up"
            className={`${styles.button} ${styles.rise} w-12 shrink-0`}
          >
            <BellIcon />
          </button>
        )}
        <button
          type="button"
          onClick={openRules}
          className={`${styles.button} flex-1`}
        >
          Rules
        </button>
        <button
          type="button"
          onClick={play}
          disabled={!today}
          className={`${styles.button} ${styles.primary} flex-1`}
        >
          Play
        </button>
      </div>
      <div
        className={`${rise} flex flex-col items-center gap-4 text-center`}
        style={{ animationDelay: "1.5s" }}
      >
        {error ? (
          <Retry error={error} onRetry={load} />
        ) : (
          note && <p className={styles.label}>{note}</p>
        )}
        <div className="flex gap-6">
          <Link
            to="/stached/leaderboard"
            className={`${styles.display} ${styles.stacheText} text-[13px]`}
          >
            Leaderboard
          </Link>
          <Link
            to="/stached/past"
            className={`${styles.display} ${styles.stacheText} text-[13px]`}
          >
            Past games
          </Link>
        </div>
        {session.admin && (
          <Link
            to="/stached/admin"
            className={`${styles.display} ${styles.stacheText} text-[13px]`}
          >
            Admin
          </Link>
        )}
        <HomeScreen />
        <button
          type="button"
          onClick={signOut}
          className={`${styles.label} underline underline-offset-4`}
        >
          Not {session.name}? Switch player
        </button>
      </div>
      <Crawl />
    </div>
  );
};

export default Home;
