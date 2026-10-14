import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  api,
  formatDate,
  formatTime,
  type Today,
  type TodayPuzzle,
  weekday,
} from "./api";
import HomeScreen, { isHomeScreenApp } from "./HomeScreen";
import { Square } from "./Leaderboard";
import Logo from "./Logo";
import NotificationsDialog from "./NotificationsDialog";
import { useNotifications } from "./push";
import Quotes from "./Quotes";
import { Retry } from "./Screen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

const stacheOf = (stachedMs: number | null) =>
  stachedMs === null ? "No stache" : `Stached in ${formatTime(stachedMs)}`;

function status(play: Today["play"]) {
  if (!play) return null;
  if (!play.finished) return "Game in progress";
  return `${stacheOf(play.stachedMs)} · ${play.completed ? "Solved" : "Missed"}`;
}

/** "7:30pm tomorrow", on this device's clock. */
function timeOf(until: Date) {
  const time = until
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase();
  const midnight = (date: Date) => new Date(date).setHours(0, 0, 0, 0);
  const days = Math.round(
    (midnight(until) - midnight(new Date())) / 86_400_000,
  );
  return `${time} ${days === 0 ? "today" : days === 1 ? "tomorrow" : formatDate(until.toLocaleDateString("en-CA"), { weekday: "long" })}`;
}

/**
 * Which of today's it is: "Today's", or a missed day's by its weekday
 * ("Monday's"), out today to catch up.
 */
const whose = ({ date, out }: TodayPuzzle) =>
  date === out ? "Today's" : `${formatDate(date, { weekday: "long" })}'s`;

/**
 * Today's puzzles, when a missed day's is out too: a row each, with which
 * day it is and how you did, or until when it counts. Each opens its game,
 * and the one Play opens is lit.
 */
const TodayList = ({
  puzzles,
  next,
}: {
  puzzles: TodayPuzzle[];
  next: string | null;
}) => {
  const done = puzzles.every((p) => p.play?.finished);
  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className={`${styles.label} text-center`}>
        {puzzles.length} puzzles today{done && " · All done"}
      </h2>
      <ul className={styles.todayList}>
        {puzzles.map((puzzle) => {
          const { play, until } = puzzle;
          const counts =
            until && Date.parse(until) > Date.now()
              ? `Counts till ${timeOf(new Date(until))}`
              : "Counts today";
          return (
            <li key={puzzle.date}>
              <Link
                to="/stached/$date"
                params={{ date: puzzle.date }}
                className={styles.todayRow}
                data-next={puzzle.date === next || undefined}
              >
                <span className={styles.todayNumber}>#{puzzle.number}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={`${styles.display} text-[14px]`}>
                    {whose(puzzle)}
                  </span>
                  <span className={styles.label}>
                    {play?.finished ? stacheOf(play.stachedMs) : counts}
                  </span>
                </span>
                <span className={styles.todayStatus}>
                  {!play
                    ? "Play"
                    : !play.finished
                      ? "Resume"
                      : play.completed
                        ? "✓ Solved"
                        : "✗ Missed"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

// The logo powers on once per visit, not every time you come back home.
let introShown = false;

type WeekDay = Today["week"][number];

/**
 * A day under its weekday, in the leaderboard's square; a day with no puzzle
 * (missed, and never caught up) is an empty slot.
 */
const DaySquare = ({ date, mark, today }: WeekDay) => {
  const square = (
    <>
      <span className={styles.weekday} data-today={today || undefined}>
        {weekday(date)}
      </span>
      <Square mark={mark} />
    </>
  );
  return mark === "gap" ? (
    <span className={styles.homeDay}>{square}</span>
  ) : (
    <Link to="/stached/$date" params={{ date }} className={styles.homeDay}>
      {square}
    </Link>
  );
};

/**
 * Your week under Play: the leaderboard's squares in a strip to swipe, ending
 * at today's, where it opens. A dashed square is still to play, and a striped
 * one was played late. Past the days before are every game so far, then
 * settings. Tap a day to open it.
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
    // Today's is last, at the very end.
    const today = strip.current?.querySelector<HTMLElement>(
      ":scope > :last-child",
    );
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
        {week.map((day) => (
          <DaySquare key={day.date} {...day} />
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

/** A bell, ringing: drawn in the text's color. */
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
  const [app] = useState(isHomeScreenApp);
  const [intro] = useState(() => !introShown);

  useEffect(() => {
    introShown = true;
  }, []);

  // Asks again, in case the day has turned (or you've finished one of
  // today's) since this screen loaded.
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
  // Today's puzzles, more than one when a missed day's is out too: Play says
  // which is next, and once they're all done, it's your results.
  const puzzles = today?.puzzles ?? [];
  const several = puzzles.length > 1;
  const done = today?.play?.finished;
  const note = today ? !several && status(today.play) : "Loading…";

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
          {today ? formatDate(today.puzzle.out) : " "}
        </p>
      </div>
      <div className={`${rise} flex gap-3`} style={{ animationDelay: "1.3s" }}>
        {/* In a browser tab that can get pushes (desktop Chrome, Android),
            until they're on. The home-screen app asks in a dialog instead. */}
        {notifications.offer && !app && (
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
          {done
            ? "Results"
            : several
              ? `Play ${today?.puzzle.nth} of ${puzzles.length}`
              : "Play"}
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
        {several && today && (
          <TodayList puzzles={puzzles} next={done ? null : today.puzzle.date} />
        )}
        {session.admin && (
          <Link to="/stached/admin" className={styles.link}>
            Admin
          </Link>
        )}
      </div>
      <Quotes className={rise} style={{ animationDelay: "1.6s" }} />
      {/* One asks in a browser tab, the other in the home-screen app, so
          they never stack. */}
      {app ? (
        today && (
          <NotificationsDialog
            {...notifications}
            // The one after today's last
            number={Math.max(...puzzles.map((p) => p.number)) + 1}
          />
        )
      ) : (
        <HomeScreen />
      )}
    </div>
  );
};

export default Home;
