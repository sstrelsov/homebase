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
  start: CityLocation;
  /**
   * End location of the arc.
   */
  end: CityLocation;
}

export interface CityLocation {
  lat: number;
  lon: number;
  name?: string;
  iso?: string;
}

export interface Trip {
  /** A unique ID or short slug for this trip */
  id: string;

  /** User-friendly name like "NYC -> Dallas -> NYC" */
  title: string;

  /** Which countries this trip visits (e.g. ["USA"] or ["USA","COL"]) */
  countries: string[];

  /** Optional descriptive text about the trip */
  description?: string;

  /** When the trip began, e.g. "2021-01-10" (ISO date string) */
  startDate?: string;

  /** When the trip ended, e.g. "2021-01-14" (ISO date string) */
  endDate?: string;

  /** Image URLs, if you want to display a mini-gallery */
  images?: string[];

  /**
   * Each "leg" is really just the next destination in the order visited.
   * e.g. [NYC, Dallas, NYC]
   */
  legs: CityLocation[];
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
