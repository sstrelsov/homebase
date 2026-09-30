import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApiError, api, type Session, type Today } from "./api";
import Game from "./Game";
import styles from "./stached.module.css";

interface DayGameProps {
  session: Session;
  date: string;
  onSignOut: () => void;
  onRules: () => void;
}

/**
 * One day's game at /stached/<date>. Opening it starts that day's game, or
 * picks it back up from the server: a finished day shows its board, answers
 * and results; a missed day is played late.
 */
const DayGame = ({ session, date, onSignOut, onRules }: DayGameProps) => {
  const navigate = useNavigate();
  const [day, setDay] = useState<Today | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setDay(null);
    setError(null);
    api.start(session.token, date).then(
      (next) => {
        if (current) setDay(next);
      },
      (err: unknown) => {
        if (!current) return;
        if (err instanceof ApiError && err.status === 401) onSignOut();
        else setError(err instanceof Error ? err.message : "Something broke");
      },
    );
    return () => {
      current = false;
    };
  }, [session.token, date, onSignOut]);

  if (error)
    return (
      <div className="flex flex-col items-center gap-6 pt-24 text-center">
        <p className={`${styles.display} text-lg`}>{error}</p>
        <Link to="/stached/past" className={`${styles.button} w-48`}>
          Past games
        </Link>
      </div>
    );

  if (!day?.play)
    return <p className={`${styles.label} pt-24 text-center`}>Loading…</p>;

  return (
    <Game
      key={date}
      token={session.token}
      player={session.name}
      puzzle={day.puzzle}
      board={day.board}
      play={day.play}
      onToday={setDay}
      onHome={() => navigate({ to: "/stached" })}
      onRules={onRules}
    />
  );
};

export default DayGame;
