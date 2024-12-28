import { a, useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useDrag } from "react-use-gesture";
import * as THREE from "three";
import { AllArcsBehavior } from "../../../types/earthTypes";
import ArcGroup, { ArcGroupProps } from "./arcs/ArcGroup";
import Atmosphere, { AtmosphereProps } from "./Atmosphere";
import BaseSphere, { BaseSphereProps } from "./BaseSphere";
import { CityMarkersProps } from "./CityMarkerGroup";
import LandDots, { LandDotsProps } from "./LandDots";

interface GlobeProps {
  baseSphere: BaseSphereProps;
  rotationSpeed: number;
  dots?: LandDotsProps;
  atmosphere?: AtmosphereProps;
  arcs?: ArcGroupProps & { persistArcBehavior: AllArcsBehavior };
  cityMarkers?: CityMarkersProps;
}

const Globe = ({
  baseSphere,
  rotationSpeed,
  arcs,
  atmosphere,
  dots,
  cityMarkers,
}: GlobeProps) => {
  // Ref to our top-level globe group
  const globeRef = useRef<THREE.Group>(null);

  const [dotsLoaded, setDotsLoaded] = useState(false);

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
      euler.y += rotationSpeed * delta;
      api.start({ rotation: [euler.x, euler.y, 0] });
    }
  });

  return (
    <a.group
      ref={globeRef}
      {...(bind() as any)}
      rotation={springs.rotation}
      visible={dotsLoaded}
    >
      {!!baseSphere && <BaseSphere {...baseSphere} />}
      {!!atmosphere && <Atmosphere {...atmosphere} />}
      {!!dots && (
        <LandDots
          onLoaded={(isLoaded) => setDotsLoaded(isLoaded)}
          globeRef={globeRef}
          {...dots}
        />
      )}
      {!!arcs && <ArcGroup {...arcs} />}
    </a.group>
  );
};

export default Globe;
