import { useRef } from "react";
import * as THREE from "three";

const SEGMENTS = 128;

export interface AtmosphereProps {
  radius: number;
  scaleFactor?: number;
  color: THREE.ColorRepresentation;
}

const Atmosphere = ({ radius, scaleFactor = 1.1, color }: AtmosphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} scale={[scaleFactor, scaleFactor, scaleFactor]}>
      <sphereGeometry args={[radius, SEGMENTS, SEGMENTS]} />
      <shaderMaterial
        // 1. Declare `uColor` as a uniform
        uniforms={{
          uColor: { value: new THREE.Color(color) },
        }}
        vertexShader={`
          varying vec3 vNormal;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix
                          * modelViewMatrix
                          * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          // 2. Access the uniform in the fragment shader
          varying vec3 vNormal;
          uniform vec3 uColor;

          void main() {
            float intensity = pow(
              0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)),
              12.0
            );

            // 3. Use the uniform color for the atmosphere
            gl_FragColor = vec4(uColor, 1.0) * intensity;
          }
        `}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
      />
    </mesh>
  );
};

export default Atmosphere;
