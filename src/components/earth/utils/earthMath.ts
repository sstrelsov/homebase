import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DotInfo } from "../../../types/earthTypes";

interface GetCountryCentroidProps {
  isoA3: string;
  dots: DotInfo[];
}

/**
 * Given an ISO code and an array of DotInfo,
 * compute the average (x, y, z) of all dots for that ISO.
 */
export const getCountryCentroid = ({
  isoA3,
  dots,
}: GetCountryCentroidProps): THREE.Vector3 | null => {
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
  return new THREE.Vector3(sumX / count, sumY / count, sumZ / count);
};

interface FlyCameraToPointProps {
  camera: THREE.Camera;
  controls: OrbitControlsImpl;
  targetPos: THREE.Vector3;
  distanceOffset?: number;
}

/**
 * Fly the camera so that `targetPos` ends up in front of you.
 * - `camera`: your THREE.Camera
 * - `controls`: your OrbitControls reference
 * - `targetPos`: a THREE.Vector3 (e.g. a country centroid)
 * - `distanceOffset`: how far away (in world units) to position the camera from that point
 */
export const flyCameraToPoint = ({
  camera,
  controls,
  targetPos,
  distanceOffset = 300,
}: FlyCameraToPointProps): void => {
  // 1) Compute a camera position that is `distanceOffset` away from targetPos
  const dir = targetPos.clone().normalize();
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
};

/** ------------------------------------------------------------------
 *  (OPTIONAL) HELPER #1: Fly camera to a specific ISO code directly.
 * ------------------------------------------------------------------ */
// This function is purely optional — it’s basically a convenience that
// wraps getCountryCentroid and flyCameraToPoint together.
export function flyCameraToCountry({
  camera,
  controls,
  globe,
  isoA3,
  dots,
  distanceOffset = 300,
}: {
  camera: THREE.Camera;
  controls: OrbitControlsImpl;
  globe: THREE.Group;
  isoA3: string;
  dots: DotInfo[];
  distanceOffset?: number;
}) {
  const centroid = getCountryCentroid({ isoA3, dots });
  if (!centroid) return;
  const worldPos = centroid.clone();
  globe.localToWorld(worldPos);
  flyCameraToPoint({
    camera,
    controls,
    targetPos: worldPos,
    distanceOffset,
  });
}

/** ------------------------------------------------------------------
 *  (OPTIONAL) HELPER #2: Sort & get the nearest intersection from a pointer event.
 * ------------------------------------------------------------------ */
export function getNearestIntersection(
  e: THREE.Event & { intersections?: THREE.Intersection[] }
): THREE.Intersection | null {
  if (!e.intersections || e.intersections.length === 0) {
    return null;
  }
  // Sort by distance ascending
  const sorted = e.intersections.sort((a, b) => a.distance - b.distance);
  return sorted[0];
}
