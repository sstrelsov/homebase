import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import { AllArcsBehavior } from "../../../types/earthTypes";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import ArcGroup, { ArcGroupProps } from "./arcs/ArcGroup";
import Atmosphere, { AtmosphereProps } from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import CityMarkers, { CityMarkersProps } from "./CityMarkerGroup";
import ContinentDots, { ContinentDotsProps } from "./ContinentDots";

interface GlobeProps {
  radius: number;
  rotationSpeed: number;
  rotationCoords: [number, number, number];
  isInteracting: boolean;
  dots?: ContinentDotsProps;
  atmosphere?: AtmosphereProps;
  arcs?: ArcGroupProps & { persistArcBehavior: AllArcsBehavior };
  cityMarkers?: CityMarkersProps;
}

/**
 * 3D Interactive Globe Component
 * - Features: Earth's sphere, atmosphere, continent dots, and animated arcs.
 * - Responsive Scaling: Adjusts based on breakpoints (XS, SM, MD).
 * - Animation: Handles rotation and smooth scaling after data loads.
 *
 * Props:
 * - radius: Base radius of the globe.
 * - rotationSpeed: Speed of Y-axis rotation (radians/frame).
 * - rotationCoords: Initial rotation (Euler angles).
 * - isInteracting: Pauses auto-rotation when true.
 * - dots: Configuration for continent dots.
 * - atmosphere: Atmospheric glow configuration.
 * - arcs: Flight arc animation configuration.
 */
const Globe = ({
  radius,
  rotationSpeed,
  rotationCoords,
  arcs,
  atmosphere,
  dots,
  cityMarkers,
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

      {!!cityMarkers && (
        <CityMarkers
          cities={cityMarkers.cities}
          radius={cityMarkers.radius}
          color={cityMarkers.color}
          markerSize={cityMarkers.markerSize}
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
          persistArcBehavior={arcs.persistArcBehavior}
        />
      )}
    </group>
  );
};

export default Globe;
