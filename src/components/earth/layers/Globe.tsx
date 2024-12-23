import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import ContinentDots from "./ContinentDots";

interface GlobeProps {
  radius: number;
  dotSize: number;
  dotColor: string;
  rotationSpeed: number;
  // Atmosphere
  atmosphereColor: string;
  atmosphereOpacity: number;
}

const Globe = ({
  radius,
  dotSize,
  dotColor,
  rotationSpeed,
  atmosphereColor,
  atmosphereOpacity,
}: GlobeProps) => {
  const globeRef = useRef<THREE.Group>(null!);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += rotationSpeed;
    }
  });
  // Callback from ContinentDots
  const handleCountrySelect = (iso: string) => {
    setSelectedISO(iso);
  };

  console.log("Selected country:", selectedISO);
  return (
    <group ref={globeRef}>
      <BaseSphere radius={radius} />
      <Atmosphere
        earthRadius={radius - 1}
        color={atmosphereColor}
        opacity={atmosphereOpacity}
      />
      <ContinentDots
        jsonUrl="/landDots.json"
        dotColor={dotColor}
        pointSize={dotSize}
        onCountrySelect={handleCountrySelect}
      />
    </group>
  );
};

export default Globe;
