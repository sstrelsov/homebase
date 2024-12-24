import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import { flightPaths } from "../utils/routes";
import Arc from "./Arc";
import Atmosphere from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import ContinentDots from "./ContinentDots";

function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha;
}

interface GlobeProps {
  radius: number;
  dotSize: number;
  dotColor: string;
  rotationSpeed: number;
  atmosphereColor: string;
  atmosphereOpacity: number;
  // Add this:
  isInteracting: boolean;
}

// const flightPaths = [
//   {
//     start: { lat: 40.7128, lon: -74.006 }, // NYC
//     end: { lat: 51.5074, lon: -0.1278 }, // London
//   },
//   {
//     start: { lat: 34.0522, lon: -118.2437 }, // LA
//     end: { lat: 35.6762, lon: 139.6503 }, // Tokyo
//   },
//   // etc ...
// ];

export default function Globe({
  radius,
  dotSize,
  dotColor,
  rotationSpeed,
  atmosphereColor,
  atmosphereOpacity,
  isInteracting, // <— new
}: GlobeProps) {
  const globeRef = useRef<THREE.Group>(null);

  // Breakpoints for final scale
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const isXSUp = useAtOrAboveBreakpoint("xs");

  let targetScale = 1.0;
  if (isMdUp) {
    targetScale = 1.0;
  } else if (isSmUp) {
    targetScale = 0.8;
  } else if (isXSUp) {
    targetScale = 0.7;
  } else {
    targetScale = 0.6;
  }

  // We start invisible (scale = 0) until the dots are fully loaded
  const [currentScale, setCurrentScale] = useState(0.55);
  const [dotsLoaded, setDotsLoaded] = useState(false);

  useFrame((_, delta) => {
    if (!globeRef.current) return;

    // 1) Only rotate if not interacting
    if (!isInteracting) {
      globeRef.current.rotation.y += rotationSpeed;
    }

    // 2) If dots are loaded, lerp from 0 => targetScale
    const scaleSpeed = 2.0;
    setCurrentScale((prev) => lerp(prev, targetScale, delta * scaleSpeed));
  });

  return (
    <group
      rotation={[0.68, -0.3, 0.28]}
      visible={dotsLoaded}
      ref={globeRef}
      scale={currentScale}
    >
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
        onLoaded={(isLoaded) => setDotsLoaded(isLoaded)}
      />
      {flightPaths.map((flight, i) => (
        <Arc
          key={i}
          startLat={flight.start.lat}
          startLon={flight.start.lon}
          endLat={flight.end.lat}
          endLon={flight.end.lon}
          radius={radius}
          animationDuration={3000}
        />
      ))}
    </group>
  );
}
