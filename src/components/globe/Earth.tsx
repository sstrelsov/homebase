// Earth.tsx
import React, { useRef } from "react";
import * as THREE from "three";

interface EarthProps {
  radius?: number;
}

const Earth: React.FC<EarthProps> = ({ radius = 600 }) => {
  const earthRef = useRef<THREE.Mesh>(null!);

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color="#0E3775" // deep ocean color
        emissive="#000000"
        metalness={0.1} // slight metal effect for a modern sheen
        roughness={0.8} // adjust roughness for glossier or matte
        transparent={true}
        opacity={0.9} // a bit of transparency to see the dots inside
      />
    </mesh>
  );
};

export default Earth;
