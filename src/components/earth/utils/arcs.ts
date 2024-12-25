import * as THREE from "three";

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
