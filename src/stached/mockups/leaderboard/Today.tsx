// The designs built on today's puzzle: a podium, a timeline of the day, and
// bulletins.
import { Fragment } from "react";
import type { Day, Mark } from "../../../../stached-api/leaderboard";
import { formatTime } from "../../api";
import { Square } from "../../Leaderboard";
import { Mustache } from "../../Logo";
import { useStached } from "../../session";
import styles from "../../stached.module.css";
import x from "./leaderboard.module.css";
import { Board, Lives, Section, TodayLine } from "./parts";
import { type Play, PUSH_AT } from "./sample";
import {
  type Bulletin,
  bulletinsOf,
  byTime,
  clock,
  duration,
  names,
  recapOf,
  type Sample,
  stillToPlay,
  todays,
} from "./stats";

const todayOf = (sample: Sample) => sample.days.at(-1) as Day;

/** Today's square for each player, as the leaderboard marks it. */
const todayMarks = (sample: Sample) =>
  new Map(sample.board.players.map((p) => [p.name, p.marks.at(-1) as Mark]));

/** Whoever hasn't finished today's yet, each on a dashed square. */
const StillToPlay = ({ sample }: { sample: Sample }) => {
  const { session } = useStached();
  const waiting = stillToPlay(sample);
  // Today's counts until 24 hours after its push.
  const left = 24 * 60 + PUSH_AT - sample.now;
  if (waiting.length === 0) return null;
  return (
    <Section title="Still to play" aside={`${duration(left)} left`}>
      <p className={x.waiting}>
        {waiting.map(({ name, playing }) => (
          <span
            key={name}
            className={name === session.name ? styles.me : undefined}
          >
            <Square mark="open" />
            {name}
            {playing && <span className={styles.label}>Playing</span>}
          </span>
        ))}
      </p>
    </Section>
  );
};

/** Today's games with a stache time, placed by it: ties share a place. */
function placed(sample: Sample) {
  const timed = todays(sample)
    .filter((game) => game.stachedMs !== null)
    .sort((a, b) => byTime(a.stachedMs, b.stachedMs));
  return timed.map((game) => ({
    ...game,
    place: timed.findIndex((other) => other.stachedMs === game.stachedMs) + 1,
  }));
}

type Placed = ReturnType<typeof placed>[number];

// The podium's blocks, by step: first in gold, then orange, then red.
const STEPS = [
  { color: "1", height: 88 },
  { color: "2", height: 64 },
  { color: "3", height: 46 },
] as const;

/** A step of the podium: everyone on it, their time, and their block. */
const Step = ({
  games,
  step,
  marks,
}: {
  games: Placed[] | undefined;
  step: number;
  marks: Map<string, Mark>;
}) => {
  const { session } = useStached();
  if (!games) return <div />;
  return (
    <div className={x.step}>
      {games.map((game) => (
        <span
          key={game.name}
          className={`${x.stepName} ${game.name === session.name ? styles.me : ""}`}
        >
          <Square mark={marks.get(game.name) ?? "solved"} />
          <span className="truncate">{game.name}</span>
        </span>
      ))}
      <span className={styles.stacheText}>
        {formatTime(games[0].stachedMs)}
      </span>
      <span
        className={x.block}
        data-color={STEPS[step].color}
        style={{ height: STEPS[step].height }}
      >
        {games[0].place}
        {step === 0 && <Mustache />}
      </span>
    </div>
  );
};

/** One of today's other games: place, square, name, lives left, time. */
const Finisher = ({
  game,
  mark,
}: {
  game: Play & { place?: number };
  mark: Mark;
}) => {
  const { session } = useStached();
  return (
    <li
      className={`${x.finisher} ${styles.rule} ${
        game.name === session.name ? styles.me : ""
      }`}
    >
      <span className="opacity-50">{game.place}</span>
      <Square mark={mark} />
      <span className="truncate">{game.name}</span>
      <Lives mistakes={game.mistakes} bonus={game.stachedMs !== null} />
      <span className={`${styles.stacheText} text-right`}>
        {formatTime(game.stachedMs)}
      </span>
    </li>
  );
};

/**
 * Today's race: the three fastest staches on a podium, then everyone else
 * with their lives left, then who's still to play and how long is left.
 */
export const Podium = ({ sample }: { sample: Sample }) => {
  const marks = todayMarks(sample);
  const games = placed(sample);
  const steps = [...Map.groupBy(games, (game) => game.place).values()].slice(
    0,
    3,
  );
  const onPodium = new Set(steps.flat());
  const rest = [
    ...games.filter((game) => !onPodium.has(game)),
    ...todays(sample).filter((game) => game.stachedMs === null),
  ];
  return (
    <Board subtitle={<TodayLine day={todayOf(sample)} />}>
      <div className="flex flex-col gap-6">
        {steps.length === 0 ? (
          <p className="text-[19px]">No one has finished yet.</p>
        ) : (
          <div className={x.podium}>
            <Step games={steps[1]} step={1} marks={marks} />
            <Step games={steps[0]} step={0} marks={marks} />
            <Step games={steps[2]} step={2} marks={marks} />
          </div>
        )}
        {rest.length > 0 && (
          <ol>
            {rest.map((game) => (
              <Finisher
                key={game.name}
                game={game}
                mark={marks.get(game.name) ?? "missed"}
              />
            ))}
          </ol>
        )}
        <StillToPlay sample={sample} />
      </div>
    </Board>
  );
};

/** Room between two stops, by the minutes between them. */
const gap = (minutes: number) =>
  Math.round(Math.min(Math.max(minutes * 0.3, 4), 72));

/**
 * The day as a line from the push to now, a stop for each game finished, with
 * whoever took the fastest stache marked as they did.
 */
export const Timeline = ({ sample }: { sample: Sample }) => {
  const { session } = useStached();
  const marks = todayMarks(sample);
  const day = todayOf(sample);
  const leads = new Set(
    bulletinsOf(sample)
      .filter((b) => b.lead)
      .map((b) => b.name),
  );
  const games = todays(sample);
  const stops = [
    { at: PUSH_AT, key: "push" },
    ...games.map((game) => ({ at: game.finishedAt, key: game.name, game })),
    { at: sample.now, key: "now" },
  ];
  return (
    <Board subtitle={<TodayLine day={day} />}>
      <div className="flex flex-col gap-6">
        <ol className={x.rail}>
          {stops.map((stop, i) => (
            <li
              key={stop.key}
              className={x.stop}
              style={{
                marginTop: i === 0 ? 0 : gap(stop.at - stops[i - 1].at),
              }}
            >
              <time className={x.stopTime}>{clock(stop.at)}</time>
              {"game" in stop && stop.game ? (
                <>
                  <Square mark={marks.get(stop.key) ?? "solved"} />
                  <span
                    className={`flex min-w-0 items-baseline gap-2 text-[18px] leading-tight ${
                      stop.key === session.name ? styles.me : ""
                    }`}
                  >
                    <span className="truncate">{stop.key}</span>
                    <span
                      className={
                        leads.has(stop.key) ? styles.stacheText : styles.label
                      }
                    >
                      {formatTime(stop.game.stachedMs)}
                    </span>
                    {leads.has(stop.key) && (
                      <span className={x.lead}>Fastest so far</span>
                    )}
                  </span>
                </>
              ) : stop.key === "push" ? (
                <>
                  <span className={x.pin}>
                    <Mustache />
                  </span>
                  <span className={styles.label}>
                    Puzzle #{day.number} is up
                  </span>
                </>
              ) : (
                <>
                  <span className={`${x.pin} ${x.now}`} />
                  <span className={styles.label}>Now</span>
                </>
              )}
            </li>
          ))}
        </ol>
        <StillToPlay sample={sample} />
      </div>
    </Board>
  );
};

/** Bulletins in a row from the same game, under one time and name. */
function byGame(bulletins: Bulletin[]) {
  const entries: { at: number; name: string | null; items: Bulletin[] }[] = [];
  for (const bulletin of bulletins) {
    const last = entries.at(-1);
    if (last && last.at === bulletin.at && last.name === bulletin.name)
      last.items.push(bulletin);
    else
      entries.push({ at: bulletin.at, name: bulletin.name, items: [bulletin] });
  }
  return entries;
}

/**
 * Today's news, newest first: who's in, the fastest stache changing hands,
 * places gained, streaks and close calls. Then yesterday, in brief.
 */
export const Bulletins = ({ sample }: { sample: Sample }) => {
  const { session } = useStached();
  const yesterday = sample.days.at(-2) as Day;
  const recap = recapOf(sample, yesterday);
  return (
    <Board subtitle={<TodayLine day={todayOf(sample)} />}>
      <div className="flex flex-col gap-6">
        <ol>
          {byGame(bulletinsOf(sample))
            .reverse()
            .map((entry) => (
              <li
                key={`${entry.at}${entry.name}`}
                className={`${x.bulletin} ${styles.rule}`}
              >
                <time className={x.bulletinTime}>{clock(entry.at)}</time>
                <div className="flex flex-col gap-0.5">
                  {entry.name && (
                    <p
                      className={`text-[19px] leading-tight ${
                        entry.name === session.name ? styles.me : ""
                      }`}
                    >
                      {entry.name}
                    </p>
                  )}
                  {entry.items.map((item) => (
                    <p
                      key={item.text}
                      className={item.lead ? styles.stacheText : x.note}
                    >
                      {item.text}
                    </p>
                  ))}
                </div>
              </li>
            ))}
        </ol>
        <Section title="Yesterday" aside={`#${yesterday.number}`}>
          <p className="text-[19px] leading-snug">
            {recap.played} played, {recap.solved} solved.
            {recap.ms !== null && (
              <Fragment>
                {" "}
                Fastest stache: {names(recap.fastest)},{" "}
                <span className={styles.stacheText}>
                  {formatTime(recap.ms)}
                </span>
                .
              </Fragment>
            )}
          </p>
        </Section>
      </div>
    </Board>
  );
};
