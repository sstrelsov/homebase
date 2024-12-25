import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import ArcGroup, { ArcGroupProps } from "./arcs/ArcGroup";
import Atmosphere, { AtmosphereProps } from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import ContinentDots, { ContinentDotsProps } from "./ContinentDots";

interface GlobeProps {
  radius: number;
  rotationSpeed: number;
  rotationCoords: [number, number, number];
  isInteracting: boolean;
  // Dots
  dots?: ContinentDotsProps;
  // Atmosphere
  atmosphere?: AtmosphereProps;
  // Arcs
  arcs?: ArcGroupProps;
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
 *   @prop {string} arcColor - The color of the flight arcs (hex).
 *   @prop {number} arcAnimationSpeed - Duration of arc animations in milliseconds.
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
  rotationSpeed,
  rotationCoords,
  arcs,
  atmosphere,
  dots,
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
      rotation={rotationCoords}
      visible={dotsLoaded}
      ref={globeRef}
      scale={currentScale}
    >
      <BaseSphere radius={radius - 1} />
      {!!atmosphere && (
        <Atmosphere
          earthRadius={radius - 2}
          color={atmosphere.color}
          opacity={atmosphere.opacity}
        />
      )}
      {!!dots && (
        <ContinentDots
          jsonUrl={dots.jsonUrl}
          dotColor={dots.dotColor}
          pointSize={dots.pointSize}
          onLoaded={(isLoaded) => setDotsLoaded(isLoaded)}
        />
      )}
      {!!arcs && (
        <ArcGroup
          animationDuration={arcs.animationDuration}
          color={arcs.color}
          locationArray={arcs.locationArray}
          onAllArcsDone={arcs.onAllArcsDone}
          onProgressPersist={arcs.onProgressPersist}
          radius={arcs.radius}
          sequential={arcs.sequential}
        />
      )}
    </group>
  );
};

export default Globe;
