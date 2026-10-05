import { Outlet, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, loadSession, type Session, saveSession } from "../stached/api";
import {
  handoffCode,
  isHomeScreenApp,
  linkManifestUnlessAsking,
  setHandoffCode,
} from "../stached/HomeScreen";
import Login from "../stached/Login";
import RulesDialog from "../stached/RulesDialog";
import { StachedContext } from "../stached/session";
import styles from "../stached/stached.module.css";

// The look, for everyone: "light" (ink on cream) or "dark" (phosphor on black).
// No switch on screen yet. The home-screen app's colors don't follow this:
// they're set for light in public/stached/manifest.json and vite.config.mts.
const THEME: "light" | "dark" = "light";

// The router loads every Stached screen from here, so they share one chunk.
export { default as StachedAdmin } from "../stached/Admin";
export { default as StachedDay } from "../stached/DayGame";
export { default as StachedHome } from "../stached/Home";
export { default as StachedLeaderboard } from "../stached/Leaderboard";
export { default as StachedPast } from "../stached/PastGames";

/**
 * The page around every Stached screen: home, a day's game, past games and
 * the leaderboard. It signs you in and holds the session for all of them.
 */
const StachedPage = () => {
  const [session, setSession] = useState(loadSession);
  const page = useRef<HTMLDivElement>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  // A sign-in code from Safari (HomeScreen.tsx), on the home-screen app's
  // first launch. Only the app trades it, so a shared link signs no one in.
  const [code] = useState(handoffCode);
  const [redeeming, setRedeeming] = useState(
    () => Boolean(code) && !session && isHomeScreenApp(),
  );

  const signIn = useCallback((next: Session) => {
    saveSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!code) return;
    setHandoffCode(null);
    if (!redeeming) return;
    api
      .redeem(code)
      .then(signIn)
      // Spent or expired: sign in by name instead.
      .catch(() => {})
      .finally(() => setRedeeming(false));
  }, [code, redeeming, signIn]);

  // Stached's manifest, so any of its pages saves as the home-screen app.
  useEffect(() => linkManifestUnlessAsking(), []);

  // While Stached is open, its color fills the strips around the page: Safari
  // paints those behind the status bar and toolbar from the document's
  // background, and other browsers tint their toolbar from theme-color. The
  // site gets its own back after.
  useEffect(() => {
    if (!page.current) return;
    const bg = getComputedStyle(page.current).getPropertyValue("--bg");
    const root = document.documentElement.style;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const before = { background: root.background, theme: meta?.content ?? "" };
    root.background = bg;
    if (meta) meta.content = bg;
    return () => {
      root.background = before.background;
      if (meta) meta.content = before.theme;
    };
  }, []);

  // A notification tapped while Stached is open: the service worker
  // (public/stached/sw.js) asks for home here, instead of a new window.
  const router = useRouter();
  useEffect(() => {
    const container = navigator.serviceWorker;
    if (!container) return;
    const open = (event: MessageEvent) => {
      if (typeof event.data?.open === "string")
        router.history.push(event.data.open);
    };
    container.addEventListener("message", open);
    container.startMessages();
    return () => container.removeEventListener("message", open);
  }, [router]);

  const signOut = useCallback(() => {
    saveSession(null);
    setSession(null);
  }, []);

  return (
    <div ref={page} data-look={THEME} className={styles.stached}>
      <div aria-hidden="true" className={styles.crt} />
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-6">
        {session ? (
          <StachedContext
            value={{ session, signOut, openRules: () => setRulesOpen(true) }}
          >
            <Outlet />
            <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
          </StachedContext>
        ) : redeeming ? (
          <p className={`${styles.label} pt-24 text-center`}>Signing you in…</p>
        ) : (
          <Login onSignIn={signIn} />
        )}
      </div>
    </div>
  );
};

export default StachedPage;
