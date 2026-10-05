import { useEffect, useState } from "react";

// Home asks for two things in a dialog: to add Stached to the home screen (in
// a browser tab) and to turn on notifications (in the home-screen app). Each
// keeps the day it last asked, on this device only, and waits a day or more
// before asking again, so neither nags.

/** Today on this device's calendar, as days since 1970. */
const today = () => {
  const now = new Date();
  return Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000,
  );
};

/** Whether `days` have passed since `key` last asked. */
export const due = (key: string, days: number) => {
  try {
    const last = localStorage.getItem(key);
    return last === null || today() - Number(last) >= days;
  } catch {
    // No storage: never ask, rather than ask on every visit.
    return false;
  }
};

const asked = (key: string) => {
  try {
    localStorage.setItem(key, String(today()));
  } catch {
    // Full or blocked: it may ask again sooner.
  }
};

/**
 * Whether a dialog that asks is open, and how to close it: it opens a moment
 * after it's `ready` (home's logo has powered on by then), if `days` have
 * passed since it last asked, and closes if it stops being ready. Opening
 * counts as asking, however it's closed.
 */
export function useAsk(key: string, days: number, ready: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !due(key, days)) return;
    const timer = setTimeout(() => {
      asked(key);
      setOpen(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [key, days, ready]);

  return [open && ready, () => setOpen(false)] as const;
}
