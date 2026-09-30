import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./stached.module.css";

interface RetryProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

/** A load that failed: the error, and a tap to try again. */
export const Retry = ({ error, onRetry, className = "" }: RetryProps) => (
  <button
    type="button"
    onClick={onRetry}
    className={`${styles.label} ${styles.alert} ${className}`}
  >
    {error}. Tap to retry
  </button>
);

interface ScreenProps {
  title: string;
  /** A line under the title. */
  subtitle?: ReactNode;
  error: string | null;
  onRetry: () => void;
  /** What's on the screen once it has loaded; null until then. */
  children: ReactNode;
}

/**
 * Back to wherever you came from: home, or a game's results. A link opened
 * fresh has nowhere to go back to, so it goes home.
 */
const BackLink = () => {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <Link
      to="/stached"
      onClick={(event) => {
        if (!canGoBack) return;
        event.preventDefault();
        router.history.back();
      }}
      className={`${styles.title} -ml-1 py-2 pr-3 text-lg`}
    >
      Back
    </Link>
  );
};

/** A screen off home (past games, the leaderboard): a title and its content. */
const Screen = ({ title, subtitle, error, onRetry, children }: ScreenProps) => (
  <div className="flex flex-col gap-5">
    <header className="flex items-center justify-between">
      <BackLink />
    </header>

    <div className="flex flex-col gap-3">
      <h1 className={`${styles.title} text-[26px]`}>{title}</h1>
      <div className={`${styles.stripes} w-28`} />
      {subtitle}
    </div>

    {error ? (
      <Retry error={error} onRetry={onRetry} className="text-left" />
    ) : (
      (children ?? <p className={styles.label}>Loading…</p>)
    )}
  </div>
);

export default Screen;
