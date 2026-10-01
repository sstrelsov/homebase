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

// The icons iOS shows for each step, drawn in the text's color.
const icon = {
  className: "h-[22px] w-[22px] shrink-0",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Share: a box with an arrow out of the top. */
const ShareIcon = () => (
  <svg {...icon} aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4M8 10H5v11h14V10h-3" />
  </svg>
);

/** Add to Home Screen: a plus in a rounded square. */
const AddIcon = () => (
  <svg {...icon} aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
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
      <div className="flex items-center gap-3.5 text-left">
        <img
          src="/images/stached-icon-180.png"
          alt=""
          className={styles.tipIcon}
        />
        <p className="flex-1 text-[19px] font-semibold leading-tight [text-wrap:balance]">
          Get Stached on your home screen
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="-mr-1.5 self-start p-1.5 text-[26px] leading-none opacity-60"
        >
          ×
        </button>
      </div>
      {installPrompt ? (
        <button
          type="button"
          onClick={install}
          className={`${styles.button} ${styles.primary} mt-4 w-full`}
        >
          Add to home screen
        </button>
      ) : (
        <ol className={styles.tipSteps}>
          <li>
            <span className={styles.tipStep}>1</span>
            Tap <ShareIcon /> <strong>Share</strong>
          </li>
          <li>
            <span className={styles.tipStep}>2</span>
            Tap <AddIcon /> <strong>Add to Home Screen</strong>
          </li>
        </ol>
      )}
    </div>
  );
};

export default HomeScreen;
