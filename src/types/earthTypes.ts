export interface Coordinates {
  /**
   * Latitude in degrees.
   */
  lat: number;
  /**
   * Longitude in degrees.
   */
  lon: number;
}

export interface ArcLocation {
  /**
   * Start location of the arc.
   */
  start: Coordinates;
  /**
   * End location of the arc.
   */
  end: Coordinates;
}

export interface DotInfo {
  x: number;
  y: number;
  z: number;
  countryName: string;
  isoA3: string;
}

/**
 * Defines the animation behavior for arcs:
 * - `"flicker"`: Old-timey rapid opacity toggling for 1 second.
 * - `"smooth"`: Modern fade from 0 to 1 over 1 second.
 * - `undefined`: Static full-opacity arcs with no animation.
 */
export type AllArcsBehavior = "flicker" | "smooth" | undefined;
export type OnAllArcsDoneBehavior = "persist" | "remove" | "reset";
