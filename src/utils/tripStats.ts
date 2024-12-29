import { Trip } from "../types/earthTypes";

const EARTH_RADIUS = 3958.8; // Earth radius in miles

interface StatHelperProps {
  trips: Trip[];
  year?: number;
}

/**
 * Haversine formula to compute distance (in miles) between two lat/lon points.
 */
const haversineMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
};

/**
 * Utility function to filter trips by a given year.
 * Adjust the condition if you want to include trips that start OR end in that year.
 */
const filterTripsByYear = (trips: Trip[], year?: number): Trip[] => {
  if (!year) return trips;
  return trips.filter(
    (trip) => new Date(trip.startDate || "").getFullYear() === year
  );
};

/**
 * Returns the total miles traveled across the given trips (optionally filtered by year).
 */
export const getMilesTraveled = ({ trips, year }: StatHelperProps): number => {
  const filteredTrips = filterTripsByYear(trips, year);
  let totalMiles = 0;

  for (const trip of filteredTrips) {
    const legs = trip.legs;
    for (let i = 0; i < legs.length - 1; i++) {
      const start = legs[i];
      const end = legs[i + 1];
      totalMiles += haversineMiles(start.lat, start.lon, end.lat, end.lon);
    }
  }

  return Math.round(totalMiles);
};

/**
 * Returns a list of distinct countries visited across the given trips (optionally filtered by year).
 */
export const getCountriesTraveled = ({
  trips,
  year,
}: StatHelperProps): string[] => {
  const filteredTrips = filterTripsByYear(trips, year);
  const countrySet = new Set<string>();

  for (const trip of filteredTrips) {
    if (Array.isArray(trip.countries)) {
      trip.countries.forEach((iso) => countrySet.add(iso));
    }
  }

  return Array.from(countrySet);
};

/**
 * Returns a list of distinct cities visited across the given trips (optionally filtered by year).
 */
export const getCitiesTraveled = ({
  trips,
  year,
}: StatHelperProps): string[] => {
  const filteredTrips = filterTripsByYear(trips, year);
  const citySet = new Set<string>();

  for (const trip of filteredTrips) {
    if (Array.isArray(trip.legs)) {
      trip.legs.forEach((leg) => citySet.add(leg?.name || ""));
    }
  }

  return Array.from(citySet);
};
