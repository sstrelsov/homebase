// CountryOutline.tsx
import { useMemo } from "react";
import * as THREE from "three";

/**
 * We assume polygon is like: [ [lon, lat], [lon, lat], ... ] in degrees
 * for the *outer ring* of the country's boundary.
 */
function convertPolygonToVectors(
  polygon: number[][],
  radius: number
): THREE.Vector3[] {
  const vectors: THREE.Vector3[] = [];
  for (const [lonDeg, latDeg] of polygon) {
    const latRad = (Math.PI / 180) * latDeg;
    const lonRad = (Math.PI / 180) * lonDeg;

    // Spherical -> Y-up. Flip z to avoid mirrored Earth
    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.sin(latRad);
    const z = -radius * Math.cos(latRad) * Math.sin(lonRad);

    vectors.push(new THREE.Vector3(x, y, z));
  }
  return vectors;
}

interface CountryOutlineProps {
  polygon: number[][]; // array of [lon, lat]
  radius: number;
  color?: string;
}

export default function CountryOutline({
  polygon,
  radius,
  color = "red",
}: CountryOutlineProps) {
  // Build BufferGeometry from the polygon's lat/lon
  const lineGeometry = useMemo(() => {
    const vectors = convertPolygonToVectors(polygon, radius);
    // Create a buffer geometry from those points

    const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
    console.log("CountryOutline geometry:", geometry);
    return geometry;
  }, [polygon, radius]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}
