import { motion } from "motion/react";
import {
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  dayName,
  type Kind,
  MAX_GROUPS,
  plain,
  plural,
  timing,
} from "../../../stached-api/puzzles";
import { api, type Schedule } from "../api";
import Dialog from "../Dialog";
import { Cased, FitWord, shuffle } from "../Game";
import { Mustache } from "../Logo";
import { useRequest } from "../session";
import styles from "../stached.module.css";
import {
  type Board,
  type Draft,
  type DraftGroup,
  group,
  inOrder,
  isStaged,
  kindFor,
  numberOf,
  pastedFor,
  problems,
  publishedOn,
  type Stage,
  stagedOn,
  toPaste,
} from "./draft";
import Push from "./Push";
import x from "./stage.module.css";

/** Puts the keyboard up on a field, by its data-field. */
export const focusField = (field: string) =>
  document.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();

/** Return moves on, as a form's Next does, instead of submitting. */
const onReturn = (go: () => void) => (e: KeyboardEvent) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  go();
};

interface DatePickProps {
  label: string;
  date: string;
  number: number;
  onChange: (date: string) => void;
}

/** The puzzle's number and day, and the phone's own date picker to change it. */
export const DatePick = ({ label, date, number, onChange }: DatePickProps) => (
  <div className="flex items-end justify-between gap-3">
    <div className="flex flex-col gap-1.5">
      <span className={styles.label}>{label}</span>
      <span className={`${styles.display} text-[22px] leading-none`}>
        #{number} · {dayName(date)}
      </span>
    </div>
    <span className={x.datePick}>
      <span className={x.link}>Change</span>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        aria-label="Puzzle date"
      />
    </span>
  </div>
);

const Chevron = ({ up = false }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={up ? "" : "rotate-180"}
  >
    <path d="M4 13l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>
);

interface RowProps {
  group: DraftGroup;
  /** Its color slot, by place: 1 to 4, the stache, or none past four. */
  color: string;
  first: boolean;
  last: boolean;
  marked: Set<string>;
  focus: string | null;
  removable: boolean;
  onChange: (group: DraftGroup) => void;
  onMove: (by: number) => void;
  onStache: () => void;
  onRemove: () => void;
  /** Return on one of its fields: the next field, or done. */
  onReturn: (field: string) => void;
}

/**
 * A group as a bar in its color: its title, the arrows that move it and
 * Gerald, who makes it the stache group, over its four tiles. Every title and
 * tile is a text field under the tile's look, so a tap puts the keyboard up
 * right there. A word Claude Haiku changed from the paste shows what was
 * pasted under it, which a tap puts back.
 */
const Row = ({
  group: g,
  color,
  first,
  last,
  marked,
  focus,
  removable,
  onChange,
  onMove,
  onStache,
  onRemove,
  onReturn: next,
}: RowProps) => {
  const title = `t:${g.id}`;
  return (
    <motion.section
      layout="position"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      data-color={color}
      className={`${styles.bar} ${x.row}`}
    >
      <div className={x.rowHead}>
        <div
          className={x.titleField}
          data-problem={marked.has(title) || undefined}
        >
          <span className={styles.barTitle}>
            {g.stache && <Mustache className="w-7 shrink-0" />}
            <span className={g.title ? "" : x.placeholder}>
              {g.title ? <Cased text={g.title} /> : "Name the group"}
            </span>
          </span>
          <input
            data-field={title}
            value={g.title}
            onChange={(e) => onChange({ ...g, title: e.target.value })}
            onKeyDown={onReturn(() => next(title))}
            enterKeyHint="next"
            autoComplete="off"
            aria-label="Group title"
          />
        </div>
        {!g.stache && (
          <>
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={first}
              aria-label="Move up: easier"
              className={x.iconButton}
            >
              <Chevron up />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={last}
              aria-label="Move down: harder"
              className={x.iconButton}
            >
              <Chevron />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onStache}
          aria-pressed={g.stache}
          aria-label={
            g.stache ? "The stache group" : "Make it the stache group"
          }
          data-pick={marked.has("stache") || undefined}
          className={`${x.iconButton} ${x.gerald}`}
        >
          <Mustache />
        </button>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove this row"
            className={`${x.iconButton} text-[20px]`}
          >
            ✕
          </button>
        )}
      </div>
      <div className={x.tiles}>
        {g.words.map((word, i) => {
          const field = `w:${g.id}:${i}`;
          const pasted = pastedFor(g, i);
          const setWord = (value: string) =>
            onChange({
              ...g,
              words: g.words.map((w, j) => (j === i ? value : w)),
            });
          const look = word.trim() ? (
            <FitWord key={word} word={word} />
          ) : (
            <span className={x.hole}>Word</span>
          );
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a tile is its place in the row
              key={i}
              className={`${styles.tile} ${x.tileField}`}
              data-selected={focus === field || undefined}
              data-empty={!word.trim() || undefined}
              data-problem={marked.has(field) || undefined}
              data-changed={pasted !== null || undefined}
              data-edge={i === 0 ? "start" : i === 3 ? "end" : undefined}
              style={{ "--letters": word.length } as CSSProperties}
            >
              {pasted === null ? (
                look
              ) : (
                <>
                  <span className={x.changedWord}>{look}</span>
                  <button
                    type="button"
                    onClick={() => setWord(pasted)}
                    aria-label={`Put back “${pasted}”`}
                    className={x.original}
                  >
                    ↺ {pasted}
                  </button>
                </>
              )}
              <input
                data-field={field}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={onReturn(() => next(field))}
                enterKeyHint={g.stache && i === 3 ? "done" : "next"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`${g.title || "Group"}, word ${i + 1}`}
              />
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};

/** The words dealt out as players first see them, to check the red herrings. */
const Shuffled = ({ draft }: { draft: Draft }) => {
  const words = draft.groups.flatMap((g) => g.words).filter((w) => w.trim());
  const [order, setOrder] = useState(() => shuffle(words));
  return (
    <div className="flex flex-col gap-3">
      <div
        className={styles.board}
        style={{ "--rows": Math.ceil(order.length / 4) } as CSSProperties}
      >
        {order.map((word, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a word can be in twice
          <div key={`${i}:${word}`} className={styles.tile}>
            <FitWord word={word} />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOrder(shuffle(words))}
        className={styles.button}
      >
        Shuffle
      </button>
    </div>
  );
};

interface PublishProps {
  onClose: () => void;
  onPublish: (deleteGames: boolean) => void;
  draft: Draft;
  number: number;
  kind: Kind;
  announceAt: string;
  /** Games publishing deletes: the CLI's --delete-games. */
  lost: number;
}

/**
 * What the CLI's confirm says: when it goes live and pushes, and what it costs.
 * Made each time it opens, so the delete tick always starts off.
 */
const PublishDialog = ({
  onClose,
  onPublish,
  draft,
  number,
  kind,
  announceAt,
  lost,
}: PublishProps) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === "new" ? `Publish #${number}?` : `Change #${number}?`}
    >
      <div className="flex flex-col gap-4">
        <p className={`${styles.label} -mt-3`}>{dayName(draft.date)}</p>
        <ul className="flex flex-col gap-2">
          {inOrder(draft.groups).map((g, i) => (
            <li key={g.id} className="flex items-center gap-2.5">
              <span
                className={styles.swatch}
                data-color={g.stache ? "stache" : String(i + 1)}
              />
              <span className={`${styles.display} text-[14px]`}>
                <Cased text={g.title} />
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[19px] leading-snug">
          {timing(draft.date, kind, announceAt)}
        </p>
        {lost > 0 ? (
          <div className={x.danger}>
            <p className="text-[17px] leading-snug">
              People have played it. Publishing deletes their{" "}
              {plural(lost, "game")}, and their scores with them.
            </p>
            <label className="flex items-center gap-3 text-[17px]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className={x.check}
              />
              Delete {plural(lost, "game")}
            </label>
          </div>
        ) : (
          <p className={styles.label}>
            {kind === "push"
              ? "Changes only its push line, so its games stay."
              : "Once people play it, changing its words deletes their games."}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className={styles.button}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onPublish(lost > 0 && agreed)}
            disabled={lost > 0 && !agreed}
            className={`${styles.button} ${lost > 0 ? x.destroy : styles.primary}`}
          >
            {lost > 0 ? "Delete and publish" : "Publish"}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

interface BoardProps {
  schedule: Schedule;
  setSchedule: (schedule: Schedule) => void;
  /** Loads the schedule again, after a refusal that may mean it changed. */
  reload: () => void;
  board: Board;
  setStage: Dispatch<SetStateAction<Stage>>;
}

/**
 * The puzzle as rows to check and fix: its date, a bar per group, the
 * notification, and what the API would refuse. Stage puts it on the tester
 * to play; Publish sends what's staged to players.
 */
const BoardScreen = ({
  schedule,
  setSchedule,
  reload,
  board,
  setStage,
}: BoardProps) => {
  const { draft } = board;
  const { busy, error, run } = useRequest();
  const [focus, setFocus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const published = publishedOn(schedule, draft.date);
  const kind = kindFor(schedule, draft);
  const played = published?.games ?? 0;
  // Games that publishing deletes.
  const lost = kind === "edit" ? played : 0;
  const issues = problems(draft);
  const marked = new Set(issues.flatMap((p) => p.fields));
  const number = numberOf(schedule, draft.date);
  const staged = isStaged(schedule, draft);
  // This puzzle is staged on its date, edited since or not.
  const stagedHere =
    board.staged === draft.date && Boolean(stagedOn(schedule, draft.date));
  const rows = inOrder(draft.groups);
  const colored = rows.filter((g) => !g.stache).length;
  // Words Haiku changed from the paste, and not yet put back.
  const fixed = rows.flatMap((g) =>
    g.words.filter((_, i) => pastedFor(g, i) !== null),
  ).length;
  const fields = rows.flatMap((g) => [
    `t:${g.id}`,
    ...g.words.map((_, i) => `w:${g.id}:${i}`),
  ]);

  const patch = (next: Partial<Board>) =>
    setStage((s) => (s.step === "board" ? { ...s, ...next } : s));
  const setDraft = (next: (draft: Draft) => Partial<Draft>) =>
    setStage((s) =>
      s.step === "board"
        ? { ...s, draft: { ...s.draft, ...next(s.draft) } }
        : s,
    );
  const edit = (change: (groups: DraftGroup[]) => DraftGroup[]) =>
    setDraft((d) => ({ groups: change(d.groups) }));

  // The field with the keyboard up, if any: its tile shows as selected, and
  // Stage and Publish make way for the keyboard.
  useEffect(() => {
    const field = (target: EventTarget | null) =>
      target instanceof HTMLElement ? target.dataset.field : undefined;
    const focusIn = (e: FocusEvent) => setFocus(field(e.target) ?? null);
    const focusOut = (e: FocusEvent) => {
      if (!field(e.relatedTarget)) setFocus(null);
    };
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Rows trade places in the file, so the stache group keeps its own there,
  // and a move undone, or a row added and removed, is no edit.
  const move = (id: string, by: number) =>
    edit((groups) => {
      const order = inOrder(groups);
      const i = order.findIndex((g) => g.id === id);
      const [a, b] = [order[i], order[i + by]];
      return groups.map((g) => (g === a ? b : g === b ? a : g));
    });

  // The old stache group takes the new one's place and color.
  const makeStache = (id: string) =>
    edit((groups) => {
      const old = groups.find((g) => g.stache);
      const chosen = groups.find((g) => g.id === id);
      if (!chosen || chosen === old) return groups;
      const stache = { ...chosen, stache: true };
      if (!old) return groups.map((g) => (g === chosen ? stache : g));
      return groups.map((g) =>
        g === chosen ? { ...old, stache: false } : g === old ? stache : g,
      );
    });

  const nextField = (field: string) => {
    const next = fields[fields.indexOf(field) + 1];
    if (next) focusField(next);
    else (document.activeElement as HTMLElement | null)?.blur();
  };

  const toList = () => setStage(toPaste(schedule));

  const stage = async () => {
    const res = await run("stage", (token) => api.stage(token, plain(draft)));
    if (!res) return;
    let next = res.schedule;
    // Moved to another date: staged there now, and not where it was.
    const from = board.staged;
    if (from && from !== draft.date && stagedOn(next, from))
      next = (await run("stage", (token) => api.unstage(token, from))) ?? next;
    setSchedule(next);
    patch({ staged: draft.date });
    setToast(
      res.tester.ok ? "Staged, and on the tester" : "Staged, not on the tester",
    );
  };

  const unstage = async (date: string) => {
    const next = await run("unstage", (token) => api.unstage(token, date));
    if (!next) return;
    setSchedule(next);
    setStage(toPaste(next));
  };

  const publish = async (deleteGames: boolean) => {
    setPublishing(false);
    const next = await run("publish", (token) =>
      api.publish(token, draft.date, deleteGames),
    );
    if (!next) return reload();
    setSchedule(next);
    setStage({ step: "published", draft, kind, number });
  };

  // Live today, published for another day, or not published.
  const standing = published
    ? draft.date === schedule.today
      ? "live"
      : "ready"
    : "draft";
  const status = issues.length
    ? null
    : kind === "same"
      ? "Published, no changes"
      : staged
        ? "Staged"
        : stagedHere
          ? "Changes not staged"
          : "Not staged yet";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={toList} className={x.link}>
          ‹ All puzzles
        </button>
        <span className={x.pill} data-kind={standing}>
          {
            {
              live: "Live",
              ready: "Published",
              draft: stagedHere ? "Staged" : "New",
            }[standing]
          }
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <DatePick
          label="Puzzle"
          date={draft.date}
          number={number}
          onChange={(date) => setDraft(() => ({ date }))}
        />
        <p className="text-[16px] leading-snug opacity-80">
          {timing(draft.date, kind, schedule.announceAt)}
        </p>
        {stagedOn(schedule, draft.date) && !stagedHere && (
          <p className={`${styles.label} ${styles.alert}`}>
            Staging replaces the one staged for {dayName(draft.date)}
          </p>
        )}
      </div>

      {played > 0 && (
        <div className={x.danger}>
          <p className="text-[16px] leading-snug">
            <strong>
              {played === 1 ? "1 person has" : `${played} people have`} played
              it.
            </strong>{" "}
            Changing a word or a title deletes their games. Its push line is
            safe to change.
          </p>
        </div>
      )}

      {board.pasted !== null && (
        <div className={x.note}>
          <p className="text-[16px] leading-snug">
            <span className={`${styles.label} mr-1.5`}>Claude Haiku</span>
            sorted your paste into rows.{" "}
            {draft.groups.some((g) => g.stache)
              ? "It picked the stache group: check it."
              : "It couldn't tell which is the stache group."}
            {fixed > 0 &&
              ` It fixed ${plural(fixed, "word")}: tap ↺ to put yours back.`}
          </p>
          <button
            type="button"
            onClick={() =>
              setStage({
                step: "paste",
                date: draft.date,
                text: board.pasted ?? "",
              })
            }
            className={`${x.link} self-start`}
          >
            ‹ Back to the paste
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className={`${styles.label} leading-relaxed`}>
          {board.view === "rows"
            ? "Easiest first. Gerald marks the stache"
            : "As players first see it"}
        </p>
        <div className={x.segment}>
          {(["rows", "shuffled"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => patch({ view })}
              data-on={board.view === view || undefined}
              className={styles.display}
            >
              {view === "rows" ? "Rows" : "Shuffled"}
            </button>
          ))}
        </div>
      </div>

      {board.view === "shuffled" ? (
        <Shuffled draft={draft} />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((g, i) => (
            <Row
              key={g.id}
              group={g}
              color={g.stache ? "stache" : i < 4 ? String(i + 1) : "none"}
              first={i === 0}
              last={i === colored - 1}
              marked={marked}
              focus={focus}
              removable={rows.length > 4 && !g.stache}
              onChange={(next) =>
                edit((groups) => groups.map((h) => (h.id === g.id ? next : h)))
              }
              onMove={(by) => move(g.id, by)}
              onStache={() => makeStache(g.id)}
              onRemove={() =>
                edit((groups) => groups.filter((h) => h.id !== g.id))
              }
              onReturn={nextField}
            />
          ))}
          {rows.length < MAX_GROUPS && (
            <button
              type="button"
              onClick={() =>
                edit((groups) => {
                  // After the last colored row in the file, as on the board.
                  const at = groups.findLastIndex((g) => !g.stache) + 1;
                  return [...groups.slice(0, at), group(), ...groups.slice(at)];
                })
              }
              className={x.addRow}
            >
              + Add a row
            </button>
          )}
        </div>
      )}

      <Push
        number={number}
        date={draft.date}
        push={draft.push}
        none={Boolean(published?.pushed) || draft.date < schedule.today}
        reach={schedule.reach}
        busy={busy}
        onSuggest={
          schedule.haiku
            ? async () => {
                const res = await run("suggest", (token) =>
                  api.suggestPush(token, plain(draft).groups),
                );
                if (res) setDraft(() => ({ push: res.push }));
              }
            : undefined
        }
        onChange={(push) => setDraft(() => ({ push }))}
      />

      {issues.length > 0 && (
        <section id="problems" className={x.problems}>
          <h2 className={`${styles.label} ${styles.alert}`}>
            Fix before staging
          </h2>
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => {
              const field = issue.fields.find((f) => /^[tw]:/.test(f));
              return (
                <li key={issue.text}>
                  <button
                    type="button"
                    onClick={() =>
                      field
                        ? focusField(field)
                        : document
                            .querySelector(`.${x.rowHead}`)
                            ?.scrollIntoView({ block: "center" })
                    }
                    className="text-left text-[17px] leading-snug"
                  >
                    {issue.text}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {stagedHere && (
        <button
          type="button"
          onClick={() => unstage(draft.date)}
          disabled={Boolean(busy)}
          className={`${x.link} ${styles.alert} self-center`}
        >
          {busy === "unstage" ? "Unstaging…" : "Unstage"}
        </button>
      )}

      {!focus && (
        <div className={x.actions}>
          {toast && (
            <p role="status" className={`${styles.toast} ${x.actionToast}`}>
              {toast}
            </p>
          )}
          <div className="flex min-h-4 justify-center text-center">
            {error ? (
              <p className={`${styles.label} ${styles.alert}`}>{error}</p>
            ) : status ? (
              <p className={styles.label}>{status}</p>
            ) : (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("problems")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className={`${styles.label} ${styles.alert}`}
              >
                {issues.length} to fix before staging ↓
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={stage}
              disabled={Boolean(busy) || issues.length > 0 || kind === "same"}
              className={`${styles.button} ${staged ? "" : styles.primary}`}
            >
              {busy === "stage" ? "Staging…" : "Stage"}
            </button>
            <button
              type="button"
              onClick={() => setPublishing(true)}
              disabled={Boolean(busy) || !staged || kind === "same"}
              className={`${styles.button} ${staged ? styles.primary : ""}`}
            >
              {busy === "publish"
                ? "Publishing…"
                : kind === "new"
                  ? "Publish"
                  : "Publish changes"}
            </button>
          </div>
        </div>
      )}

      {publishing && (
        <PublishDialog
          onClose={() => setPublishing(false)}
          onPublish={publish}
          draft={draft}
          number={number}
          kind={kind}
          announceAt={schedule.announceAt}
          lost={lost}
        />
      )}
    </div>
  );
};

export default BoardScreen;
