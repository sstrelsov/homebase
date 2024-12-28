import { a } from "@react-spring/three";
import { useRef, useState } from "react";
import * as THREE from "three";
import { AllArcsBehavior } from "../../../types/earthTypes";
import ArcGroup, { ArcGroupProps } from "./arcs/ArcGroup";
import Atmosphere, { AtmosphereProps } from "./Atmosphere";
import BaseSphere, { BaseSphereProps } from "./BaseSphere";
import { CityMarkersProps } from "./CityMarkerGroup";
import LandDots, { LandDotsProps } from "./LandDots";

interface GlobeProps {
  baseSphere: BaseSphereProps;
  dots?: LandDotsProps;
  atmosphere?: AtmosphereProps;
  arcs?: ArcGroupProps & { persistArcBehavior: AllArcsBehavior };
  cityMarkers?: CityMarkersProps;
}

const Globe = ({
  baseSphere,
  arcs,
  atmosphere,
  dots,
  cityMarkers,
}: GlobeProps) => {
  // Ref to our top-level globe group
  const globeRef = useRef<THREE.Group>(null);
  const [dotsLoaded, setDotsLoaded] = useState(false);

  return (
    <a.group ref={globeRef} visible={dotsLoaded}>
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
