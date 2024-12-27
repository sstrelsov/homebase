import { useRef } from "react";
import * as THREE from "three";
import { AtmosphereShader } from "../utils/AtmosphereShader";

export interface AtmosphereProps {
  earthRadius: number;
  color: string;
  opacity: number;
}

const Atmosphere = ({ earthRadius, color, opacity }: AtmosphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef}>
      {/* Make the sphere slightly bigger than Earth */}
      <sphereGeometry args={[150 * 1.03, 64, 64]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          ...AtmosphereShader.uniforms,
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: 1.0 },
          uPower: { value: 1.5 },
          uOpacity: { value: opacity }, // e.g. 0.3
        }}
        vertexShader={AtmosphereShader.vertexShader}
        fragmentShader={AtmosphereShader.fragmentShader}
      />
    </mesh>
  );
};

export default Atmosphere;
