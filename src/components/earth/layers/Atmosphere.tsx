// Atmosphere.tsx
import { useRef } from "react";
import * as THREE from "three";
import { AtmosphereShader } from "../utils/AtmosphereShader";

interface AtmosphereProps {
  earthRadius: number;
  color: string;
  opacity: number;
}

/**
 * A slightly larger, inverted sphere around the Earth for a glowing atmospheric effect.
 * Uses a custom shader from `AtmosphereShader`.
 *
 * @param {AtmosphereProps} props
 *   @prop {number} earthRadius - Base radius of the Earth sphere.
 *   @prop {string} color - Color for the atmosphere glow (hex).
 *   @prop {number} opacity - Opacity level for the atmospheric glow.
 *
 * Renders a sphere with THREE.BackSide and a custom shader material to achieve a radial glow.
 */
const Atmosphere = ({ earthRadius, color, opacity }: AtmosphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[earthRadius * 1.015, 64, 64]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        uniforms={{
          ...AtmosphereShader.uniforms,
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: 1.2 },
          uPower: { value: 2.0 },
        }}
        vertexShader={AtmosphereShader.vertexShader}
        fragmentShader={AtmosphereShader.fragmentShader}
        opacity={opacity}
      />
    </mesh>
  );
};

export default Atmosphere;
