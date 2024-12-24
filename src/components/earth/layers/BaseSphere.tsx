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
        color="#0b2a57"
        emissive="#081c3c"
        emissiveIntensity={0.3}
        roughness={0.45}
      />
    </mesh>
  );
};

export default BaseSphere;
