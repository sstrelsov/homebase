import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  api,
  type Day,
  formatDate,
  formatTime,
  type Today,
  weekday,
} from "./api";
import HomeScreen from "./HomeScreen";
import { Square } from "./Leaderboard";
import Logo from "./Logo";
import { useNotifications } from "./push";
import Quotes from "./Quotes";
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

/** The small links below the big buttons. */
const link = `${styles.display} ${styles.stacheText} text-[13px]`;

type WeekDay = Today["week"][number];

/** A day under its weekday, in the leaderboard's square. */
const DaySquare = ({ date, mark, today }: WeekDay & { today: boolean }) => (
  <Link
    to="/stached/$date"
    params={{ date }}
    className={styles.homeDay}
    data-today={today || undefined}
  >
    <span className={styles.weekday} data-today={today || undefined}>
      {weekday(date)}
    </span>
    <Square mark={mark} />
  </Link>
);

/**
 * Your week under Play: the leaderboard's squares in a strip to swipe, ending
 * at today's, where it opens. A dashed square is still to play. Past the days
 * before are every game so far, then settings. Tap a day to open it.
 */
const Week = ({
  week,
  onSettings,
}: {
  week: Today["week"];
  onSettings: () => void;
}) => {
  const strip = useRef<HTMLElement>(null);
  // Whether today's, at the end, is swiped out of view.
  const [away, setAway] = useState(false);
  const last = week.at(-1)?.date;
  const toToday = (behavior: ScrollBehavior) =>
    strip.current?.scrollTo({ left: strip.current.scrollWidth, behavior });

  // Opens at the end, on today's, once there is a today.
  // biome-ignore lint/correctness/useExhaustiveDependencies: toToday reads the strip, which last's arrival fills
  useLayoutEffect(() => {
    if (last) toToday("instant");
  }, [last]);

  const onScroll = () => {
    const today = strip.current?.querySelector<HTMLElement>("a[data-today]");
    if (!strip.current || !today) return;
    const { scrollLeft, clientWidth } = strip.current;
    setAway(
      today.offsetLeft + today.offsetWidth > scrollLeft + clientWidth + 2,
    );
  };

  return (
    <div className="relative">
      <nav
        ref={strip}
        onScroll={onScroll}
        aria-label="Your week"
        className={styles.homeWeek}
      >
        {/* Each under a blank weekday, so they line up with the days */}
        <button
          type="button"
          onClick={onSettings}
          aria-label="Settings and how to play"
          className={styles.homeDay}
        >
          <span className={styles.weekday}>&nbsp;</span>
          <span className={styles.homeTile}>
            <SlidersIcon />
          </span>
        </button>
        <Link to="/stached/past" className={styles.homeDay}>
          <span className={styles.weekday}>&nbsp;</span>
          <span className={styles.homeTile}>View all</span>
        </Link>
        {week.map((day, i) => (
          <DaySquare key={day.date} {...day} today={i === week.length - 1} />
        ))}
      </nav>
      {away && (
        <button
          type="button"
          onClick={() => toToday("smooth")}
          className={styles.homeBackToToday}
        >
          Today →
        </button>
      )}
    </div>
  );
};

/**
 * Three sliders, like an old set's brightness and contrast, for settings and
 * how to play: drawn in the text's color.
 */
const SlidersIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    aria-hidden="true"
    className="h-6 w-6"
  >
    <path d="M3 6h4M11 6h10M3 12h10M17 12h4M3 18h2M9 18h12" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="12" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

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

/** The logo, Leaderboard and Play, your week (and settings), and quotes. */
const Home = () => {
  const navigate = useNavigate();
  const { session, openRules } = useStached();
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
    // At least the screen, less the page's padding, with the quotes in
    // whatever room is left, so home fits without scrolling. A screen too
    // short for it all (a phone on its side) scrolls rather than hide the
    // bottom.
    <div className="flex min-h-[calc(100dvh-40px)] flex-col gap-5 pt-4">
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
        <Link to="/stached/leaderboard" className={`${styles.button} flex-1`}>
          Leaderboard
        </Link>
        <button
          type="button"
          onClick={play}
          disabled={!today}
          className={`${styles.button} ${styles.primary} flex-1`}
        >
          Play
        </button>
      </div>
      <div className={rise} style={{ animationDelay: "1.4s" }}>
        <Week week={today?.week ?? []} onSettings={openRules} />
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
        {session.admin && (
          <Link to="/stached/admin" className={link}>
            Admin
          </Link>
        )}
        <HomeScreen />
      </div>
      <Quotes className={rise} style={{ animationDelay: "1.6s" }} />
    </div>
  );
};

export default Home;
