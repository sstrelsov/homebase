import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DotInfo } from "../../../types/earthTypes";

/**
 * Given an ISO code and an array of DotInfo,
 * compute the average (x, y, z) of all dots for that ISO.
 */
export function getCountryCentroid(
  isoA3: string,
  dots: DotInfo[]
): THREE.Vector3 | null {
  const countryDots = dots.filter((d) => d.isoA3 === isoA3);
  if (!countryDots.length) return null;

  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  for (const d of countryDots) {
    sumX += d.x;
    sumY += d.y;
    sumZ += d.z;
  }

  const count = countryDots.length;
  const avgX = sumX / count;
  const avgY = sumY / count;
  const avgZ = sumZ / count;

  return new THREE.Vector3(avgX, avgY, avgZ);
}

/**
 * Rotate the globe so that lat/lon is front-and-center.
 **/
/**
 * Fly the camera so that `targetPos` ends up in front of you.
 * - `camera`: your THREE.Camera
 * - `controls`: your OrbitControls reference
 * - `targetPos`: a THREE.Vector3 (e.g. a country centroid)
 * - `distanceOffset`: how far away (in world units) to position the camera from that point
 */
export function flyCameraToPoint(
  camera: THREE.Camera,
  controls: OrbitControlsImpl,
  targetPos: THREE.Vector3,
  distanceOffset = 300
) {
  // 1) Compute a camera position that is `distanceOffset` away from targetPos,
  //    in the direction from the Earth's center to that target.
  const dir = targetPos.clone().normalize(); // direction from (0,0,0) out to that point
  const newCamPos = dir.multiplyScalar(targetPos.length() + distanceOffset);

  // 2) Animate the camera position
  gsap.to(camera.position, {
    x: newCamPos.x,
    y: newCamPos.y,
    z: newCamPos.z,
    duration: 2,
    ease: "power2.inOut",
    onUpdate: () => {
      controls.update();
    },
  });
}
/**
 * Convert a 3D position on the sphere to latitude & longitude (in radians).
 *
 * @param x X coordinate
 * @param y Y coordinate
 * @param z Z coordinate
 * @returns { lat, lon } in radians
 */
export function xyzToLatLon(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const lat = Math.asin(y / r);

  let lon = Math.atan2(z, x);

  // Normalize longitude to [-PI, PI]
  if (lon > Math.PI) lon -= 2 * Math.PI;
  if (lon <= -Math.PI) lon += 2 * Math.PI;

  return { lat, lon };
}
/**
 * Given lat/lon (in radians), compute the desired globe.rotation.x/.y.
 */
export function latLonToGlobeRotation(
  lat: number,
  lon: number
): { x: number; y: number } {
  const targetY = -lon;
  const targetX = -lat;

  return { x: targetX, y: targetY };
}

/**
 * Clamp the globe’s X rotation so you never flip above the North Pole or below the South Pole.
 * You can tweak these bounds (±70°, ±80°, etc.) as desired.
 */
export function clampRotationX(x: number): number {
  // Restrict ourselves to ±80° from the equator line (no tilt).
  const minX = THREE.MathUtils.degToRad(-80);
  const maxX = THREE.MathUtils.degToRad(80);

  return THREE.MathUtils.clamp(x, minX, maxX);
}
