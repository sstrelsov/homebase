import { useEffect, useState } from "react";
import { api } from "./api";
import { due, useAsk } from "./ask";
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

const MANIFEST = "/stached/manifest.json";

/**
 * Links Stached's manifest, once a page. iOS saves a home-screen app with the
 * start address of the first manifest a page links, or else the address the
 * page loaded with, never a later one. So for the dialog's sign-in code to
 * reach the app, the manifest carries it, and Stached's pages link none of
 * their own (vite.config.mts).
 */
async function linkManifest(code: string | null) {
  const linked = () => document.querySelector('link[rel="manifest"]');
  if (linked()) return;
  let href = MANIFEST;
  if (code) {
    const manifest = await (await fetch(MANIFEST)).json();
    // A data: manifest has no address of its own to resolve paths against.
    const whole = (path: string) => new URL(path, location.origin).href;
    const start = new URL("/stached/", location.origin);
    start.searchParams.set(HANDOFF, code);
    href = `data:application/manifest+json,${encodeURIComponent(
      JSON.stringify({
        ...manifest,
        id: whole(manifest.id),
        scope: whole(manifest.scope),
        start_url: start.href,
        icons: manifest.icons.map((icon: { src: string }) => ({
          ...icon,
          src: whole(icon.src),
        })),
      }),
    )}`;
    if (linked()) return;
  }
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = href;
  document.head.append(link);
}

interface InstallPrompt extends Event {
  prompt: () => Promise<unknown>;
}

// Safari can't tell whether it's been added, so closed, it asks again in 3 days.
const ASK = "stached.homeScreenAsked";
const AGAIN = 3;

/**
 * "Get Stached on your home screen", in a browser tab: on an iPhone, only the
 * home-screen app gets notifications. On Android its Add button is Chrome's
 * own install prompt, and the app shares Chrome's storage, so you stay signed
 * in. iOS lets no page add itself, so the dialog draws the steps instead.
 * While it's up, a one-time sign-in code rides in the manifest and the
 * address the app gets saved with, since iOS keeps the app's storage apart
 * from Safari's.
 */
const HomeScreen = () => {
  const { session } = useStached();
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [open, setOpen] = useAsk(ASK, AGAIN, isIOS() || installPrompt !== null);

  // The manifest now, unless iOS is about to ask: then it waits for the code.
  useEffect(() => {
    if (!(isIOS() && due(ASK, AGAIN))) linkManifest(null);
  }, []);

  useEffect(() => {
    const keep = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    addEventListener("beforeinstallprompt", keep);
    return () => removeEventListener("beforeinstallprompt", keep);
  }, []);

  // On iOS, a sign-in code for the app: in the manifest (iOS 26 saves the app
  // with its start address) and, while the dialog is up, in the address
  // (older iOS saves that). Closing it, or leaving home, takes it back out of
  // the address; a spent or expired code just asks the app for a name.
  useEffect(() => {
    if (!open || !isIOS()) return;
    let live = true;
    api
      .handoff(session.token)
      .then(({ code }) => {
        if (!live) return;
        setHandoffCode(code);
        return linkManifest(code);
      })
      // Without one, the app asks for a name instead.
      .catch(() => {})
      .finally(() => linkManifest(null));
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
              </p>
              <SafariToolbar />
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              <p className="flex-1">
                Tap <strong>View More</strong>, then{" "}
                <strong>Add to Home Screen</strong>
              </p>
              <ShareSheet />
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
