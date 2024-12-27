import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ArcLandingEffectProps {
  position: THREE.Vector3;
  color: string;
  onDone?: () => void;
}

const LandingEffect = ({ position, color, onDone }: ArcLandingEffectProps) => {
  const groupRef = useRef<THREE.Group>(null!);

  // If you want separate references to tweak them individually:
  const dotRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  // Circle’s *base* radius (the dot):
  const BASE_RADIUS = 1.5;

  // How large do we want them to expand? (1 = same size as base, 2 = double, etc.)
  const FINAL_SCALE = 1.3;

  // Local state for scale & opacity
  const [dotScale, setDotScale] = useState(0); // for the solid circle
  const [ringScale, setRingScale] = useState(0); // for the expanding ring
  const [ringOpacity, setRingOpacity] = useState(1);

  // Orient the group’s +Z axis toward the point on the globe
  useEffect(() => {
    if (position.lengthSq() === 0) return;
    const normal = position.clone().normalize();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);
    groupRef.current.quaternion.copy(quat);
  }, [position]);

  useFrame(() => {
    // Animate dot scale: step ~6% closer to 1
    const newDotScale = dotScale + (1 - dotScale) * 0.06;
    setDotScale(newDotScale);

    // Animate ring scale: step ~6% closer to 1
    const newRingScale = ringScale + (1 - ringScale) * 0.06;
    setRingScale(newRingScale);

    // Fade ring out as it nears full scale
    const newOpacity = 1 - newRingScale;
    setRingOpacity(newOpacity);

    // Once it's mostly expanded, remove it
    if (newRingScale > 0.98) {
      onDone?.();
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Dot (solid circle) */}
      <mesh
        ref={dotRef}
        scale={[
          dotScale * FINAL_SCALE,
          dotScale * FINAL_SCALE,
          dotScale * FINAL_SCALE,
        ]}
      >
        <circleGeometry args={[BASE_RADIUS, 64]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>

      <mesh
        ref={ringRef}
        scale={[
          ringScale * FINAL_SCALE,
          ringScale * FINAL_SCALE,
          ringScale * FINAL_SCALE,
        ]}
      >
        <ringGeometry args={[10, 3.1, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={ringOpacity}
          side={THREE.DoubleSide}
          depthTest={true}
        />
      </mesh>
    </group>
  );
};

export default LandingEffect;
