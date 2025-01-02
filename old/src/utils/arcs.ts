import * as THREE from "three";
import { v4 as uuidV4 } from "uuid";
import { ArcLocation, CityLocation, Trip } from "../types/earthTypes";
/**
 * Convert latitude & longitude to a THREE.Vector3 on a sphere.
 * @param lat   latitude in degrees
 * @param lon   longitude in degrees
 * @param radius sphere radius
 */
export const latLongToVector3 = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

/**
 * buildFullArcGeometry
 *
 * Creates a THREE.TubeGeometry for a 3D arc using the same
 * cubic-bezier control logic that your animated ArcLight uses.
 */
export const buildAllArcs = (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  radius: number
) => {
  const startVec = latLongToVector3(startLat, startLon, radius);
  const endVec = latLongToVector3(endLat, endLon, radius);

  // Approx midpoint logic
  const midPoint = new THREE.Vector3()
    .addVectors(startVec, endVec)
    .multiplyScalar(0.5);
  const distance = startVec.distanceTo(endVec);
  const arcHeight = distance * 1.5;
  midPoint.setLength(midPoint.length() + arcHeight);

  const control1 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.25);
  const control2 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.75);

  // Build a cubic bezier arc
  const curve = new THREE.CubicBezierCurve3(
    startVec,
    control1,
    control2,
    endVec
  );

  return new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
};

export const getArcsFromTrip = (trip: Trip): ArcLocation[] => {
  const arcs: ArcLocation[] = [];
  const legs = trip.legs; // an array of CityLocation

  for (let i = 0; i < legs.length - 1; i++) {
    arcs.push({
      start: legs[i],
      end: legs[i + 1],
      id: uuidV4(),
    });
  }
  return arcs;
};

/**
 * Converts an ordered list of city stops [C0, C1, C2, ... Cn]
 * into [Arc(C0->C1), Arc(C1->C2), ..., Arc(Cn-1->Cn)].
 */
export const getArcsFromLegs = (legs: CityLocation[]): ArcLocation[] => {
  const arcs: ArcLocation[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    arcs.push({
      start: legs[i],
      end: legs[i + 1],
      id: uuidV4(),
    });
  }
  return arcs;
};

/**
 * Flatten arcs from all trips into a single array.
 */
export const flattenAllTrips = (trips: Trip[]): ArcLocation[] => {
  return trips.flatMap((trip) => getArcsFromLegs(trip.legs));
};

/**
 * Each arc has start + end city.
 * We want to produce [Arc0.start, Arc0.end, Arc1.end, Arc2.end, ...].
 */
export const getArcCities = (arcs: ArcLocation[]): CityLocation[] => {
  if (arcs.length === 0) return [];

  const cities: CityLocation[] = [];
  // Push the first arc's start city
  cities.push(arcs[0].start);

  // Then for each arc, push the end city
  for (let i = 0; i < arcs.length; i++) {
    cities.push(arcs[i].end);
  }

  return cities;
};

export const flattenAllIsos = (trips: Trip[]): string[] => {
  return Array.from(new Set(trips.flatMap((trip) => trip.countries ?? [])));
};
