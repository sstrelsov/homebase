import { type FormEvent, useState } from "react";
import { MUSTACHE_PATH } from "../components/RetroMustache";
import { api, type Session } from "./api";
import styles from "./stached.module.css";

interface LoginProps {
  onSignIn: (session: Session) => void;
}

// Top-aligned and short, so the whole form sits above the phone keyboard and
// nothing has to scroll or jump when it slides up.
const Login = ({ onSignIn }: LoginProps) => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api.login(name, password);
      // Drop the keyboard before the logo takes over the screen.
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo(0, 0);
      onSignIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke");
      setAttempt((a) => a + 1);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 pt-4">
      <div className="flex flex-col items-center gap-4 pb-2">
        <svg
          viewBox="0 12 200 54"
          aria-hidden="true"
          className="w-20"
          style={{
            fill: "#fffdf2",
            filter: "drop-shadow(-2px 0 #ff2a6d) drop-shadow(2px 0 #05d9e8)",
          }}
        >
          <path d={MUSTACHE_PATH} />
        </svg>
        <h1 className={`${styles.title} text-[28px]`}>Stached</h1>
        <p className={styles.label}>
          Insert name to play<span className={styles.blink}>_</span>
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className={styles.label}>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          name="username"
          autoComplete="username"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          maxLength={24}
          required
          className={styles.input}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={styles.label}>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          className={styles.input}
        />
      </label>

      <p
        role="alert"
        key={attempt}
        className={`${styles.pixel} min-h-4 text-center text-[10px] ${error ? styles.shake : ""}`}
        style={{ color: "#ff2a6d" }}
      >
        {error}
      </p>

      <button
        type="submit"
        disabled={busy}
        className={`${styles.button} ${styles.primary} w-full`}
      >
        {busy ? "Loading…" : "Press start"}
      </button>
    </form>
  );
};

export default Login;
