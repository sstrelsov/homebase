import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLongToVector3 } from "../utils/latLongToVector3";

interface ArcProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  radius?: number;
  animationDuration?: number;
}

function Arc({
  startLat,
  startLon,
  endLat,
  endLon,
  radius = 149,
  animationDuration = 2500,
}: ArcProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geometryRef = useRef<THREE.TubeGeometry>(null!);

  // Used to skip further updates once we're done
  const doneRef = useRef(false);

  // Record when we started so we can animate over time
  const [startTime] = useState(() => performance.now());

  // Convert lat/lon → 3D vectors on the sphere
  const startVec = useMemo(
    () => latLongToVector3(startLat, startLon, radius),
    [startLat, startLon, radius]
  );
  const endVec = useMemo(
    () => latLongToVector3(endLat, endLon, radius),
    [endLat, endLon, radius]
  );

  // Create a CubicBezierCurve3 that “bows” outward above the surface
  const curve = useMemo(() => {
    // midpoint on the surface
    const midPoint = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5);
    const distance = startVec.distanceTo(endVec);

    // Arc “height” (pick your own factor)
    const arcHeight = distance * 1.5;
    midPoint.setLength(midPoint.length() + arcHeight);

    // two control points for the cubic bezier
    const control1 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.25);
    const control2 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.75);

    return new THREE.CubicBezierCurve3(startVec, control1, control2, endVec);
  }, [startVec, endVec]);

  // Create Tube geometry from the curve
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.5, 8);
  }, [curve]);

  // Animate the drawRange
  useFrame(() => {
    // If we've finished drawing, skip
    if (doneRef.current || !geometryRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / animationDuration, 1);

    // If the geometry has an index, use its count:
    const indexCount = geometryRef.current.index
      ? geometryRef.current.index.count
      : geometryRef.current.attributes.position.count;

    // Multiply by progress
    geometryRef.current.setDrawRange(0, indexCount * progress);

    // If we've hit 100%, mark as done
    if (progress >= 1) {
      doneRef.current = true;
    }
  });

  return (
    <mesh ref={meshRef}>
      <primitive ref={geometryRef} object={tubeGeometry} />
      <meshBasicMaterial color="#ffcd53" transparent opacity={0.9} />
    </mesh>
  );
}

export default Arc;
