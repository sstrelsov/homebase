import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { api, gameLink } from "./api";
import Game from "./Game";
import { isHomeScreenApp } from "./HomeScreen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

/**
 * One puzzle's game at /stached/<date> (or /stached/<date>/2 for its date's
 * second), fresh for each. Opening it starts that game, or picks it back up
 * from the server: a finished one shows its board, answers and results; a
 * missed day is played late.
 */
const DayGame = () => {
  const navigate = useNavigate();
  const params = useParams({ from: "/stached/$date/{-$part}" });
  const { date } = params;
  const part = Number(params.part ?? 1);
  const { session, openRules } = useStached();
  const start = useCallback(
    (token: string) =>
      api.start(token, date, part, {
        homeScreen: isHomeScreenApp(),
        dark: matchMedia("(prefers-color-scheme: dark)").matches,
      }),
    [date, part],
  );
  const { data: day, setData: setDay, error } = useLoad(start);

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

  const { puzzle } = day;
  return (
    <Game
      token={session.token}
      player={session.name}
      puzzle={puzzle}
      board={day.board}
      play={day.play}
      onDay={setDay}
      onHome={() => navigate({ to: "/stached" })}
      onNext={
        puzzle.part < puzzle.parts
          ? () => navigate(gameLink({ date, part: puzzle.part + 1 }))
          : undefined
      }
      onRules={openRules}
    />
  );
};

export default DayGame;
