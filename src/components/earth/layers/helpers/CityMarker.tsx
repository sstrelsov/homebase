import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface CityMarkerProps {
  position: THREE.Vector3;
  color: string;
  markerSize: number;
}

/**
 * A single marker that is oriented to face outward from the globe.
 * - Renders a base circle marker plus a pulsing ring effect.
 */
const CityMarker = ({ position, color, markerSize }: CityMarkerProps) => {
  // This is the correct way to define a React Three Fiber ref:
  const groupRef = useRef<THREE.Group>(null!);

  // Compute the normal only once per position
  const normal = useMemo(() => position.clone().normalize(), [position]);

  // Once the group is rendered, set its orientation & position
  useEffect(() => {
    if (!groupRef.current) return;
    const zAxis = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);

    groupRef.current.quaternion.copy(quat);
    groupRef.current.position.copy(position);
  }, [normal, position]);

  return (
    <group ref={groupRef}>
      {/* Base marker (circle) */}
      <mesh>
        <circleGeometry args={[markerSize, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      {/* Pulsing ring effect */}
      <PulseRing baseRadius={markerSize * 3} color={color} />
    </group>
  );
};

export default CityMarker;

/**
 * A repeatedly-expanding ring that fades out as it grows, then resets.
 * You can tweak the speed, scale, and fade for your desired "pulse."
 */
function PulseRing({
  baseRadius,
  color,
}: {
  baseRadius: number;
  color: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null!);

  /**
   * We'll animate a "phase" t from 0..1 over some duration, then reset to 0.
   * - scale = 1 + 1 * t (grows from 1 → 2)
   * - opacity = 1 - t   (fades from 1 → 0)
   */
  const PULSE_DURATION = 2.5; // seconds per pulse
  const MIN_SCALE = 1;
  const MAX_SCALE = 2;

  useFrame((state, delta) => {
    if (!ringRef.current) return;

    // We'll track time in ringRef’s userData (or you could use a useRef for the time).
    // Accumulate delta each frame, loop back when passing PULSE_DURATION.
    if (!ringRef.current.userData.elapsed) {
      ringRef.current.userData.elapsed = 0;
    }

    ringRef.current.userData.elapsed += delta;
    let t = ringRef.current.userData.elapsed / PULSE_DURATION;

    // If time > PULSE_DURATION, reset
    if (t > 1) {
      ringRef.current.userData.elapsed = 0;
      t = 0;
    }

    // scale 1..2
    const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
    // fade 1..0
    const opacity = 1 - t;

    ringRef.current.scale.set(scale, scale, scale);
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;
  });

  return (
    <mesh ref={ringRef}>
      {/* Slightly thin ring geometry so it looks like a halo */}
      <ringGeometry args={[baseRadius * 0.95, baseRadius * 1.0, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
