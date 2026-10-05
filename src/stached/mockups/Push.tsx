import { useState } from "react";
import { formatDate } from "../api";
import { LockScreen } from "../IPhone";
import styles from "../stached.module.css";
import x from "./mockups.module.css";
import { PUSH_TIME, pushed, TODAY } from "./rules";

// Haiku's suggestions, faked: the same few in turn.
const SUGGESTIONS = [
  "Shaken, stirred, or dunked?",
  "Four groups walk into a bar",
  "Dip it, shake it, crack the keys",
];

// What the lock screen shows of it: about three lines.
const ROOM = 110;

/** Why it has no push to send, if it hasn't: one went out, or none will. */
const noPush = (date: string, published: boolean) =>
  published && pushed(date)
    ? `It went out at ${PUSH_TIME}. A puzzle never pushes twice.`
    : date < TODAY
      ? "It's dated before today, so it gets no push."
      : null;

interface PushProps {
  number: number;
  date: string;
  /** Its line; empty takes a random quote from home. */
  push: string;
  /** Published already, so its push may have gone out. */
  published: boolean;
  /** Home-screen apps with notifications on. */
  reach: number;
  onChange: (push: string) => void;
}

/** The push's line, under the lock screen it lands on. */
const Push = ({
  number,
  date,
  push,
  published,
  reach,
  onChange,
}: PushProps) => {
  const [suggesting, setSuggesting] = useState(false);
  const none = noPush(date, published);

  const suggest = () => {
    setSuggesting(true);
    setTimeout(() => {
      const next = SUGGESTIONS.indexOf(push) + 1;
      onChange(SUGGESTIONS[next % SUGGESTIONS.length]);
      setSuggesting(false);
    }, 900);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={styles.label}>Notification</h2>
        <span className={styles.label}>
          {none ? "No push to send" : `To ${reach} home-screen apps`}
        </span>
      </div>
      <LockScreen
        number={number}
        day={formatDate(date, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        line={push || undefined}
      />
      {none ? (
        <p className={styles.label}>{none}</p>
      ) : (
        <>
          <textarea
            data-field="push"
            value={push}
            onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            enterKeyHint="done"
            rows={2}
            placeholder="Its own line, or leave it for a quote"
            className={`${styles.input} ${x.pushInput}`}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-5">
              <button
                type="button"
                onClick={suggest}
                disabled={suggesting}
                className={x.link}
              >
                {suggesting ? "Thinking…" : "Suggest one"}
              </button>
              {push && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className={x.link}
                >
                  Use a quote
                </button>
              )}
            </div>
            <span
              className={`${styles.label} ${push.length > ROOM ? styles.alert : ""}`}
            >
              {push.length > ROOM
                ? "iOS cuts it off"
                : `${push.length}/${ROOM}`}
            </span>
          </div>
          {!push && (
            <p className={styles.label}>
              No line of its own: it gets a random quote from home, like this.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default Push;
