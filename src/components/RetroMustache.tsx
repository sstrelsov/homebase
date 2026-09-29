import { useId } from "react";
import styles from "../css/mustache.module.css";

/** Gerald, drawn in a 200 x 64 box. */
export const MUSTACHE_PATH =
  "M100 30c-8-14-26-20-42-12-12 6-18 20-32 22-10 1-18-5-22-12 2 18 16 32 36 34 22 2 44-8 60-24 16 16 38 26 60 24 20-2 34-16 36-34-4 7-12 13-22 12-14-2-20-16-32-22-16-8-34-2-42 12z";

const NEON = "#39ff14";
const CENTER = { x: 200, y: 92 };

/** An arc of radius r around the center, between two angles in degrees. */
function arc(r: number, from: number, to: number) {
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${CENTER.x + r * Math.cos(rad)} ${CENTER.y + r * Math.sin(rad)}`;
  };
  return `M${point(from)} A${r} ${r} 0 0 1 ${point(to)}`;
}

// Broadcast arcs above and below Gerald, innermost first.
const ARCS = [
  { r: 62, width: 9 },
  { r: 84, width: 7 },
];

/** Gerald as a logo from 1984: a CRT glow, broadcast arcs, and color fringing. */
const RetroMustache = () => {
  // SVG url(#id) references need plain characters.
  const id = useId().replace(/[^\w-]/g, "");
  const bloom = `${id}-bloom`;
  const gerald = `${id}-gerald`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ${styles.crt}`}
    >
      <svg
        viewBox="0 0 400 184"
        role="img"
        aria-label="Gerald the mustache, as an 80s logo"
        className="relative block w-full"
      >
        <defs>
          <filter id={bloom} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="soft" />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <path
            id={gerald}
            d={MUSTACHE_PATH}
            transform={`translate(${CENTER.x - 121} ${CENTER.y - 53}) scale(1.21)`}
          />
        </defs>

        <g filter={`url(#${bloom})`}>
          <g fill="none" stroke={NEON}>
            {ARCS.map(({ r, width }, i) => (
              <g
                key={r}
                className={styles.broadcast}
                style={{ animationDelay: `${i * 0.25}s` }}
                strokeWidth={width}
              >
                <path d={arc(r, 232, 308)} />
                <path d={arc(r, 52, 128)} />
              </g>
            ))}
          </g>

          <use
            href={`#${gerald}`}
            fill="#ff2a6d"
            className={styles.fringeRed}
          />
          <use
            href={`#${gerald}`}
            fill="#05d9e8"
            className={styles.fringeBlue}
          />
          <use href={`#${gerald}`} fill="#fffdf2" />
        </g>
      </svg>
      <div aria-hidden className={styles.scanlines} />
    </div>
  );
};

export default RetroMustache;
