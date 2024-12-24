import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import { flightPaths } from "../utils/flightPaths";
import ArcGroup from "./arcs/ArcGroup";
import Atmosphere from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import ContinentDots from "./ContinentDots";

interface GlobeProps {
  radius: number;
  dotSize: number;
  dotColor: string;
  rotationSpeed: number;
  atmosphereColor: string;
  atmosphereOpacity: number;
  isInteracting: boolean;
}

/**
 * A container for the 3D globe that:
 * - Has Earth's sphere, atmosphere, continent dots, and arc lights.
 * - Handles rotation
 * - Animates scale-in after data loads
 * - Conditionally renders flight arcs in sequence
 *
 * @param {GlobeProps} props
 *   @prop {number} radius - Radius of the globe.
 *   @prop {number} dotSize - Size of continent dots.
 *   @prop {string} dotColor - Base color for continent dots (hex).
 *   @prop {number} rotationSpeed - Y-axis rotation speed (radians per frame).
 *   @prop {string} atmosphereColor - Color of atmospheric glow (hex).
 *   @prop {number} atmosphereOpacity - Transparency for the atmosphere effect.
 *   @prop {boolean} isInteracting - Whether the user is currently interacting (pauses rotation).
 *
 * Uses useFrame to:
 * - Rotate the globe if `isInteracting` is false.
 * - Smoothly interpolate scale from 0 to final size once continent dots are loaded.
 *
 * Child components:
 * - BaseSphere
 * - Atmosphere
 * - ContinentDots
 * - Arc (for flight paths)
 */
const Globe = ({
  radius,
  dotSize,
  dotColor,
  rotationSpeed,
  atmosphereColor,
  atmosphereOpacity,
  isInteracting,
}: GlobeProps) => {
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
      <ArcGroup
        locationArray={flightPaths}
        sequential
        color={"#edb119"}
        radius={radius}
        animationDuration={1500}
        onAllArcsDone="persist"
        onProgressPersist={false}
      />
    </group>
  );
};

export default Globe;
