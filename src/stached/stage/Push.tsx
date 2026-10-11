import { PUSH_ROOM, plural } from "../../../stached-api/puzzles";
import { formatDate } from "../api";
import { LockScreen } from "../IPhone";
import styles from "../stached.module.css";
import x from "./stage.module.css";

interface PushProps {
  number: number;
  date: string;
  /** Its line; empty takes a random quote from home. */
  push: string;
  /** No push to send: one went out, or none will (timing() says which). */
  none: boolean;
  /** Browsers that get each push. */
  reach: number;
  /** The screen's request under way, if any: Suggest one waits for it. */
  busy: string | null;
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
  busy,
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
    {!none && (
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
                disabled={Boolean(busy)}
                className={x.link}
              >
                {busy === "suggest" ? "Thinking…" : "Suggest one"}
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
            className={`${styles.label} ${push.length > PUSH_ROOM ? styles.alert : ""}`}
          >
            {push.length > PUSH_ROOM
              ? "iOS cuts it off"
              : `${push.length}/${PUSH_ROOM}`}
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
