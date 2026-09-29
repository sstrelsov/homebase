import { useEffect, useState } from "react";
import { api, type Play } from "./api";

const HEARTBEAT_MS = 5000;

/** The player is looking at this tab: it's on screen and in front. */
const inFront = () =>
  document.visibilityState === "visible" && document.hasFocus();

/**
 * The stache clock in ms, or null once there's no stache left to time. It
 * runs only while the board is mounted and the tab is in front: switching
 * apps, locking the phone, or going back home pauses it. The server keeps the
 * real count; this shows it ticking between check-ins.
 */
export function useStacheClock(token: string, puzzleId: number, play: Play) {
  const running = play.stachedMs === null && !play.finished;
  // Clock time as of `at` (a performance.now()), or frozen while `at` is null.
  const [base, setBase] = useState<{ ms: number; at: number | null }>(() => ({
    ms: play.elapsedMs,
    at: null,
  }));
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!running) return;
    let active = false;

    const rebase = (ticking: boolean) =>
      setBase((b) => {
        const at = performance.now();
        return {
          ms: b.at === null ? b.ms : b.ms + at - b.at,
          at: ticking ? at : null,
        };
      });
    const resume = () => {
      active = true;
      rebase(true);
      api.clock(token, puzzleId).then(
        ({ elapsedMs }) => {
          if (active) setBase({ ms: elapsedMs, at: performance.now() });
        },
        () => {},
      );
    };
    const pause = () => {
      active = false;
      rebase(false);
      api.pauseClock(token, puzzleId);
    };
    const sync = () => {
      if (inFront() !== active) (active ? pause : resume)();
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    const heartbeat = setInterval(() => {
      if (active) api.clock(token, puzzleId).catch(() => {});
    }, HEARTBEAT_MS);
    const tick = setInterval(() => setNow(performance.now()), 200);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      clearInterval(heartbeat);
      clearInterval(tick);
      if (active) pause();
    };
  }, [running, token, puzzleId]);

  if (play.stachedMs !== null) return play.stachedMs;
  if (play.finished) return null;
  return base.at === null ? base.ms : base.ms + now - base.at;
}
