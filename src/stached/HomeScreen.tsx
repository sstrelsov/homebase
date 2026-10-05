import { useEffect, useState } from "react";
import { api } from "./api";
import { useAsk } from "./ask";
import Dialog from "./Dialog";
import { HomeScreenApps, SafariToolbar, ShareSheet } from "./IPhone";
import { useStached } from "./session";
import styles from "./stached.module.css";

/** Running as a saved home-screen app, not in a browser tab. */
export const isHomeScreenApp = () =>
  matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && navigator.standalone === true);

// An iPhone or iPad, which reports itself as a Mac with a touchscreen.
const isIOS = () =>
  /iPhone|iPad/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

// Safari on an iPhone, whose toolbar (and Share) is below the page.
const isIPhoneSafari = () =>
  /iPhone/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

const HANDOFF = "handoff";

/** The address's sign-in code, which Stached.tsx trades for a session. */
export const handoffCode = () =>
  new URLSearchParams(location.search).get(HANDOFF);

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

/**
 * "Get Stached on your home screen", in a browser tab: on an iPhone, only the
 * home-screen app gets notifications. On Android its Add button is Chrome's
 * own install prompt, and the app shares Chrome's storage, so you stay signed
 * in. iOS lets no page add itself, so the dialog draws the steps instead.
 * While it's up, a one-time sign-in code sits in the address the app gets
 * saved with, since iOS keeps the app's storage apart from Safari's. Safari
 * can't tell whether it's been added, so closed, it asks again in 3 days.
 */
const HomeScreen = () => {
  const { session } = useStached();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [open, setOpen] = useAsk(
    "stached.homeScreenAsked",
    3,
    isIOS() || installPrompt !== null,
  );

  useEffect(() => {
    const keep = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    addEventListener("beforeinstallprompt", keep);
    return () => removeEventListener("beforeinstallprompt", keep);
  }, []);

  // On iOS, the sign-in code sits in the address only while the dialog is up.
  // Closing it, or leaving home, takes the code back out.
  useEffect(() => {
    if (!open || !isIOS()) return;
    let live = true;
    api.handoff(session.token).then(
      ({ code }) => {
        if (live) setHandoffCode(code);
      },
      // Without one, the app asks for a name instead.
      () => {},
    );
    return () => {
      live = false;
      setHandoffCode(null);
    };
  }, [open, session.token]);

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onClose={close} title="Get Stached on your home screen">
      {installPrompt ? (
        <>
          <div className="flex items-center gap-4">
            <p className="flex-1 text-[19px] leading-snug">
              It opens full screen, straight to the game.
            </p>
            <HomeScreenApps />
          </div>
          <button
            type="button"
            onClick={() => {
              close();
              installPrompt.prompt();
            }}
            className={`${styles.button} ${styles.primary} w-full`}
          >
            Add to home screen
          </button>
        </>
      ) : (
        <>
          <p className="text-[19px] leading-snug">
            It's the only way to get notifications for new games.
          </p>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber}>1</span>
              <p className="flex-1">
                Tap <strong>Share</strong>
                {isIPhoneSafari() && (
                  <span className="mt-0.5 block text-[15px] opacity-60">
                    In Safari's toolbar, or under ⋯
                  </span>
                )}
              </p>
              <SafariToolbar />
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              <p className="flex-1">
                Tap <strong>Add to Home Screen</strong>, then{" "}
                <strong>Add</strong>
              </p>
              <ShareSheet />
            </li>
            <li>
              <span className={styles.stepNumber}>3</span>
              <p className="flex-1">
                Open <strong>Stached</strong> from your home screen
              </p>
              <HomeScreenApps />
            </li>
          </ol>
        </>
      )}
      <button
        type="button"
        onClick={close}
        className={`${styles.link} mx-auto block`}
      >
        Not now
      </button>
    </Dialog>
  );
};

export default HomeScreen;
