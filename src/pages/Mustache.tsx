import { useCallback, useEffect, useState } from "react";
import HeightsMap from "../components/HeightsMap";
import HumanTyping from "../components/HumanTyping";
import RetroMustache from "../components/RetroMustache";
import {
  type Choice,
  FINALE,
  FIRST_PASSAGE,
  type PassageId,
  PLACES,
  STORY,
} from "../data/mustacheStory";

const NEON = "#39ff14";
const ALL_PLACES = Object.values(PLACES);

const MustachePage = () => {
  const [trail, setTrail] = useState<PassageId[]>([FIRST_PASSAGE]);
  const [typed, setTyped] = useState(false);
  // Bumped on each new walk so the typing restarts from scratch.
  const [run, setRun] = useState(0);

  // This page is dark mode only; put the site's theme back on the way out.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.className;
    root.classList.remove("light");
    root.classList.add("dark");
    return () => {
      root.className = previous;
    };
  }, []);

  const finishTyping = useCallback(() => setTyped(true), []);

  const choose = (choice: Choice) => {
    setTyped(false);
    if (choice.next === FIRST_PASSAGE) {
      setRun((r) => r + 1);
      setTrail([FIRST_PASSAGE]);
    } else {
      setTrail((t) => [...t, choice.next]);
    }
  };

  const current = trail[trail.length - 1];

  return (
    <div className="self-start w-full max-w-md mx-auto px-5 pt-20 pb-24 text-lg leading-relaxed space-y-6">
      {/* The site nav is see-through; give it a solid band here. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-16 z-40 bg-background"
      />
      <RetroMustache />

      <div className="sticky top-16 z-10 -mx-5 px-5 py-2 bg-background">
        <HeightsMap
          places={ALL_PLACES}
          stops={trail.map((id) => STORY[id].place)}
          glowing={current === FINALE}
        />
      </div>

      {trail.map((id, i) => {
        const next = trail[i + 1];
        return (
          <section key={`${run}-${id}`} className="space-y-6">
            {i === trail.length - 1 ? (
              <HumanTyping
                text={STORY[id].text}
                cursorColor={NEON}
                onDone={finishTyping}
              />
            ) : (
              <p className="whitespace-pre-line">{STORY[id].text}</p>
            )}
            {next && (
              <p className="italic opacity-50">
                → {STORY[id].choices.find((c) => c.next === next)?.label}
              </p>
            )}
          </section>
        );
      })}

      {typed && (
        <nav aria-label="Where next?" className="flex flex-col gap-3">
          {STORY[current].choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={() => choose(choice)}
              className="text-left underline-offset-4 active:underline"
              style={{ color: NEON, textShadow: `0 0 8px ${NEON}66` }}
            >
              → {choice.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default MustachePage;
