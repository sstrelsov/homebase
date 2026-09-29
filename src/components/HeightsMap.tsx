import { useLayoutEffect, useRef } from "react";
import styles from "../css/mustache.module.css";
import { PARK_X, type Point, START, X, Y } from "../data/mustacheStory";

const MUSTACHE =
  "M100 30c-8-14-26-20-42-12-12 6-18 20-32 22-10 1-18-5-22-12 2 18 16 32 36 34 22 2 44-8 60-24 16 16 38 26 60 24 20-2 34-16 36-34-4 7-12 13-22 12-14-2-20-16-32-22-16-8-34-2-42 12z";

const WALK_SECONDS = 1.6;

const toPath = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

const FRUIT = new Set(["cranberry", "orange", "pineapple"]);
const TOP = Y.middagh - 10;
const BOTTOM = Y.remsen + 8;
const EAST = X.clinton + 6;

interface HeightsMapProps {
  /** Every walk so far, each starting where the last one ended. */
  walks: Point[][];
  at: Point;
  glowing: boolean;
  color: string;
}

const HeightsMap = ({ walks, at, glowing, color }: HeightsMapProps) => {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const latest = walks.at(-1);

  // A freshly mounted animateMotion only runs when started by hand.
  // biome-ignore lint/correctness/useExhaustiveDependencies: start each new walk
  useLayoutEffect(() => {
    motionRef.current?.beginElement();
  }, [walks.length]);

  return (
    <svg
      viewBox="0 0 320 336"
      role="img"
      aria-label="A map of Brooklyn Heights showing Gerald's walk"
      className="w-full select-none"
    >
      <g fill="currentColor" fontSize="9" letterSpacing="0.04em">
        {/* East River, Manhattan beyond it, and the piers of Brooklyn Bridge Park */}
        <rect x="0" y="0" width="42" height="332" opacity="0.07" />
        {[70, 150, 230, 300].map((y) => (
          <path
            key={y}
            d={`M8 ${y} q4 -3 8 0 t8 0 t8 0`}
            fill="none"
            stroke="currentColor"
            opacity="0.3"
          />
        ))}
        <text
          x="18"
          y="200"
          opacity="0.5"
          transform="rotate(-90 18 200)"
          textAnchor="middle"
        >
          east river
        </text>
        <rect x="42" y={TOP} width="24" height="270" opacity="0.05" />
        {[48, 122, 192, 262].map((y) => (
          <rect key={y} x="26" y={y} width="18" height="12" opacity="0.08" />
        ))}

        {/* Lady Liberty, off to the southwest */}
        <path d="M18 312l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" opacity="0.45" />
        <text x="6" y="335" fontSize="7.5" opacity="0.5">
          liberty
        </text>

        {/* The Brooklyn Bridge, just north of the Heights */}
        <g fill="none" stroke="currentColor" opacity="0.4">
          <path d="M0 18H118" />
          <path d="M30 6V18M85 6V18" strokeWidth="2" />
          <path d="M0 10Q15 16 30 6Q57 20 85 6Q102 15 118 18" />
        </g>
        <text x="124" y="20" opacity="0.5">
          brooklyn bridge
        </text>
      </g>

      {/* Streets */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {Object.entries(X)
          .filter(([name]) => name !== "promenade")
          .map(([name, x]) => (
            <line
              key={name}
              x1={x}
              y1={TOP}
              x2={x}
              y2={BOTTOM}
              opacity="0.22"
            />
          ))}
        {Object.entries(Y).map(([name, y]) => (
          <line
            key={name}
            x1={y >= Y.clark ? X.promenade : X.columbiaHeights}
            y1={y}
            x2={EAST}
            y2={y}
            opacity="0.22"
          />
        ))}
        <line
          x1={X.promenade}
          y1={Y.orange}
          x2={X.promenade}
          y2={Y.remsen}
          strokeWidth="2.5"
          strokeDasharray="0.5 5"
          opacity="0.5"
        />
        <line
          x1={X.columbiaHeights}
          y1={Y.middagh}
          x2={PARK_X}
          y2={Y.middagh}
          strokeDasharray="2 2"
          opacity="0.4"
        />
      </g>

      {/* Street names */}
      <g fill="currentColor" fontSize="9" letterSpacing="0.04em" opacity="0.55">
        {Object.entries(Y).map(([name, y]) => (
          <text
            key={name}
            x={EAST + 5}
            y={y + 2.5}
            fontStyle={FRUIT.has(name) ? "italic" : undefined}
          >
            {name}
          </text>
        ))}
        {Object.entries(X)
          .filter(([name]) => name !== "promenade")
          .map(([name, x]) => (
            <text
              key={name}
              x={x}
              y={BOTTOM + 12}
              fontSize="7.5"
              textAnchor="middle"
            >
              {name === "columbiaHeights" ? "columbia hts" : name}
            </text>
          ))}
        <text
          x={X.promenade - 5}
          y={(Y.orange + Y.clark) / 2}
          transform={`rotate(-90 ${X.promenade - 5} ${(Y.orange + Y.clark) / 2})`}
          textAnchor="middle"
        >
          promenade
        </text>
        <text x="58" y={Y.middagh - 4} fontSize="7.5">
          squibb bridge
        </text>
        <circle
          cx={START[0]}
          cy={START[1]}
          r="3"
          fill="none"
          stroke="currentColor"
        />
        <text x={START[0] + 5} y={START[1] - 5} fontSize="7.5">
          st. george
        </text>
      </g>

      {/* Gerald's route so far */}
      <g
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {walks.map((walk) => (
          <path
            key={toPath(walk)}
            d={toPath(walk)}
            pathLength={1}
            className={styles.draw}
            style={{ animationDuration: `${WALK_SECONDS}s` }}
          />
        ))}
      </g>

      {glowing && (
        <circle
          cx={at[0]}
          cy={at[1]}
          r="14"
          fill={color}
          className={styles.glow}
        />
      )}

      {/* Gerald */}
      <g
        key={walks.length}
        transform={latest ? undefined : `translate(${at[0]} ${at[1]})`}
      >
        {latest && (
          <animateMotion
            ref={motionRef}
            path={toPath(latest)}
            dur={`${WALK_SECONDS}s`}
            begin="indefinite"
            fill="freeze"
            calcMode="linear"
          />
        )}
        <path
          d={MUSTACHE}
          transform="translate(-12 -6) scale(0.12)"
          fill={color}
        />
      </g>
    </svg>
  );
};

export default HeightsMap;
