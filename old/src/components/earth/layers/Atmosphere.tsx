import { useRef } from "react";
import * as THREE from "three";

const SEGMENTS = 128;

export interface AtmosphereProps {
  radius: number;
  scaleFactor: number;
  color: string;
  power: number;
  intensity: number;
  opacity: number;
}

/**
 * A spherical atmosphere around a planet.
 *
 * @param radius the radius of the sphere that the atmosphere is on
 * @param scaleFactor the scale factor of the atmosphere relative to the sphere
 * @param color the color of the atmosphere
 * @param power the power of the atmosphere: higher values make the atmosphere more visible
 * @param intensity the intensity of the atmosphere: higher values make the atmosphere brighter
 * @param opacity the opacity of the atmosphere: higher values make the atmosphere more transparent
 * @returns a THREE.js mesh representing the atmosphere
 */
const Atmosphere = ({
  radius,
  scaleFactor,
  color,
  power,
  intensity,
  opacity,
}: AtmosphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale: THREE.Vector3 = Array(3).fill(
    scaleFactor
  ) as unknown as THREE.Vector3;
  return (
    <mesh ref={meshRef} scale={scale} rotation={[0, 0, 0]}>
      <sphereGeometry args={[radius, SEGMENTS, SEGMENTS]} />
      <shaderMaterial
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uOpacity;
          uniform float uPower;
          
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            
            float rim = 1.0 - abs(dot(viewDir, normal));
            rim = pow(rim, uPower) * uIntensity;
            
            gl_FragColor = vec4(uColor * rim, rim * uOpacity);
          }
        `}
        uniforms={{
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
          uOpacity: { value: opacity },
          uPower: { value: power },
        }}
        transparent={true}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default Atmosphere;
