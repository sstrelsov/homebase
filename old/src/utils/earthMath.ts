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
