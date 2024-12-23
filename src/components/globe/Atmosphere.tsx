// Atmosphere.tsx
import * as THREE from "three";

interface AtmosphereProps {
  earthRadius: number;
}

export default function Atmosphere({ earthRadius }: AtmosphereProps) {
  return (
    <mesh>
      {/*
        A sphere slightly bigger than Earth
        side=THREE.BackSide makes the inside faces render outward.
      */}
      <sphereGeometry args={[earthRadius * 1.02, 64, 64]} />
      <meshBasicMaterial
        color="#55ccff"
        side={THREE.BackSide}
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}
