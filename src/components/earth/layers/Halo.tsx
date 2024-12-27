import { useRef } from "react";
import * as THREE from "three";

interface HaloProps {
  radius?: number;
  scaleFactor?: number;
  color?: string;
  power?: number;
  intensity?: number;
  opacity?: number;
}

export default function Halo({
  radius = 150,
  scaleFactor = 1.009,
  color = "#00aaff",
  power = 5.0,
  intensity = 1.5,
  opacity = 0.8,
}: HaloProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} scale={[scaleFactor, scaleFactor, scaleFactor]}>
      <sphereGeometry args={[radius, 128, 128]} />
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
}
