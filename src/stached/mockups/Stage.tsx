import { useEffect } from "react";
import Logo from "../Logo";
import styles from "../stached.module.css";
import BoardScreen, { DatePick, focusField } from "./Board";
import x from "./mockups.module.css";
import {
  addDays,
  dayName,
  type Entry,
  numberOf,
  PUSH_TIME,
  TODAY,
  timing,
} from "./rules";
import { blank, organized, PASTE } from "./sample";
import {
  board,
  type Mock,
  nextOpen,
  opened,
  publishedOn,
  type Update,
} from "./state";

type Step<S extends Mock["stage"]["step"]> = Extract<
  Mock["stage"],
  { step: S }
>;

const weekday = (date: string) =>
  date === TODAY
    ? "Today"
    : date === addDays(TODAY, 1)
      ? "Tomorrow"
      : dayName(date).slice(0, 3);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A day on the schedule: its puzzle and how it stands, or a gap to fill. */
const Day = ({
  date,
  schedule,
  onOpen,
  onStage,
}: {
  date: string;
  schedule: Entry[];
  onOpen: (entry: Entry) => void;
  onStage: (date: string) => void;
}) => {
  const published = publishedOn(schedule, date);
  const draft = schedule.find((p) => p.status === "draft" && p.date === date);
  const entry = draft ?? published;
  const state = published
    ? date === TODAY
      ? "live"
      : "ready"
    : draft
      ? "draft"
      : "open";
  const number = numberOf(date, schedule);
  const detail = !entry
    ? "Nothing yet"
    : draft
      ? published
        ? `#${number} · an edit in draft`
        : "Not live"
      : date === TODAY
        ? `#${number} · ${plural(published?.games ?? 0, "game")}`
        : `#${number} · pushes ${PUSH_TIME}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => (entry ? onOpen(entry) : onStage(date))}
        className={x.day}
        data-state={state}
      >
        <span className="flex flex-col gap-1">
          <span className={styles.label}>{weekday(date)}</span>
          <span className={x.dayDate}>{dayName(date).slice(5)}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`${styles.display} text-[12px]`}>{detail}</span>
          <span className={x.dayTitles}>
            {entry
              ? entry.groups.map((g) => g.title).join(" · ")
              : "Tap to stage one"}
          </span>
        </span>
        <span className={x.pill} data-kind={state}>
          {
            {
              live: "Live",
              ready: "Published",
              draft: "Draft",
              open: "+ Stage",
            }[state]
          }
        </span>
      </button>
    </li>
  );
};

interface PasteProps {
  mock: Mock;
  stage: Step<"paste">;
  update: Update;
}

/**
 * The Stage tab: a box for whatever Spencer has, sorted by Claude Haiku, and
 * the days ahead, from today to the last puzzle, gaps and all.
 */
const Paste = ({ mock, stage, update }: PasteProps) => {
  const { schedule } = mock;
  const set = (next: Partial<Step<"paste">>) =>
    update((m) => ({ ...m, stage: { ...stage, ...next } }));
  const taken = schedule.find((p) => p.date === stage.date);
  const last = schedule.reduce(
    (end, p) => (p.date > end ? p.date : end),
    TODAY,
  );
  const days: string[] = [];
  for (let d = TODAY; d <= last || days.length < 7; d = addDays(d, 1))
    days.push(d);

  return (
    <div className="flex flex-col gap-9">
      <section className="flex flex-col gap-3">
        <DatePick
          label="New puzzle"
          date={stage.date}
          number={numberOf(stage.date, schedule)}
          onChange={(date) => set({ date })}
        />
        {taken && (
          <p className={`${styles.label} ${styles.alert}`}>
            {dayName(stage.date)} has a{" "}
            {taken.status === "draft" ? "draft" : "published puzzle"} already
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
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button
            type="button"
            onClick={() => set({ text: PASTE })}
            className={styles.button}
          >
            Paste
          </button>
          <button
            type="button"
            onClick={() =>
              update((m) => ({
                ...m,
                focus: null,
                stage: { ...stage, step: "organizing", hold: false },
              }))
            }
            disabled={!stage.text.trim()}
            className={`${styles.button} ${styles.primary}`}
          >
            Organize
          </button>
        </div>
        <p className={`${styles.label} text-center leading-relaxed`}>
          Claude Haiku sorts it into rows for you to check.{" "}
          <button
            type="button"
            onClick={() =>
              update((m) => ({
                ...m,
                stage: board(blank(stage.date), { pasted: null }),
              }))
            }
            className="underline underline-offset-4"
          >
            Or start with empty rows
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
              onOpen={(entry) =>
                update((m) => ({
                  ...m,
                  stage:
                    entry.status === "draft"
                      ? { ...opened(entry), draftOf: entry.date }
                      : opened(entry),
                }))
              }
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
const Organizing = ({
  stage,
  update,
}: {
  stage: Step<"organizing">;
  update: Update;
}) => {
  useEffect(() => {
    if (stage.hold) return;
    // Faked: the same canned answer, whatever was pasted.
    const timer = setTimeout(
      () =>
        update((m) => ({
          ...m,
          stage: board(organized(stage.date), { pasted: stage.text }),
        })),
      2200,
    );
    return () => clearTimeout(timer);
  }, [stage, update]);

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
        onClick={() =>
          update((m) => ({ ...m, stage: { ...stage, step: "paste" } }))
        }
        className={styles.button}
      >
        Cancel
      </button>
    </div>
  );
};

/** The station ident, for a puzzle on its way. */
const Published = ({
  mock,
  stage,
  update,
}: {
  mock: Mock;
  stage: Step<"published">;
  update: Update;
}) => {
  const { draft, kind } = stage;
  const next = nextOpen(mock.schedule);
  const toPaste = (date: string) =>
    update((m) => ({ ...m, stage: { step: "paste", date, text: "" } }));
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
          #{numberOf(draft.date, mock.schedule)} · {dayName(draft.date)}
        </p>
        <p className="text-[18px] leading-snug">{timing(draft.date, kind)}</p>
      </div>
      <div
        className={`${styles.rise} mt-2 grid w-full grid-cols-2 gap-3`}
        style={{ animationDelay: "1.3s" }}
      >
        <button
          type="button"
          onClick={() => toPaste(next)}
          className={styles.button}
        >
          Done
        </button>
        <button
          type="button"
          onClick={() => {
            toPaste(next);
            focusField("paste");
          }}
          className={`${styles.button} ${styles.primary}`}
        >
          Stage{" "}
          {weekday(next) === "Tomorrow"
            ? "tomorrow"
            : dayName(next).slice(0, 3)}
        </button>
      </div>
    </div>
  );
};

/** The admin's second tab, at whatever step it's on. */
const StageTab = ({ mock, update }: { mock: Mock; update: Update }) => {
  const { stage } = mock;
  if (stage.step === "paste")
    return <Paste mock={mock} stage={stage} update={update} />;
  if (stage.step === "organizing")
    return <Organizing stage={stage} update={update} />;
  if (stage.step === "published")
    return <Published mock={mock} stage={stage} update={update} />;
  return <BoardScreen mock={mock} board={stage} update={update} />;
};

export default StageTab;
