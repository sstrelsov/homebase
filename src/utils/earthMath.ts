import gsap from "gsap";
import * as THREE from "three";
import { DotInfo } from "../types/earthTypes";

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
  controls: any;
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
    duration: 1.5,
    ease: "power2.inOut",
    onUpdate: () => {
      controls.update();
    },
  });
};
