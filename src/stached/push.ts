import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useStached } from "./session";

// Push notifications when a puzzle is up (the API sends them,
// stached-api/push.ts). public/stached/sw.js shows them. On an iPhone only the
// home-screen app can get them, and iOS asks permission only right after a
// tap, so home has a bell to tap until they're on.

const supported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** The service worker, once it's running: only a running one can subscribe. */
async function worker() {
  const registration = await navigator.serviceWorker.register(
    "/stached/sw.js",
    { scope: "/stached/" },
  );
  const installing = registration.installing ?? registration.waiting;
  if (!registration.active && installing)
    await new Promise<void>((resolve, reject) =>
      installing.addEventListener("statechange", () => {
        if (installing.state === "activated") resolve();
        if (installing.state === "redundant") reject();
      }),
    );
  return registration;
}

const base64url = (bytes: ArrayBuffer | null) =>
  bytes
    ? btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : "";

const subscribe = (registration: ServiceWorkerRegistration, key: string) =>
  registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(
      atob(key.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    ),
  });

/**
 * Whether home shows the bell (until this browser gets a push when a puzzle
 * is up), and the tap that turns them on. Each visit sends the browser's
 * subscription again, so the API keeps it after a reset, and renews it if the
 * API's keys have changed.
 */
export function useNotifications() {
  const { session } = useStached();
  const [bell, setBell] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // No bell without push, or after "Don't Allow": only Settings undoes it.
    if (!supported() || Notification.permission === "denied") return;
    let live = true;
    (async () => {
      const { key } = await api.pushKey(session.token);
      const registration = await worker();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && Notification.permission === "granted") {
        if (base64url(subscription.options.applicationServerKey) !== key) {
          await subscription.unsubscribe();
          subscription = await subscribe(registration, key);
        }
        await api.subscribe(session.token, subscription.toJSON());
      }
      if (!live) return;
      setKey(key);
      setBell(!subscription);
    })()
      // Notifications are off at the API, or the browser said no.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [session.token]);

  /** Only from a tap: iOS asks for permission right after one, never later. */
  const turnOn = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setBell(false);
        return;
      }
      const subscription = await subscribe(await worker(), key);
      await api.subscribe(session.token, subscription.toJSON());
      setBell(false);
    } catch {
      // The bell stays, to try again.
    } finally {
      setBusy(false);
    }
  }, [key, session.token]);

  return { bell, busy, turnOn };
}

// A tap on the push (public/stached/sw.js) is remembered for this app
// session, so a game started from it can say so on the admin page.
const TAP = "stached.pushTap";
// How long after the tap starting the puzzle still counts as from it.
const TAP_LASTS_MS = 30 * 60_000;

/** Remembers a tap on that puzzle's push. */
export function notePushTap(date: string) {
  try {
    sessionStorage.setItem(TAP, JSON.stringify({ date, at: Date.now() }));
  } catch {
    // Private mode: the game just won't say it came from the push.
  }
}

/**
 * A tap that opens Stached fresh lands on /stached?push=<date>: remembers it,
 * and clears it from the address.
 */
export function notePushTapInAddress() {
  const url = new URL(location.href);
  const date = url.searchParams.get("push");
  if (!date) return;
  notePushTap(date);
  url.searchParams.delete("push");
  history.replaceState(history.state, "", url);
}

/** Whether starting this puzzle now comes from tapping its push. */
export function fromPushTap(date: string) {
  try {
    const tap = JSON.parse(sessionStorage.getItem(TAP) ?? "null");
    return tap?.date === date && Date.now() - tap.at < TAP_LASTS_MS;
  } catch {
    return false;
  }
}
