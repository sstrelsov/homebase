import { useId } from "react";
import styles from "../css/mustache.module.css";
import { MUSTACHE } from "./HeightsMap";

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
            d={MUSTACHE}
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
