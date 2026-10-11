// Rivals: the players either side of you, and your record against everyone.
import type { Standing } from "../../../../stached-api/leaderboard";
import styles from "../../stached.module.css";
import x from "./leaderboard.module.css";
import { Board, Section } from "./parts";
import { Score, Versus } from "./Standings";
import { headToHead, type Sample } from "./stats";

type HeadToHead = ReturnType<typeof headToHead>;

/** The player just ahead of you or just behind, by points, and your record. */
const Rival = ({
  player,
  gap,
}: {
  player: Standing & HeadToHead;
  /** Their points less yours. */
  gap: number;
}) => (
  <div className={x.rival}>
    <p className={styles.label}>
      #{player.rank} ·{" "}
      {gap === 0 ? "Level" : `${Math.abs(gap)} ${gap > 0 ? "ahead" : "behind"}`}
    </p>
    <p className="truncate text-[22px] leading-tight">{player.name}</p>
    <Versus {...player} />
    <Score won={player.won} lost={player.lost} />
  </div>
);

/**
 * Your rivals, the players either side of you in the standings, then your
 * record against everyone you've shared a puzzle with: a solve beats a miss,
 * then the faster stache. Whoever has beaten you most is your nemesis.
 */
export const Rivals = ({ sample }: { sample: Sample }) => {
  const { players } = sample.board;
  const at = players.findIndex((p) => p.name === sample.me);
  const me = players[at];
  const versus = players
    .filter((p) => p.name !== sample.me)
    .map((p) => ({ ...p, ...headToHead(sample, sample.me, p.name) }));
  const records = versus
    .filter((p) => p.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.name.localeCompare(b.name));
  const nemesis = records.reduce<(typeof records)[number] | null>(
    (worst, p) =>
      p.lost - p.won > 0 && (!worst || p.lost - p.won > worst.lost - worst.won)
        ? p
        : worst,
    null,
  );
  const either = [players[at - 1], players[at + 1]].flatMap(
    (player) => versus.find((p) => p.name === player?.name) ?? [],
  );
  return (
    <Board>
      <div className="flex flex-col gap-6">
        {me && either.length > 0 && (
          <Section title="Your rivals">
            <div className="grid grid-cols-2 gap-3">
              {either.map((player) => (
                <Rival
                  key={player.name}
                  player={player}
                  gap={player.points - me.points}
                />
              ))}
            </div>
          </Section>
        )}
        <Section title="Head to head" aside="You–them">
          <ol>
            {records.map((p) => (
              <li key={p.name} className={`${x.h2h} ${styles.rule}`}>
                <span className="flex min-w-0 items-center gap-2 text-[18px] leading-tight">
                  <span className="truncate">{p.name}</span>
                  {p === nemesis && <span className={x.tag}>Nemesis</span>}
                </span>
                <Versus {...p} />
                <span className="text-right">
                  <Score won={p.won} lost={p.lost} />
                </span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </Board>
  );
};
