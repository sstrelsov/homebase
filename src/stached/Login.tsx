import { type FormEvent, useState } from "react";
import { api, type Session } from "./api";
import { isHomeScreenApp } from "./HomeScreen";
import Logo from "./Logo";
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
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* A compact ident, so the form still clears the keyboard */}
      <div className="flex flex-col items-center gap-3 pb-1">
        <div className="w-3/5">
          <Logo intro />
        </div>
        <h1
          className={`${styles.title} ${styles.rise} text-[30px]`}
          style={{ animationDelay: "0.9s" }}
        >
          Stached
        </h1>
      </div>

      {isHomeScreenApp() && (
        <p className={`${styles.label} text-center leading-relaxed`}>
          Use the name you play with. Your streak comes with you.
        </p>
      )}

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
          placeholder="e.g. Spencer"
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
        className={`${styles.display} ${styles.alert} min-h-4 text-center text-[10px] ${error ? styles.shake : ""}`}
      >
        {error}
      </p>

      <button
        type="submit"
        disabled={busy}
        className={`${styles.button} ${styles.primary} w-full`}
      >
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
};

export default Login;
