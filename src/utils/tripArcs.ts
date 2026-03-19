import { type ArcLocation, getArcsFromLegs } from "the-globe";
import type { Trip } from "../types/tripTypes";

/**
 * Get arcs from a single trip.
 */
export const getArcsFromTrip = (trip: Trip): ArcLocation[] => {
  return getArcsFromLegs(trip.legs);
};

/**
 * Flatten arcs from all trips into a single array.
 */
export const flattenAllTrips = (trips: Trip[]): ArcLocation[] => {
  return trips.flatMap((trip) => getArcsFromLegs(trip.legs));
};

/**
 * Get all unique ISO country codes from trips.
 */
export const flattenAllIsos = (trips: Trip[]): string[] => {
  return Array.from(new Set(trips.flatMap((trip) => trip.countries ?? [])));
};
