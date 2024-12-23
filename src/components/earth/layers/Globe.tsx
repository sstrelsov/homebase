import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
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
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const isXSUp = useAtOrAboveBreakpoint("xs");
  // Decide on scale factor
  let scaleFactor = 1.0;
  if (isMdUp) {
    scaleFactor = 1.0;
  } else if (isSmUp) {
    scaleFactor = 0.8;
  } else if (isXSUp) {
    scaleFactor = 0.7;
  } else {
    scaleFactor = 0.6; // Default scale factor for smaller breakpoints
  }
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
    <group ref={globeRef} scale={scaleFactor}>
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
