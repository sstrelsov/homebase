// utils/latLongToVector3.ts
import * as THREE from "three";

/**
 * Convert latitude & longitude to a THREE.Vector3 on a sphere.
 * @param lat   latitude in degrees
 * @param lon   longitude in degrees
 * @param radius sphere radius
 */
export function latLongToVector3(lat: number, lon: number, radius: number) {
  // Convert lat/lon to radians
  // Note: This formula orients (lat=0, lon=0) differently than some libraries,
  // so adjust if your globe is rotated differently.
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}
