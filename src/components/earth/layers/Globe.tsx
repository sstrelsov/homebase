import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import { selectFocusIso } from "../../../store/globeSlice";
import { useAppSelector } from "../../../store/hooks";
import { AllArcsBehavior, ArcLocation } from "../../../types/earthTypes";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import { EARTH_RADIUS } from "../EarthScene";
import { getArcsFromTrip } from "../utils/tripMath";
import { trips } from "../utils/trips";
import ArcGroup, { ArcGroupProps } from "./arcs/ArcGroup";
import Atmosphere, { AtmosphereProps } from "./Atmosphere";
import BaseSphere from "./BaseSphere";
import CityMarkers, { CityMarkersProps } from "./CityMarkerGroup";
import ContinentDots, { ContinentDotsProps } from "./ContinentDots";

interface GlobeProps {
  radius: number;
  rotationSpeed: number;
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
 * - isInteracting: Pauses auto-rotation when true.
 * - dots: Configuration for continent dots.
 * - atmosphere: Atmospheric glow configuration.
 * - arcs: Flight arc animation configuration.
 */
const Globe = ({
  radius,
  rotationSpeed,
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

  // 1) Read the currently selected ISO from Redux
  const focusIso = useAppSelector(selectFocusIso);

  // 2) State for "ephemeral" arcs triggered by a country button
  const [highlightArcs, setHighlightArcs] = useState<ArcLocation[]>([]);

  useEffect(() => {
    setHighlightArcs([]);
    if (!focusIso) return;
    console.log("ISO FOCUSED!", focusIso);
    // Filter trips that have this iso in trip.countries
    const matchedTrips = trips.filter((t) => t.countries.includes(focusIso));
    console.log("Matched trips", matchedTrips);
    // Flatten all matched trips into arcs
    const allArcs = matchedTrips.flatMap((trip) => getArcsFromTrip(trip));
    console.log("All arcs", allArcs);
    // Store them in state
    setHighlightArcs(allArcs);
    if (
      !dots?.controlsRef?.current ||
      !dots?.cameraRef?.current ||
      !globeRef.current
    )
      return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIso]);

  useFrame((_, delta) => {
    if (!globeRef.current) return;

    // 1) Only rotate if not interacting
    if (!focusIso) {
      globeRef.current.rotation.y += rotationSpeed;
    }

    const scaleSpeed = 2.0;
    setCurrentScale((prev) => lerp(prev, targetScale, delta * scaleSpeed));
  });

  return (
    <group visible={dotsLoaded} ref={globeRef} scale={currentScale}>
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
          globeRef={globeRef}
          controlsRef={dots.controlsRef}
          cameraRef={dots.cameraRef}
          highlightColor="white"
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
      {!!arcs && !highlightArcs.length && (
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
      {highlightArcs.length > 0 && !!arcs && (
        <ArcGroup
          locationArray={highlightArcs}
          color={arcs.color}
          radius={EARTH_RADIUS}
          animationDuration={700}
          sequential={true}
          onProgressPersist={false}
          onAllArcsDone="persist"
          persistArcBehavior={undefined}
        />
      )}
    </group>
  );
};

export default Globe;
