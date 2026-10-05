import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PastRuns } from "../Admin";
import Screen from "../Screen";
import styles from "../stached.module.css";
import { focusField } from "./Board";
import Keyboard, { KEYBOARD_PX } from "./Keyboard";
import x from "./mockups.module.css";
import StageTab from "./Stage";
import { STATS } from "./sample";
import { SCREENS, type ScreenId } from "./search";
import { type Mock, PRESETS, screenOf } from "./state";

const route = getRouteApi("/stached/admin-mockups");

const noop = () => {};

// Each screen: its name in the switcher, and what it shows.
const NOTES: Record<ScreenId, [string, string]> = {
  runs: [
    "Past runs",
    "/stached/admin/runs: the admin page as it is now, as the first tab. Made-up players.",
  ],
  paste: [
    "Paste box",
    "/stached/admin/stage: paste anything for the next open day (Paste fills a sample). Below, every day ahead: tap one to open it, or a gap to stage it.",
  ],
  organizing: [
    "Haiku sorting",
    "The API asks Claude Haiku to sort the paste into rows. Held here; Organize from the paste box to see it finish (faked: a canned answer after a pause).",
  ],
  board: [
    "Haiku's rows",
    "Tap any word or title to edit it in place. Arrows move a row (colors go easiest first); Gerald makes a row the stache group, which sits last in the bands.",
  ],
  word: [
    "Editing a word",
    "The tile turns into a text field, like a selected tile in the game. Return goes to the next word, then the next row.",
  ],
  title: [
    "Editing a title",
    "Titles edit the same way, in their bar. Return goes on to the row's first word.",
  ],
  shuffled: [
    "Shuffled",
    "The board as players first see it, to check the red herrings. Shuffle deals again.",
  ],
  problems: [
    "Problems",
    "What the server would refuse (puzzleProblems), marked where it is and listed at the bottom. Publish waits until it's fixed; Save draft waits only for the date.",
  ],
  "too-many": [
    "Too many rows",
    "Six groups pasted: rows get an ✕ while there are more than four, and the two Cookies titles are marked.",
  ],
  push: [
    "Notification",
    "The line under “Puzzle #N is up”, on the lock screen it lands on. Empty uses a random quote from home, as now. Haiku can suggest one.",
  ],
  saved: [
    "Draft saved",
    "Saved, not live: the CLI's stage. It's on the list of days ahead as a draft.",
  ],
  confirm: [
    "Publish?",
    "What the CLI's confirm says: when it goes live and when it pushes (timing()), and that editing it once played deletes games.",
  ],
  published: [
    "Published",
    "Live on its date. Stage the next open day from here.",
  ],
  live: [
    "Today's, played",
    "Today's puzzle opened from the days ahead. People have played it, so the board says what a change costs.",
  ],
  "confirm-live": [
    "Over games",
    "A word changed on a played puzzle: Publish waits for an explicit Delete N games (the CLI's delete-games flag). Only Spencer decides that.",
  ],
};

/** The switcher above the screen: back and forth, every screen, the look. */
const Controls = ({
  current,
  onJump,
}: {
  current: ScreenId;
  onJump: (screen: ScreenId) => void;
}) => {
  const search = route.useSearch();
  const at = SCREENS.indexOf(current);
  const step = (by: number) =>
    SCREENS[(at + by + SCREENS.length) % SCREENS.length];
  const jump = (screen: ScreenId, label: string, className = x.choice) => (
    <Link
      to="/stached/admin-mockups"
      search={{ ...search, screen }}
      replace
      onClick={() => onJump(screen)}
      className={className}
      data-on={screen === current || undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className={x.controls}>
      <div className="flex items-center gap-2">
        {jump(step(-1), "‹", x.stepper)}
        <span className={`${styles.display} flex-1 text-center text-[13px]`}>
          {at + 1}/{SCREENS.length} · {NOTES[current][0]}
        </span>
        {jump(step(1), "›", x.stepper)}
      </div>
      <p className={x.controlsNote}>{NOTES[current][1]}</p>
      <details>
        <summary className={styles.label}>Every screen</summary>
        <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
          {SCREENS.map((screen) => (
            <span key={screen}>{jump(screen, NOTES[screen][0])}</span>
          ))}
        </div>
      </details>
      <div className="flex items-center gap-1">
        <span className={`${styles.label} mr-2`}>Look</span>
        {(["light", "dark"] as const).map((look) => (
          <Link
            key={look}
            to="/stached/admin-mockups"
            search={{ ...search, look }}
            replace
            className={x.choice}
            data-on={search.look === look || undefined}
          >
            {look}
          </Link>
        ))}
      </div>
    </nav>
  );
};

/** The admin's two tabs; the one you're on is a selected tile. */
const Tabs = ({
  tab,
  onTab,
}: {
  tab: Mock["tab"];
  onTab: (tab: Mock["tab"]) => void;
}) => (
  <div role="tablist" className={x.tabs}>
    {(
      [
        ["runs", "Past runs"],
        ["stage", "Stage"],
      ] as const
    ).map(([id, label]) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={tab === id}
        data-on={tab === id || undefined}
        onClick={() => onTab(id)}
        className={x.tab}
      >
        {label}
      </button>
    ))}
  </div>
);

/** Keeps a field clear of the pretend keyboard, as a phone scrolls it clear. */
function clearKeyboard(field: HTMLElement) {
  requestAnimationFrame(() => {
    const room = window.innerHeight - KEYBOARD_PX - 16;
    const { bottom } = field.getBoundingClientRect();
    if (bottom > room)
      window.scrollBy({ top: bottom - room, behavior: "smooth" });
  });
}

/**
 * The admin page split in two, past runs and staging a puzzle, as clickable
 * mockups on made-up data (sample.ts), in the game's own frame and components.
 * Dev only: no API, and Haiku is faked.
 */
const AdminMockups = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [mock, setMock] = useState(() => PRESETS[search.screen]());
  // A phone has its own keyboard; a desktop gets a drawing of one.
  const [desktop] = useState(() => matchMedia("(pointer: fine)").matches);
  const current = screenOf(mock);

  // The address follows along, so a screen can be shared or reloaded.
  useEffect(() => {
    if (search.screen !== current)
      navigate({ search: (s) => ({ ...s, screen: current }), replace: true });
  }, [current, search.screen, navigate]);

  const jump = (screen: ScreenId) => {
    const next = PRESETS[screen]();
    setMock(next);
    requestAnimationFrame(() => {
      if (next.focus) focusField(next.focus);
      else window.scrollTo({ top: 0 });
    });
  };

  // Which field has the keyboard up, from anywhere on the page.
  useEffect(() => {
    const field = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.dataset.field : undefined;
    const focusIn = (e: FocusEvent) => {
      const focus = field(e.target);
      if (!focus) return;
      setMock((m) => ({ ...m, focus }));
      if (desktop) clearKeyboard(e.target as HTMLElement);
    };
    const focusOut = (e: FocusEvent) => {
      if (!field(e.relatedTarget)) setMock((m) => ({ ...m, focus: null }));
    };
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
    };
  }, [desktop]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the first screen's field, once
  useEffect(() => {
    if (mock.focus) focusField(mock.focus);
  }, []);

  return (
    <div data-look={search.look} className={styles.stached}>
      <div aria-hidden="true" className={styles.crt} />
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        <Controls current={current} onJump={jump} />
        <Screen
          title="Admin"
          subtitle={
            <Tabs
              tab={mock.tab}
              onTab={(tab) => setMock((m) => ({ ...m, tab }))}
            />
          }
          error={null}
          onRetry={noop}
        >
          {mock.tab === "runs" ? (
            <PastRuns stats={STATS} />
          ) : (
            <StageTab mock={mock} update={setMock} />
          )}
        </Screen>
        {mock.focus && desktop && <div style={{ height: KEYBOARD_PX }} />}
      </div>
      {mock.focus && desktop && <Keyboard field={mock.focus} />}
    </div>
  );
};

export default AdminMockups;
