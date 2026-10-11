import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Dialog from "../../Dialog";
import { StachedContext } from "../../session";
import styles from "../../stached.module.css";
import admin from "../mockups.module.css";
import x from "./leaderboard.module.css";
import { parseLeaderboardSearch, STEPS } from "./search";
import { sampleOf } from "./stats";
import { SECTIONS, STEP } from "./steps";

const route = getRouteApi("/stached/leaderboard-mockups/tour");

const noop = () => {};

/** A swipe this far across, and mostly sideways, turns the page. */
const SWIPE = 60;
/** Swipes from the screen's edges are iOS's own: back and forward. */
const EDGE = 24;

/**
 * The leaderboard ideas, one a step: what it is, an example, what it costs,
 * and its picture, on the made-up players (sample.ts). Dev only, like the
 * designs it walks through.
 */
const Tour = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [listOpen, setListOpen] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const id = STEPS[search.step - 1];
  const step = STEP[id];
  const you = step.you ?? "Marisol";
  const sample = sampleOf(step.today ?? "all", you);

  // Each step starts at its top, as a new page would.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on each step
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [search.step]);

  const stepTo = (n: number, label: string, className: string) =>
    n >= 1 && n <= STEPS.length ? (
      <Link
        to="/stached/leaderboard-mockups/tour"
        search={{ ...search, step: n }}
        aria-label={`Step ${n}: ${STEP[STEPS[n - 1]].title}`}
        className={className}
      >
        {label}
      </Link>
    ) : (
      <span aria-hidden="true" className={`${className} opacity-30`}>
        {label}
      </span>
    );

  return (
    <div
      data-look={search.look}
      className={`${styles.stached} flex flex-col`}
      onTouchStart={(e) => {
        const { clientX, clientY } = e.touches[0];
        touch.current = { x: clientX, y: clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start || listOpen) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        const edge = start.x < EDGE || start.x > window.innerWidth - EDGE;
        if (edge || Math.abs(dx) < SWIPE || Math.abs(dy) > Math.abs(dx) / 2)
          return;
        const n = search.step + (dx < 0 ? 1 : -1);
        if (n >= 1 && n <= STEPS.length)
          navigate({ search: { ...search, step: n } });
      }}
    >
      <div aria-hidden="true" className={styles.crt} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-6">
        <header className="flex items-center justify-between gap-3">
          <span className={styles.label}>
            {search.step} / {STEPS.length} · {step.section}
          </span>
          <span className="flex">
            {(["light", "dark"] as const).map((look) => (
              <Link
                key={look}
                to="/stached/leaderboard-mockups/tour"
                search={{ ...search, look }}
                replace
                className={admin.choice}
                data-on={search.look === look || undefined}
              >
                {look === "light" ? "Light" : "Dark"}
              </Link>
            ))}
          </span>
        </header>
        <div className="flex flex-col gap-3">
          <h1 className={`${styles.title} text-[30px] leading-none`}>
            {step.title}
          </h1>
          <div className={`${styles.stripes} w-28`} />
        </div>
        <p className="text-[19px] leading-snug">{step.what}</p>
        <p className={x.example}>{step.example}</p>
        <p className="flex flex-wrap gap-2">
          <span className={x.cost}>{step.cost.join(" · ")}</span>
          {step.risk && <span className={x.risk}>Risk: {step.risk}</span>}
        </p>
        <div key={id} className={x.visual}>
          <StachedContext
            value={{
              session: { token: "mockup", name: you },
              signOut: noop,
              openRules: noop,
            }}
          >
            <step.Visual sample={sample} />
          </StachedContext>
        </div>
      </main>
      <nav className={x.tourNav}>
        <div className="mx-auto grid w-full max-w-md grid-cols-[48px_1fr_48px] items-center gap-3 px-4">
          {stepTo(search.step - 1, "‹", admin.stepper)}
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className={`${styles.display} text-[13px]`}
          >
            All steps
          </button>
          {stepTo(search.step + 1, "›", admin.stepper)}
        </div>
      </nav>
      <Dialog
        open={listOpen}
        onClose={() => setListOpen(false)}
        title="All steps"
      >
        {SECTIONS.map((section) => (
          <section key={section} className="flex flex-col gap-1">
            <h3 className={styles.label}>{section}</h3>
            <ol>
              {STEPS.map(
                (stepId, i) =>
                  STEP[stepId].section === section && (
                    <li key={stepId}>
                      <Link
                        to="/stached/leaderboard-mockups/tour"
                        search={{ ...search, step: i + 1 }}
                        onClick={() => setListOpen(false)}
                        className={x.stepLink}
                        data-on={i + 1 === search.step || undefined}
                      >
                        <span className="opacity-50">{i + 1}</span>
                        {STEP[stepId].title}
                      </Link>
                    </li>
                  ),
              )}
            </ol>
          </section>
        ))}
        <Link
          to="/stached/leaderboard-mockups"
          search={parseLeaderboardSearch({ look: search.look })}
          className={`${styles.label} underline underline-offset-4`}
        >
          Every design
        </Link>
      </Dialog>
    </div>
  );
};

export default Tour;
