// Earth.tsx
import { useRef } from "react";
import * as THREE from "three";

interface BaseSphereProps {
  radius?: number;
}

const BaseSphere = ({ radius = 299 }: BaseSphereProps) => {
  const earthRef = useRef<THREE.Mesh>(null!);

  return (
    /**
     * Convert degrees to radians.
     * Negative X rotation so north hemisphere tilts forward (toward camera).
     */
    <mesh ref={earthRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color="#0E3775"
        emissive="#081c3c" // faint emissive for a subtle glow
        metalness={0.1}
        // roughness={0.8} // decreased for more gloss
        // transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
};

export default BaseSphere;
