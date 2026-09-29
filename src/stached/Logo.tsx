import { useId } from "react";
import styles from "./logo.module.css";

/** Gerald, drawn in a 200 x 64 box. */
export const MUSTACHE_PATH =
  "M100 30c-8-14-26-20-42-12-12 6-18 20-32 22-10 1-18-5-22-12 2 18 16 32 36 34 22 2 44-8 60-24 16 16 38 26 60 24 20-2 34-16 36-34-4 7-12 13-22 12-14-2-20-16-32-22-16-8-34-2-42 12z";

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

// Color bands behind Gerald in the 1984 themes, top to bottom: the theme's
// color slots 4 to 1, with slanted ends.
const BANDS = ["--c4", "--c3", "--c2", "--c1"];
const BAND = { height: 9, gap: 3, left: 12, right: 388, slant: 5 };
const BANDS_TOP =
  CENTER.y - (BANDS.length * (BAND.height + BAND.gap) - BAND.gap) / 2;

interface LogoProps {
  /** Play the reveal: a CRT powering on, or a station ident wiping in. */
  intro?: boolean;
}

/**
 * Gerald as an 80s logo. In the arcade theme he's on a CRT screen; in the
 * 1984 themes he's a TV-station ident with color bands. See logo.module.css.
 */
const Logo = ({ intro = false }: LogoProps) => {
  // SVG url(#id) references need plain characters.
  const id = useId().replace(/[^\w-]/g, "");
  const bloom = `${id}-bloom`;
  const gerald = `${id}-gerald`;

  return (
    <div className={`${styles.screen} ${intro ? styles.ident : ""}`}>
      <svg
        viewBox="0 0 400 184"
        role="img"
        aria-label="Stached: Gerald the mustache"
        className={styles.logo}
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

        <g filter={`url(#${bloom})`} className={styles.glow}>
          {BANDS.map((color, i) => {
            const y = BANDS_TOP + i * (BAND.height + BAND.gap);
            const { left, right, slant, height } = BAND;
            return (
              <polygon
                key={color}
                className={styles.stripe}
                style={{ fill: `var(${color})`, animationDelay: `${i * 70}ms` }}
                points={`${left + slant},${y} ${right + slant},${y} ${right},${y + height} ${left},${y + height}`}
              />
            );
          })}

          <g className={styles.arcs}>
            {ARCS.map(({ r, width }, i) => (
              <g
                key={r}
                className={styles.broadcast}
                style={{
                  animationDelay: `${i * 0.25}s`,
                  stroke: i ? "var(--arc-outer)" : "var(--arc-inner)",
                }}
                strokeWidth={width}
              >
                <path d={arc(r, 232, 308)} />
                <path d={arc(r, 52, 128)} />
              </g>
            ))}
          </g>

          <g className={styles.gerald}>
            {/* A sliver of background between Gerald and the stripes */}
            <use href={`#${gerald}`} className={styles.cutout} />
            <use href={`#${gerald}`} className={styles.fringeRed} />
            <use href={`#${gerald}`} className={styles.fringeBlue} />
            <use href={`#${gerald}`} className={styles.face} />
          </g>
        </g>
      </svg>
      <div aria-hidden="true" className={styles.scanlines} />
    </div>
  );
};

export default Logo;
