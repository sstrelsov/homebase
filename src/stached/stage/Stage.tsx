import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { clockTime, dayName, timing } from "../../../stached-api/puzzles";
import { plural } from "../Admin";
import { ApiError, api, type Schedule } from "../api";
import Logo from "../Logo";
import { Retry } from "../Screen";
import { useLoad, useStached } from "../session";
import styles from "../stached.module.css";
import BoardScreen, { DatePick, focusField } from "./Board";
import {
  addDays,
  type Board,
  blank,
  loadStage,
  nextOpen,
  numberOf,
  publishedOn,
  type Stage,
  saveStage,
  stagedOn,
  toDraft,
} from "./draft";
import x from "./stage.module.css";

type Step<S extends Stage["step"]> = Extract<Stage, { step: S }>;

/** Organize waits for this many words, as the API does (haiku.ts). */
const ENOUGH_WORDS = 4;

const board = (more: Omit<Board, "step" | "view">): Board => ({
  step: "board",
  view: "rows",
  ...more,
});

/** "Today", "Tomorrow", or the weekday. */
const weekday = (schedule: Schedule, date: string) =>
  date === schedule.today
    ? "Today"
    : date === addDays(schedule.today, 1)
      ? "Tomorrow"
      : dayName(date).slice(0, 3);

/** A day ahead: its puzzle and how it stands, or a gap to fill. */
const Day = ({
  date,
  schedule,
  onOpen,
  onStage,
}: {
  date: string;
  schedule: Schedule;
  onOpen: (board: Board) => void;
  onStage: (date: string) => void;
}) => {
  const published = publishedOn(schedule, date);
  const staged = stagedOn(schedule, date);
  const puzzle = staged ?? published;
  const state = published
    ? date === schedule.today
      ? "live"
      : "ready"
    : staged
      ? "draft"
      : "open";
  const number = numberOf(schedule, date);
  const detail = !puzzle
    ? "Nothing yet"
    : staged
      ? published
        ? `#${number} · an edit staged`
        : "Not live"
      : date === schedule.today
        ? `#${number} · ${plural(published?.games ?? 0, "game")}`
        : `#${number} · pushes ${clockTime(schedule.announceAt)}`;
  return (
    <li>
      <button
        type="button"
        onClick={() =>
          puzzle
            ? onOpen(
                board({
                  draft: toDraft(puzzle),
                  pasted: null,
                  staged: staged ? date : null,
                }),
              )
            : onStage(date)
        }
        className={x.day}
        data-state={state}
      >
        <span className="flex flex-col gap-1">
          <span className={styles.label}>{weekday(schedule, date)}</span>
          <span className={x.dayDate}>{dayName(date).slice(5)}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`${styles.display} text-[12px]`}>{detail}</span>
          <span className={x.dayTitles}>
            {puzzle
              ? puzzle.groups.map((g) => g.title).join(" · ")
              : "Tap to stage one"}
          </span>
        </span>
        <span className={x.pill} data-kind={state}>
          {
            {
              live: "Live",
              ready: "Published",
              draft: "Staged",
              open: "+ Stage",
            }[state]
          }
        </span>
      </button>
    </li>
  );
};

interface StepProps<S extends Stage["step"]> {
  schedule: Schedule;
  stage: Step<S>;
  setStage: Dispatch<SetStateAction<Stage>>;
}

/**
 * The Stage tab's start: a box for whatever Spencer has, for Claude Haiku to
 * sort, and the days ahead, from today to the last puzzle, gaps and all.
 */
const Paste = ({ schedule, stage, setStage }: StepProps<"paste">) => {
  const set = (next: Partial<Step<"paste">>) =>
    setStage({ ...stage, note: undefined, ...next });
  const taken = stagedOn(schedule, stage.date)
    ? "a staged puzzle"
    : publishedOn(schedule, stage.date) && "a published puzzle";
  const dates = [...schedule.published, ...schedule.staged].map((p) => p.date);
  const first = [schedule.today, ...dates].sort()[0];
  const last = [addDays(schedule.today, 6), ...dates].sort().at(-1) as string;
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  const enough = stage.text.split(/\s+/).filter(Boolean).length >= ENOUGH_WORDS;
  const canPaste = Boolean(navigator.clipboard?.readText);

  return (
    <div className="flex flex-col gap-9">
      <section className="flex flex-col gap-3">
        <DatePick
          label="New puzzle"
          date={stage.date}
          number={numberOf(schedule, stage.date)}
          onChange={(date) => set({ date })}
        />
        {taken && (
          <p className={`${styles.label} ${styles.alert}`}>
            {dayName(stage.date)} has {taken} already
          </p>
        )}
        <textarea
          data-field="paste"
          value={stage.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder={
            "Paste or type the groups, any shape:\n\ncookies: chocolate chip, oatmeal, sugar…"
          }
          className={`${styles.input} ${x.paste}`}
        />
        {stage.note && (
          <p className={`${styles.label} ${styles.alert}`}>{stage.note}</p>
        )}
        <div
          className={`grid gap-3 ${canPaste ? "grid-cols-[1fr_2fr]" : "grid-cols-1"}`}
        >
          {canPaste && (
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .readText()
                  .then((text) => set({ text }))
                  .catch(() => focusField("paste"))
              }
              className={styles.button}
            >
              Paste
            </button>
          )}
          <button
            type="button"
            onClick={() => setStage({ ...stage, step: "organizing" })}
            disabled={!enough || !schedule.haiku}
            className={`${styles.button} ${styles.primary}`}
          >
            Organize
          </button>
        </div>
        <p className={`${styles.label} text-center leading-relaxed`}>
          {schedule.haiku
            ? "Claude Haiku sorts it into rows for you to check. "
            : "Organize is off: the API has no Anthropic key. "}
          <button
            type="button"
            onClick={() =>
              setStage(
                board({ draft: blank(stage.date), pasted: null, staged: null }),
              )
            }
            className="underline underline-offset-4"
          >
            {schedule.haiku ? "Or start with empty rows" : "Type into rows"}
          </button>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={styles.label}>Coming up</h2>
        <ul className="flex flex-col gap-2">
          {days.map((date) => (
            <Day
              key={date}
              date={date}
              schedule={schedule}
              onOpen={setStage}
              onStage={(date) => {
                set({ date });
                window.scrollTo({ top: 0, behavior: "smooth" });
                focusField("paste");
              }}
            />
          ))}
        </ul>
      </section>
    </div>
  );
};

/** Haiku at work: the paste, and the rows tuning in. */
const Organizing = ({ stage, setStage }: StepProps<"organizing">) => {
  const { session, signOut } = useStached();

  // biome-ignore lint/correctness/useExhaustiveDependencies: one call per paste
  useEffect(() => {
    let cancelled = false;
    const back = (note: string) => setStage({ ...stage, step: "paste", note });
    api.organize(session.token, stage.text).then(
      (answer) => {
        if (cancelled) return;
        if ("notEnough" in answer) return back(answer.notEnough);
        setStage(
          board({
            draft: toDraft({ date: stage.date, ...answer }),
            pasted: stage.text,
            staged: null,
          }),
        );
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) signOut();
        else back(err.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className={x.pasted}>{stage.text}</p>
      <p className={`${styles.display} ${styles.stacheText} ${x.tuning}`}>
        Claude Haiku is sorting it…
      </p>
      <div className="flex flex-col gap-3">
        {["1", "2", "3", "stache"].map((color, i) => (
          <div
            key={color}
            data-color={color}
            className={`${styles.bar} ${x.ghost}`}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setStage({ ...stage, step: "paste" })}
        className={styles.button}
      >
        Cancel
      </button>
    </div>
  );
};

/** The station ident, for a puzzle on its way. */
const Published = ({ schedule, stage, setStage }: StepProps<"published">) => {
  const { draft, kind, number } = stage;
  const next = nextOpen(schedule);
  const toPaste = () => setStage({ step: "paste", date: next, text: "" });
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-full max-w-[320px]">
        <Logo intro />
      </div>
      <h2
        className={`${styles.title} ${styles.rise} text-[30px]`}
        style={{ animationDelay: "0.9s" }}
      >
        Published!
      </h2>
      <div
        className={`${styles.rise} flex flex-col gap-3`}
        style={{ animationDelay: "1.1s" }}
      >
        <p className={`${styles.display} text-[17px]`}>
          #{number} · {dayName(draft.date)}
        </p>
        <p className="text-[18px] leading-snug">
          {timing(draft.date, kind, schedule.announceAt)}
        </p>
      </div>
      <div
        className={`${styles.rise} mt-2 grid w-full grid-cols-2 gap-3`}
        style={{ animationDelay: "1.3s" }}
      >
        <button type="button" onClick={toPaste} className={styles.button}>
          Done
        </button>
        <button
          type="button"
          onClick={() => {
            toPaste();
            focusField("paste");
          }}
          className={`${styles.button} ${styles.primary}`}
        >
          Stage {weekday(schedule, next)}
        </button>
      </div>
    </div>
  );
};

/** What the tab shows, kept on this device (draft.ts). */
function useStage(schedule: Schedule | null) {
  const [stage, setStage] = useState<Stage | null>(loadStage);
  const shown: Stage | null =
    stage ??
    (schedule && { step: "paste", date: nextOpen(schedule), text: "" });
  useEffect(() => {
    if (stage) saveStage(stage);
  }, [stage]);
  const set: Dispatch<SetStateAction<Stage>> = (next) =>
    setStage((s) => {
      const current = s ?? shown;
      if (!current) return s;
      return typeof next === "function" ? next(current) : next;
    });
  return [shown, set] as const;
}

/**
 * The admin's second tab: write a puzzle (pasted and sorted by Claude Haiku,
 * or typed), stage it to play on the tester, and publish it.
 */
const StageTab = () => {
  const {
    data: schedule,
    setData: setSchedule,
    error,
    load,
  } = useLoad(api.schedule);
  const [stage, setStage] = useStage(schedule);

  if (error)
    return <Retry error={error} onRetry={load} className="text-left" />;
  if (!schedule || !stage) return <p className={styles.label}>Loading…</p>;
  const props = { schedule, setStage };
  if (stage.step === "paste") return <Paste {...props} stage={stage} />;
  if (stage.step === "organizing")
    return <Organizing {...props} stage={stage} />;
  if (stage.step === "published") return <Published {...props} stage={stage} />;
  return (
    <BoardScreen
      {...props}
      board={stage}
      setSchedule={setSchedule}
      reload={load}
    />
  );
};

export default StageTab;
