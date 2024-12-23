// Atmosphere.tsx
import * as THREE from "three";

interface AtmosphereProps {
  earthRadius: number;
  color: string;
  opacity: number;
}

export default function Atmosphere({
  earthRadius,
  color,
  opacity,
}: AtmosphereProps) {
  return (
    <mesh>
      <sphereGeometry args={[earthRadius * 1.02, 64, 64]} />
      <meshBasicMaterial
        color={color}
        side={THREE.BackSide}
        opacity={opacity} // super low so it’s not overwhelming
      />
    </mesh>
  );
}
