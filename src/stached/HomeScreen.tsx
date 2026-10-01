import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useStached } from "./session";
import styles from "./stached.module.css";

/** Running as a saved home-screen app, not in a browser tab. */
export const isHomeScreenApp = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// An iPhone or iPad, which reports itself as a Mac with a touchscreen.
const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

// Safari on an iPhone, whose toolbar (and Share) is below the page.
const isIPhoneSafari = () =>
  /iPhone/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

/** The address's sign-in code, which Stached.tsx trades for a session. */
export const HANDOFF = "handoff";

/** Sets or clears the sign-in code in the address, keeping the page's state. */
export function setHandoffCode(code: string | null) {
  const url = new URL(location.href);
  if (code) url.searchParams.set(HANDOFF, code);
  else url.searchParams.delete(HANDOFF);
  history.replaceState(history.state, "", url);
}

interface InstallPrompt extends Event {
  prompt: () => Promise<unknown>;
}

// The tip shows once, ever, so it never nags.
const SEEN = "stached.homeScreenTip";
const seen = () => {
  try {
    return localStorage.getItem(SEEN) !== null;
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN, "1");
  } catch {
    // Private mode: it may show again next visit.
  }
};

/** Safari's Share icon: a box with an arrow out of the top. */
const ShareIcon = () => (
  <svg
    viewBox="0 0 20 24"
    role="img"
    aria-label="Share"
    className="mx-0.5 inline-block h-[1.1em] w-[0.95em] -translate-y-[3px]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 2v13M5.5 6.5 10 2l4.5 4.5M6 10H3.5v12h13V10H14" />
  </svg>
);

/**
 * "Get Stached on your home screen", once, sliding up from the bottom of a
 * browser tab. On Android its Add button is Chrome's own install prompt, and
 * the app shares Chrome's storage, so you stay signed in. iOS lets no page
 * add itself, so the tip points at Share instead. While it's up, a one-time
 * sign-in code sits in the address the app gets saved with, since iOS keeps
 * the app's storage apart from Safari's.
 */
const HomeScreen = () => {
  const { session } = useStached();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const tip = useRef<HTMLDivElement>(null);
  const [app] = useState(isHomeScreenApp);
  const [ios] = useState(isIOS);

  useEffect(() => {
    const keep = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    addEventListener("beforeinstallprompt", keep);
    return () => removeEventListener("beforeinstallprompt", keep);
  }, []);

  const show = useCallback(() => {
    markSeen();
    setOpen(true);
    if (ios)
      api.handoff(session.token).then(
        ({ code }) => setHandoffCode(code),
        // Without one, the app asks for a name instead.
        () => {},
      );
  }, [ios, session.token]);

  // A moment after home appears, the first time only.
  useEffect(() => {
    if (app || seen() || !(ios || installPrompt)) return;
    const timer = setTimeout(show, 2500);
    return () => clearTimeout(timer);
  }, [app, ios, installPrompt, show]);

  // A popover sits above the page, out of reach of home's animated layout,
  // so it stays pinned to the bottom.
  useEffect(() => {
    if (open) tip.current?.showPopover();
  }, [open]);

  if (!open) return null;

  const close = () => {
    setHandoffCode(null);
    setOpen(false);
  };

  const install = async () => {
    setOpen(false);
    await installPrompt?.prompt();
    setInstallPrompt(null);
  };

  return (
    <div
      ref={tip}
      popover="manual"
      role="dialog"
      aria-label="Get Stached on your home screen"
      className={styles.tip}
      data-arrow={(!installPrompt && isIPhoneSafari()) || undefined}
    >
      <div className="flex items-center gap-3 text-left">
        <div className="flex flex-1 flex-col gap-1">
          <p className={`${styles.display} text-[14px]`}>
            Get Stached on your home screen
          </p>
          {!installPrompt && (
            <p className="text-[16px] opacity-80">
              Tap <ShareIcon />, then Add to Home Screen.
            </p>
          )}
        </div>
        {installPrompt && (
          <button
            type="button"
            onClick={install}
            className={`${styles.button} ${styles.primary} px-5`}
          >
            Add
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="-m-2 p-2 text-2xl leading-none opacity-70"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
