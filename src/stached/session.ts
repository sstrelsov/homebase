import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiError, type Session } from "./api";

interface Stached {
  session: Session;
  signOut: () => void;
  openRules: () => void;
}

/** Set by the Stached page (src/pages/Stached.tsx) once you're signed in. */
export const StachedContext = createContext<Stached | null>(null);

/** The signed-in player, and the page's sign-out and Rules. */
export function useStached() {
  const stached = useContext(StachedContext);
  if (!stached) throw new Error("useStached needs the Stached page around it");
  return stached;
}

/**
 * Loads a screen's data with the player's token as it opens. A 401 signs the
 * player out; any other failure lands in `error`, and `load` tries again.
 * `fetch` must keep its identity between renders.
 */
export function useLoad<T>(fetch: (token: string) => Promise<T>) {
  const { session, signOut } = useStached();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) signOut();
      else setError(err instanceof Error ? err.message : "Something broke");
    },
    [signOut],
  );

  const load = useCallback(() => {
    setError(null);
    fetch(session.token).then(setData, fail);
  }, [fetch, session.token, fail]);

  useEffect(load, [load]);

  return { data, setData, error, load, fail };
}
