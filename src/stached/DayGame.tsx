import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { api } from "./api";
import Game from "./Game";
import { isHomeScreenApp } from "./HomeScreen";
import { useLoad, useStached } from "./session";
import styles from "./stached.module.css";

/**
 * One day's game at /stached/<date>, fresh for each date. Opening it starts
 * that day's game, or picks it back up from the server: a finished day shows
 * its board, answers and results; a missed day is played late.
 */
const DayGame = () => {
  const navigate = useNavigate();
  const { date } = useParams({ from: "/stached/$date" });
  const { session, openRules } = useStached();
  const start = useCallback(
    (token: string) =>
      api.start(token, date, {
        homeScreen: isHomeScreenApp(),
        dark: matchMedia("(prefers-color-scheme: dark)").matches,
      }),
    [date],
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

  return (
    <Game
      token={session.token}
      player={session.name}
      puzzle={day.puzzle}
      board={day.board}
      play={day.play}
      onDay={setDay}
      onHome={() => navigate({ to: "/stached" })}
      onRules={openRules}
    />
  );
};

export default DayGame;
