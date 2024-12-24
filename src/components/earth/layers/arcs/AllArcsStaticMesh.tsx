import { useMemo } from "react";
import * as THREE from "three";
import { latLongToVector3 } from "../../utils/latLongToVector3";

interface Coordinates {
  lat: number;
  lon: number;
}

interface ArcLocation {
  start: Coordinates;
  end: Coordinates;
}

interface AllArcsStaticMeshProps {
  flights: ArcLocation[];
  color: string;
  radius: number;
}
const AllArcsStaticMesh = ({
  flights,
  color,
  radius,
}: AllArcsStaticMeshProps) => {
  // Precompute an array of geometries
  const arcGeometries = useMemo(() => {
    return flights.map((flight) => {
      return buildFullArcGeometry(
        flight.start.lat,
        flight.start.lon,
        flight.end.lat,
        flight.end.lon,
        radius
      );
    });
  }, [flights, radius]);

  return (
    <>
      {arcGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
};

export default AllArcsStaticMesh;

/**
 * buildFullArcGeometry
 *
 * Creates a THREE.TubeGeometry for a 3D arc using the same
 * cubic-bezier control logic that your animated ArcLight uses.
 */
function buildFullArcGeometry(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  radius: number
) {
  const startVec = latLongToVector3(startLat, startLon, radius);
  const endVec = latLongToVector3(endLat, endLon, radius);

  // Same midpoint logic from your animated Arc
  const midPoint = new THREE.Vector3()
    .addVectors(startVec, endVec)
    .multiplyScalar(0.5);
  const distance = startVec.distanceTo(endVec);
  const arcHeight = distance * 1.5;
  midPoint.setLength(midPoint.length() + arcHeight);

  const control1 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.25);
  const control2 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.75);

  // Build the complete cubic bezier
  const curve = new THREE.CubicBezierCurve3(
    startVec,
    control1,
    control2,
    endVec
  );

  // Create a full tube geometry with no partial draw
  return new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
}
