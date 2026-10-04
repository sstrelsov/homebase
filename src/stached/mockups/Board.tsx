import { motion } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import Dialog from "../Dialog";
import { Cased, FitWord, shuffle } from "../Game";
import { Mustache } from "../Logo";
import styles from "../stached.module.css";
import x from "./mockups.module.css";
import Push from "./Push";
import {
  type Draft,
  type DraftGroup,
  dayName,
  group,
  type Kind,
  kindOf,
  numberOf,
  problems,
  type Spot,
  timing,
} from "./rules";
import { STATS } from "./sample";
import {
  type Board,
  gamesLost,
  type Mock,
  nextOpen,
  otherDrafts,
  publishedOn,
  type Update,
} from "./state";

/** Puts the keyboard up on a field, by its data-field. */
export const focusField = (field: string) =>
  document.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();

/** "9:41pm" */
const clock = () =>
  new Date()
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "")
    .toLowerCase();

/** Return moves on, as a form's Next does, instead of submitting. */
const onReturn = (go: () => void) => (e: KeyboardEvent) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  go();
};

/** The stache group last, after the rest in their order: easiest first. */
const inOrder = (groups: DraftGroup[]) => [
  ...groups.filter((g) => !g.stache),
  ...groups.filter((g) => g.stache),
];

interface DatePickProps {
  label: string;
  date: string;
  number: number;
  onChange: (date: string) => void;
  problem?: boolean;
}

/** The puzzle's number and day, and the phone's own date picker to change it. */
export const DatePick = ({
  label,
  date,
  number,
  onChange,
  problem,
}: DatePickProps) => (
  <div className="flex items-end justify-between gap-3">
    <div className="flex flex-col gap-1.5">
      <span className={styles.label}>{label}</span>
      <span
        className={`${styles.display} text-[22px] leading-none ${problem ? styles.alert : ""}`}
      >
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
  marked: Set<Spot>;
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
 * right there.
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
  const title = `t:${g.id}` as const;
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
          const field = `w:${g.id}:${i}` as const;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a tile is its place in the row
              key={i}
              className={`${styles.tile} ${x.tileField}`}
              data-selected={focus === field || undefined}
              data-empty={!word.trim() || undefined}
              data-problem={marked.has(field) || undefined}
              data-edge={i === 0 ? "start" : i === 3 ? "end" : undefined}
              style={{ "--letters": word.length } as CSSProperties}
            >
              {word.trim() ? (
                <FitWord key={word} word={word} />
              ) : (
                <span className={x.hole}>Word</span>
              )}
              <input
                data-field={field}
                value={word}
                onChange={(e) =>
                  onChange({
                    ...g,
                    words: g.words.map((w, j) =>
                      j === i ? e.target.value : w,
                    ),
                  })
                }
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
  open: boolean;
  onClose: () => void;
  onPublish: () => void;
  draft: Draft;
  number: number;
  kind: Kind;
  /** Games publishing deletes: the CLI's --delete-games. */
  lost: number;
}

/** What the CLI's confirm says: when it goes live and pushes, and what it costs. */
const PublishDialog = ({
  open,
  onClose,
  onPublish,
  draft,
  number,
  kind,
  lost,
}: PublishProps) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <Dialog
      open={open}
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
        <p className="text-[19px] leading-snug">{timing(draft.date, kind)}</p>
        {lost > 0 ? (
          <div className={x.danger}>
            <p className="text-[17px] leading-snug">
              People have played it. Publishing deletes their {lost} games, and
              their scores with them.
            </p>
            <label className="flex items-center gap-3 text-[17px]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className={x.check}
              />
              Delete {lost} games
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
            onClick={onPublish}
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

/** A note in a box, for what Haiku did or what's at stake. */
const Note = ({
  danger,
  children,
}: {
  danger?: boolean;
  children: ReactNode;
}) => <div className={danger ? x.danger : x.note}>{children}</div>;

interface BoardProps {
  mock: Mock;
  board: Board;
  update: Update;
}

/**
 * The puzzle as rows to check and fix: its date, a bar per group, the
 * notification, and what the server would refuse. Save draft stages it;
 * Publish confirms it.
 */
const BoardScreen = ({ mock, board, update }: BoardProps) => {
  const { schedule, focus } = mock;
  const { draft } = board;
  const published = publishedOn(schedule, draft.date);
  const kind = kindOf(draft, published);
  const lost = gamesLost(schedule, draft);
  const issues = problems(draft, otherDrafts(schedule, board));
  const marked = new Set(issues.flatMap((p) => p.spots));
  const number = numberOf(draft.date, schedule);
  const rows = inOrder(draft.groups);
  const colored = rows.filter((g) => !g.stache).length;
  const fields = rows.flatMap((g) => [
    `t:${g.id}`,
    ...g.words.map((_, i) => `w:${g.id}:${i}`),
  ]);

  const patch = (next: Partial<Board>) =>
    update((m) => ({ ...m, stage: { ...board, ...next } }));
  const edit = (change: (groups: DraftGroup[]) => DraftGroup[]) =>
    update((m) => ({
      ...m,
      stage: {
        ...board,
        draft: { ...draft, groups: change(draft.groups) },
        savedAt: null,
      },
    }));
  const setDraft = (next: Partial<Draft>) =>
    patch({ draft: { ...draft, ...next }, savedAt: null });

  useEffect(() => {
    if (!board.toast) return;
    const timer = setTimeout(
      () =>
        update((m) =>
          m.stage.step === "board"
            ? { ...m, stage: { ...m.stage, toast: null } }
            : m,
        ),
      2200,
    );
    return () => clearTimeout(timer);
  }, [board.toast, update]);

  const move = (id: string, by: number) =>
    edit((groups) => {
      const order = inOrder(groups);
      const i = order.findIndex((g) => g.id === id);
      [order[i], order[i + by]] = [order[i + by], order[i]];
      return order;
    });

  // The old stache group takes the new one's place and color.
  const makeStache = (id: string) =>
    edit((groups) => {
      const old = groups.find((g) => g.stache);
      const chosen = groups.find((g) => g.id === id);
      if (!chosen || chosen === old) return groups;
      const rest = groups
        .filter((g) => !g.stache)
        .flatMap((g) =>
          g.id !== id ? [g] : old ? [{ ...old, stache: false }] : [],
        );
      return [...rest, { ...chosen, stache: true }];
    });

  const nextField = (field: string) => {
    const next = fields[fields.indexOf(field) + 1];
    if (next) focusField(next);
    else (document.activeElement as HTMLElement | null)?.blur();
  };

  const toList = (date = nextOpen(schedule)) =>
    update((m) => ({ ...m, stage: { step: "paste", date, text: "" } }));

  const withoutOwnDraft = (entries: typeof schedule) =>
    entries.filter((p) => !(p.status === "draft" && p.date === board.draftOf));

  const save = () =>
    update((m) => ({
      ...m,
      schedule: [
        ...withoutOwnDraft(m.schedule),
        { ...draft, status: "draft", games: 0 },
      ],
      stage: {
        ...board,
        draftOf: draft.date,
        savedAt: clock(),
        toast: "Draft saved",
      },
    }));

  const publish = () =>
    update((m) => ({
      ...m,
      schedule: [
        ...withoutOwnDraft(m.schedule).filter((p) => p !== published),
        {
          ...draft,
          status: "published",
          games: lost ? 0 : (published?.games ?? 0),
        },
      ],
      stage: { step: "published", draft, kind },
    }));

  const remove = () =>
    update((m) => {
      const rest = withoutOwnDraft(m.schedule);
      return {
        ...m,
        schedule: rest,
        stage: { step: "paste", date: nextOpen(rest), text: "" },
      };
    });

  const played = published?.games ?? 0;
  const status = issues.length
    ? null
    : board.savedAt
      ? `Draft saved at ${board.savedAt}`
      : published
        ? kind === "same"
          ? "Published, no changes"
          : "Changes not published yet"
        : board.draftOf
          ? "Draft"
          : "Not saved yet";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => toList()} className={x.link}>
          ‹ All puzzles
        </button>
        <span
          className={x.pill}
          data-kind={published ? (played ? "live" : "ready") : "draft"}
        >
          {published ? (played ? "Live" : "Published") : "Draft"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <DatePick
          label="Puzzle"
          date={draft.date}
          number={number}
          onChange={(date) => setDraft({ date })}
          problem={marked.has("date")}
        />
        <p className="text-[16px] leading-snug opacity-80">
          {timing(draft.date, kind)}
        </p>
      </div>

      {played > 0 && (
        <Note danger>
          <p className="text-[16px] leading-snug">
            <strong>{played} people have played it.</strong> Changing a word or
            a title deletes their games. Its notification line is safe to
            change.
          </p>
        </Note>
      )}

      {board.pasted !== null && (
        <Note>
          <p className="text-[16px] leading-snug">
            <span className={`${styles.label} mr-1.5`}>Claude Haiku</span>
            sorted your paste into rows, in your order.{" "}
            {draft.groups.some((g) => g.stache)
              ? "It picked the stache group: check it."
              : "It couldn't tell which is the stache group."}
          </p>
          <button
            type="button"
            onClick={() =>
              update((m) => ({
                ...m,
                stage: {
                  step: "paste",
                  date: draft.date,
                  text: board.pasted ?? "",
                },
              }))
            }
            className={`${x.link} self-start`}
          >
            ‹ Back to the paste
          </button>
        </Note>
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
              onRemove={() => edit((groups) => groups.filter((h) => h !== g))}
              onReturn={nextField}
            />
          ))}
          {rows.length < 5 && (
            <button
              type="button"
              onClick={() =>
                edit((groups) => {
                  const order = inOrder(groups);
                  order.splice(colored, 0, group());
                  return order;
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
        published={Boolean(published)}
        reach={STATS.notifications}
        onChange={(push) => setDraft({ push })}
      />

      {issues.length > 0 && (
        <section id="problems" className={x.problems}>
          <h2 className={`${styles.label} ${styles.alert}`}>
            Fix before publishing
          </h2>
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => {
              const field = issue.spots.find((s) => /^[tw]:/.test(s));
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

      {board.draftOf && (
        <button
          type="button"
          onClick={remove}
          className={`${x.link} ${styles.alert} self-center`}
        >
          Delete this draft
        </button>
      )}

      {!focus && (
        <div className={x.actions}>
          {board.toast && (
            <p role="status" className={`${styles.toast} ${x.actionToast}`}>
              {board.toast}
            </p>
          )}
          <div className="flex min-h-4 justify-center">
            {status ? (
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
                {issues.length} to fix before publishing ↓
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={save}
              disabled={marked.has("date")}
              className={styles.button}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => patch({ publishing: true })}
              disabled={issues.length > 0 || kind === "same"}
              className={`${styles.button} ${styles.primary}`}
            >
              {kind === "new" ? "Publish" : "Publish changes"}
            </button>
          </div>
        </div>
      )}

      <PublishDialog
        open={board.publishing}
        onClose={() => patch({ publishing: false })}
        onPublish={publish}
        draft={draft}
        number={number}
        kind={kind}
        lost={lost}
      />
    </div>
  );
};

export default BoardScreen;
