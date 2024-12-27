import { ArcLocation, CityLocation, Trip } from "../../../types/earthTypes";

export function getArcsFromTrip(trip: Trip): ArcLocation[] {
  const arcs: ArcLocation[] = [];
  const legs = trip.legs; // an array of CityLocation

  for (let i = 0; i < legs.length - 1; i++) {
    arcs.push({
      start: legs[i],
      end: legs[i + 1],
    });
  }
  return arcs;
}

/**
 * Converts an ordered list of city stops [C0, C1, C2, ... Cn]
 * into [Arc(C0->C1), Arc(C1->C2), ..., Arc(Cn-1->Cn)].
 */
export function getArcsFromLegs(legs: CityLocation[]): ArcLocation[] {
  const arcs: ArcLocation[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    arcs.push({
      start: legs[i],
      end: legs[i + 1],
    });
  }
  return arcs;
}

/**
 * Flatten arcs from all trips into a single array.
 */
export function flattenAllTrips(trips: Trip[]): ArcLocation[] {
  return trips.flatMap((trip) => getArcsFromLegs(trip.legs));
}

/**
 * Each arc has start + end city.
 * We want to produce [Arc0.start, Arc0.end, Arc1.end, Arc2.end, ...].
 */
export function getArcCities(arcs: ArcLocation[]): CityLocation[] {
  if (arcs.length === 0) return [];

  const cities: CityLocation[] = [];
  // Push the first arc's start city
  cities.push(arcs[0].start);

  // Then for each arc, push the end city
  for (let i = 0; i < arcs.length; i++) {
    cities.push(arcs[i].end);
  }

  return cities;
}

export function flattenAllIsos(trips: Trip[]): string[] {
  return Array.from(new Set(trips.flatMap((trip) => trip.countries ?? [])));
}

/**
 * Example stats: totalMiles, distinctCities, countries, etc.
 */
export interface TripStats {
  numberOfDistinctCities: number;
  totalMiles: number;
  countriesVisited: string[];
  continentsVisited: string[];
}

export function getTripStats(
  trip: Trip,
  isoToContinent?: Record<string, string>
): TripStats {
  // Distinct city names
  const distinctCities = new Set<string>();
  trip.legs.forEach((city) => {
    if (city.name) distinctCities.add(city.name);
  });

  // Summation of distances between consecutive legs
  let totalMiles = 0;
  for (let i = 0; i < trip.legs.length - 1; i++) {
    const start = trip.legs[i];
    const end = trip.legs[i + 1];
    totalMiles += haversineMiles(start.lat, start.lon, end.lat, end.lon);
  }

  // Countries visited
  const countriesVisited = trip.countries ?? [];

  // Continents visited (optional)
  let continentsVisited: string[] = [];
  if (isoToContinent) {
    const contSet = new Set<string>();
    for (const iso of countriesVisited) {
      const continent = isoToContinent[iso];
      if (continent) {
        contSet.add(continent);
      }
    }
    continentsVisited = Array.from(contSet);
  }

  return {
    numberOfDistinctCities: distinctCities.size,
    totalMiles,
    countriesVisited,
    continentsVisited,
  };
}

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(value: number) {
  return (value * Math.PI) / 180;
}
