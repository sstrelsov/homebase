// Atmosphere.tsx
import { useRef } from "react";
import * as THREE from "three";
import { AtmosphereShader } from "./AtmosphereShader";

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
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[earthRadius * 1.015, 64, 64]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        // Provide uniforms from the imported AtmosphereShader
        uniforms={{
          ...AtmosphereShader.uniforms,
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: 1.2 }, // tweak to your liking
          uPower: { value: 2.0 }, // tweak to your liking
        }}
        vertexShader={AtmosphereShader.vertexShader}
        fragmentShader={AtmosphereShader.fragmentShader}
        opacity={opacity}
      />
    </mesh>
  );
}
