import { CityLocation } from "the-globe";

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
