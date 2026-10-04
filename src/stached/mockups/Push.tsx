import { useState } from "react";
import QUOTES from "../quotes.json";
import styles from "../stached.module.css";
import x from "./mockups.module.css";
import { PUSH_TIME, pushed, TODAY } from "./rules";

// Haiku's suggestions, faked: the same few in turn.
const SUGGESTIONS = [
  "Shaken, stirred, or dunked?",
  "Four groups walk into a bar",
  "Dip it, shake it, crack the keys",
];

// iOS shows about three lines of it on the lock screen.
const ROOM = 110;

/** "9:12", for the lock screen's clock. */
const CLOCK = PUSH_TIME.slice(0, -2);

/** "Monday, October 5" */
const longDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/** When its push goes out: never, already, within a minute, or at 9:12. */
export function pushWhen(date: string, published: boolean) {
  if (date < TODAY) return "never";
  if (date === TODAY && pushed(date)) return published ? "sent" : "now";
  return "later";
}

interface PreviewProps {
  number: number;
  date: string;
  push: string;
  /** A puzzle on its date is out already, so today's push may be sent. */
  published: boolean;
}

/**
 * The push as it lands on an iPhone's lock screen: "Puzzle #N is up", iOS's
 * "from Stached", and the line, or a crawl line when it has none.
 */
export const PushPreview = ({
  number,
  date,
  push,
  published,
}: PreviewProps) => {
  const now = pushWhen(date, published) === "now";
  return (
    <div className={x.lock}>
      <p className={x.lockDay}>{longDay(date)}</p>
      <p className={x.lockTime}>{now ? "Now" : CLOCK}</p>
      <div className={x.notice}>
        <img
          src="/images/stached-icon-v2-180.png"
          alt=""
          className={x.noticeIcon}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <strong className="truncate">Puzzle #{number} is up</strong>
            <span className={x.noticeWhen}>{now ? "now" : `${CLOCK} AM`}</span>
          </div>
          <p className={x.noticeFrom}>from Stached</p>
          <p className={x.noticeBody} data-crawl={!push || undefined}>
            {push || QUOTES[3]}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PushProps extends PreviewProps {
  onChange: (push: string) => void;
  /** Home-screen apps with notifications on. */
  reach: number;
}

/** The push's line, with its lock screen above it. */
const Push = ({ onChange, reach, ...puzzle }: PushProps) => {
  const { date, push } = puzzle;
  const [suggesting, setSuggesting] = useState(false);
  const when = pushWhen(date, puzzle.published);
  const sent = when === "never" || when === "sent";

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
          {sent ? "No push to send" : `To ${reach} home-screen apps`}
        </span>
      </div>
      <PushPreview {...puzzle} />
      {sent ? (
        <p className={styles.label}>
          {when === "never"
            ? "It's dated before today, so it gets no push."
            : `It went out at ${PUSH_TIME}. A puzzle never pushes twice.`}
        </p>
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
            placeholder="Its own line, or leave it for a crawl line"
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
                  Use a crawl line
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
              No line of its own: it gets a random one from the crawl, like
              this.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default Push;
