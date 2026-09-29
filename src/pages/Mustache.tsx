import { useCallback, useState } from "react";
import HeightsMap from "../components/HeightsMap";
import HumanTyping from "../components/HumanTyping";
import {
  type Choice,
  FINALE,
  FIRST_PASSAGE,
  type PassageId,
  type Point,
  START,
  STORY,
} from "../data/mustacheStory";
import { useLinkColor } from "../utils/ColorContext";

interface Step {
  passage: PassageId;
  via?: Choice;
}

const MustachePage = () => {
  const { linkColor } = useLinkColor();
  const [trail, setTrail] = useState<Step[]>([{ passage: FIRST_PASSAGE }]);
  const [typed, setTyped] = useState(false);
  // Bumped on each new walk so the typing restarts from scratch.
  const [run, setRun] = useState(0);

  const finishTyping = useCallback(() => setTyped(true), []);

  const choose = (choice: Choice) => {
    setTyped(false);
    if (choice.next === FIRST_PASSAGE) {
      setRun((r) => r + 1);
      setTrail([{ passage: FIRST_PASSAGE }]);
    } else {
      setTrail((t) => [...t, { passage: choice.next, via: choice }]);
    }
  };

  const walks: Point[][] = [];
  let at = START;
  for (const { via } of trail) {
    if (via?.walk.length) {
      walks.push([at, ...via.walk]);
      at = via.walk[via.walk.length - 1];
    }
  }

  const current = trail[trail.length - 1];

  return (
    <div className="self-start w-full max-w-5xl px-6 pt-20 md:pt-24 pb-24 grid gap-6 md:gap-12 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="sticky top-16 md:top-24 z-10 self-start bg-background py-2">
        <div className="max-w-[17rem] md:max-w-none mx-auto">
          <HeightsMap
            walks={walks}
            at={at}
            glowing={current.passage === FINALE}
            color={linkColor}
          />
        </div>
      </div>

      <div className="text-lg sm:text-xl leading-relaxed max-w-xl space-y-6">
        {trail.map((step, i) => {
          const isCurrent = i === trail.length - 1;
          const next = trail[i + 1];
          return (
            <section key={`${run}-${step.passage}`} className="space-y-6">
              {isCurrent ? (
                <HumanTyping
                  text={STORY[step.passage].text}
                  onDone={finishTyping}
                />
              ) : (
                <p className="whitespace-pre-line">
                  {STORY[step.passage].text}
                </p>
              )}
              {next?.via && (
                <p className="italic opacity-50">→ {next.via.label}</p>
              )}
            </section>
          );
        })}

        {typed && (
          <nav aria-label="Where next?" className="flex flex-col gap-2">
            {STORY[current.passage].choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => choose(choice)}
                className="text-left underline-offset-4 hover:underline"
                style={{ color: linkColor }}
              >
                → {choice.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default MustachePage;
