import { Link } from "@tanstack/react-router";
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
  note: ReactNode;
}

/** A screen off home (past games, the leaderboard): title, content, a note. */
const Screen = ({
  title,
  subtitle,
  error,
  onRetry,
  children,
  note,
}: ScreenProps) => (
  <div className="flex flex-col gap-5">
    <header className="flex items-center justify-between">
      <Link
        to="/stached"
        aria-label="Stached home"
        className={`${styles.title} -ml-1 py-2 pr-3 text-lg`}
      >
        Stached
      </Link>
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

    <p className={`${styles.label} leading-relaxed`}>{note}</p>
  </div>
);

export default Screen;
