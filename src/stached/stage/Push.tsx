import { plural } from "../Admin";
import { formatDate } from "../api";
import { LockScreen } from "../IPhone";
import styles from "../stached.module.css";
import x from "./stage.module.css";

// What the lock screen shows of it: about three lines.
const ROOM = 110;

interface PushProps {
  number: number;
  date: string;
  /** Its line; empty takes a random quote from home. */
  push: string;
  /** Why it has no push to send, if it hasn't: one went out, or none will. */
  none: string | null;
  /** Browsers that get each push. */
  reach: number;
  suggesting: boolean;
  /** Asks Claude Haiku for a line; none without an Anthropic key. */
  onSuggest?: () => void;
  onChange: (push: string) => void;
}

/** The push's line, under the lock screen it lands on. */
const Push = ({
  number,
  date,
  push,
  none,
  reach,
  suggesting,
  onSuggest,
  onChange,
}: PushProps) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={styles.label}>Notification</h2>
      <span className={styles.label}>
        {none ? "No push to send" : `To ${plural(reach, "device")}`}
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
            {onSuggest && (
              <button
                type="button"
                onClick={onSuggest}
                disabled={suggesting}
                className={x.link}
              >
                {suggesting ? "Thinking…" : "Suggest one"}
              </button>
            )}
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
            {push.length > ROOM ? "iOS cuts it off" : `${push.length}/${ROOM}`}
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

export default Push;
