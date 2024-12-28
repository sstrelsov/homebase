import { a, useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDrag } from "react-use-gesture";
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
import { CityMarkersProps } from "./CityMarkerGroup";
import ContinentDots, { ContinentDotsProps } from "./ContinentDots";

interface GlobeProps {
  radius: number;
  rotationSpeed: number; // Radians per second (recommended)
  dots?: ContinentDotsProps;
  atmosphere?: AtmosphereProps;
  arcs?: ArcGroupProps & { persistArcBehavior: AllArcsBehavior };
  cityMarkers?: CityMarkersProps;
}

const Globe = ({
  radius,
  rotationSpeed = 0.05, // Example default
  arcs,
  atmosphere,
  dots,
  cityMarkers,
}: GlobeProps) => {
  // Ref to our top-level globe group
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

  // Read the currently selected ISO from Redux
  const focusIso = useAppSelector(selectFocusIso);

  // State for "ephemeral" arcs triggered by a country button
  const [highlightArcs, setHighlightArcs] = useState<ArcLocation[]>([]);
  const [highlightArcKey, setHighlightArcKey] = useState(0);

  useEffect(() => {
    setHighlightArcs([]);
    if (!focusIso) return;
    const matchedTrips = trips.filter((t) => t.countries.includes(focusIso));
    setHighlightArcKey((prev) => prev + 1);
    const allArcs = matchedTrips.flatMap((trip) => getArcsFromTrip(trip));
    setHighlightArcs(allArcs);
  }, [focusIso]);

  const euler = useMemo(() => new THREE.Euler(0, 0, 0), []);

  const [springs, api] = useSpring<{
    rotation: [number, number, number] | any;
  }>(() => ({
    rotation: [0, 0, 0],
    config: { mass: 1, friction: 30, tension: 50 },
  }));

  const [isDragging, setIsDragging] = useState(false);

  const bind = useDrag(({ offset: [ox, oy], active }) => {
    setIsDragging(active);

    // Convert offset into rotation
    const factor = 0.005;
    const newX = oy * factor;
    const newY = ox * factor;

    // Clamp X so we don’t flip poles
    const clampedX = THREE.MathUtils.clamp(newX, -Math.PI / 2, Math.PI / 2);

    euler.x = clampedX;
    euler.y = newY;

    api.start({ rotation: [euler.x, euler.y, 0] });
  });

  // Auto-rotate Y when not dragging
  useFrame((_, delta) => {
    if (!isDragging) {
      euler.y += 0.02 * delta;
      api.start({ rotation: [euler.x, euler.y, 0] });
    }
  });

  useFrame((_, delta) => {
    if (!isDragging && !focusIso) {
      euler.y += rotationSpeed * delta;
      api.start({ rotation: [euler.x, euler.y, 0] });
    }

    const scaleSpeed = 2.0;
    setCurrentScale((prev) => lerp(prev, targetScale, delta * scaleSpeed));
  });

  return (
    <a.group
      ref={globeRef}
      {...(bind() as any)}
      rotation={springs.rotation}
      scale={currentScale}
      visible={dotsLoaded}
    >
      <BaseSphere radius={radius - 1} />

      {!!atmosphere && <Atmosphere {...atmosphere} />}
      {!!dots && (
        <ContinentDots
          jsonUrl={dots.jsonUrl}
          dotColor={dots.dotColor}
          pointSize={dots.pointSize}
          onLoaded={(isLoaded) => setDotsLoaded(isLoaded)}
          globeRef={globeRef}
          controlsRef={dots.controlsRef}
          cameraRef={dots.cameraRef}
          highlightColor={dots.highlightColor}
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
          infiniteRandom={arcs.infiniteRandom}
          persistArcBehavior={arcs.persistArcBehavior}
        />
      )}
      {highlightArcs.length > 0 && !!arcs && (
        <ArcGroup
          key={highlightArcKey}
          locationArray={highlightArcs}
          color={arcs.color}
          radius={EARTH_RADIUS}
          firstAnimationDuration={1500}
          animationDuration={500}
          onProgressPersist={false}
          onAllArcsDone="remove"
          persistArcBehavior={undefined}
        />
      )}
    </a.group>
  );
};

export default Globe;
