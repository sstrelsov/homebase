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
 * A 3D interactive globe component that:
 * - Displays Earth's sphere, atmospheric glow, continent dots, and animated flight arcs.
 * - Manages rotation and responsive scaling.
 * - Handles data-driven animations like arc rendering and smooth scaling after data loads.
 *
 * @param {GlobeProps} props
 *   @prop {number} radius - The base radius of the globe.
 *   @prop {number} rotationSpeed - Speed of rotation along the Y-axis (radians per frame).
 *   @prop {[number, number, number]} rotationCoords - Initial rotation of the globe (Euler angles).
 *   @prop {boolean} isInteracting - Whether user interaction is ongoing (pauses auto-rotation if true).
 *   @prop {ContinentDotsProps} [dots] - Configuration for rendering continent dots, including:
 *     @prop {string} jsonUrl - Path to JSON containing dot coordinates.
 *     @prop {string} dotColor - Base color for dots (hex).
 *     @prop {number} pointSize - Size of the dots.
 *     @prop {function} onLoaded - Callback for when dot data is fully loaded.
 *   @prop {AtmosphereProps} [atmosphere] - Configuration for atmospheric effects, including:
 *     @prop {string} color - Atmospheric glow color (hex).
 *     @prop {number} opacity - Transparency level for the atmosphere.
 *   @prop {ArcGroupProps} [arcs] - Configuration for animated arcs, including:
 *     @prop {Array} locationArray - Array of arc locations (start and end coordinates).
 *     @prop {string} color - Color of the flight arcs (hex).
 *     @prop {number} animationDuration - Time for arc animations (ms).
 *     @prop {function} onAllArcsDone - Callback after all arcs finish rendering.
 *     @prop {function} onProgressPersist - Callback to track animation progress.
 *     @prop {number} radius - Radius of the arcs' sphere.
 *     @prop {boolean} sequential - Whether to animate arcs sequentially.
 *
 * Uses `useFrame` to:
 * - Rotate the globe if `isInteracting` is false.
 * - Smoothly interpolate the globe's scale from 0 to its final size once dots are loaded.
 *
 * Responsive scaling:
 * - Adjusts the globe's size dynamically based on breakpoints (XS, SM, MD).
 * - Final scale values: XS=0.7, SM=0.8, MD+=1.0.
 *
 * Child components:
 * - `BaseSphere`: Renders the globe's core.
 * - `Atmosphere`: Adds an atmospheric glow around the globe.
 * - `ContinentDots`: Plots interactive dots based on continent data.
 * - `ArcGroup`: Animates flight arcs over the globe.
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
