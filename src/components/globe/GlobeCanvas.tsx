// Globe.tsx
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import ContinentDots from "./ContinentDots";
import Earth from "./Earth";

export default function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 900], fov: 40 }}
      style={{ background: "#000000" }} // black background
    >
      {/* Smooth camera orbit */}
      <OrbitControls enablePan={false} minDistance={400} maxDistance={1500} />

      {/* Subtle ambient light for fill */}
      <ambientLight intensity={0.2} color="#ffffff" />

      {/* Directional key light coming from upper-right */}
      <directionalLight
        intensity={1.5}
        color="#ffffff"
        position={[10, 10, 10]}
      />

      {/* Optionally, a second directional or point light for more contrast */}
      <pointLight intensity={0.8} color="#ffffff" position={[-10, -10, -10]} />

      <RotatingGroup />
    </Canvas>
  );
}

function RotatingGroup() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slowly rotate the group
      groupRef.current.rotation.y += 0.02 * delta;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Earth with smaller radius so dots are visible slightly above the surface */}
      <Earth radius={299} />

      {/* Points for continents */}
      <ContinentDots jsonUrl="/landDots.json" pointSize={2} />
    </group>
  );
}
