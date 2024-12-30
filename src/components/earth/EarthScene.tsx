import { a } from "@react-spring/three";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { trips } from "../../data/trips";
import { CityLocation } from "../../types/earthTypes";
import { flattenAllTrips, getArcsFromLegs } from "../../utils/arcs";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";
import CameraFocusController from "./controllers/CameraFocusController";
import RotateController from "./controllers/RotateController";
import ScaleOffsetController from "./controllers/ScaleOffsetController";
import ArcGroup from "./layers/arcs/ArcGroup";
import Atmosphere from "./layers/Atmosphere";
import BaseSphere from "./layers/BaseSphere";
import CityMarkers from "./layers/CityMarkerGroup";
import LandDots from "./layers/LandDots";
import SceneHelpers from "./SceneHelpers";
import { useLandDotsData } from "./useLandDotsData";
const MAX_ZOOMED_OUT = 600;
export const EARTH_RADIUS = 150;

interface EarthSceneProps {
  enableHelpers?: boolean;
  focusCameraOnCountry?: string;
  spotlightCountries?: string[];
  spotlightCities?: CityLocation[];
  spotlightMiles?: CityLocation[];
}

/**
 * A top-level 3D Earth component that:
 * - Sets up a Three.js Canvas with OrbitControls and performance stats.
 * - Renders the `Globe` component and optional post-processing (ManualBloom).
 */
const EarthScene = ({
  enableHelpers,
  focusCameraOnCountry,
  spotlightCities,
  spotlightCountries,
  spotlightMiles,
}: EarthSceneProps) => {
  // Refs for Three.js objects
  const controlsRef = useRef<any>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const globeRef = useRef<THREE.Group>(null);
  const isSmallUp = useAtOrAboveBreakpoint("sm");

  const { isLoading, dots } = useLandDotsData(
    `/landDots-150rad-${isSmallUp ? "60" : "25"}k.json`
  );
  console.log(spotlightCities);
  return (
    <Canvas
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 400, 900], fov: 35 }}
      onCreated={(state) => {
        cameraRef.current = state.camera;
        state.raycaster.params.Points.threshold = 2;
      }}
    >
      <ScaleOffsetController>
        <OrbitControls
          ref={controlsRef}
          enableRotate={false}
          enableDamping={true}
          minDistance={300}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
          enablePan={false}
          maxDistance={MAX_ZOOMED_OUT}
        />
        {/* Main Key Light - Subtle cool tone */}
        <directionalLight
          intensity={1.2}
          color="#ffe8d6"
          position={[300, 3000, 300]}
        />

        {/* Accent Light 1 - Adjusted color and position */}
        <directionalLight
          intensity={1.4}
          color="#ff9a6d"
          position={[2500, 200, -800]}
        />

        {/* Accent Light 2 - Adjusted color and position */}
        <directionalLight
          intensity={1.0}
          color="#ff6b9a"
          position={[-2000, 600, -400]}
        />

        {/* Base Light - Adjusted color and intensity */}
        <directionalLight
          intensity={0.6}
          color="#6a5299"
          position={[-800, 0, -800]}
        />

        {/* Depth Light - Adjusted color and intensity */}
        <directionalLight
          intensity={0.7}
          color="#9a8cff"
          position={[-500, 0, 300]}
        />
        <ambientLight intensity={0.55} color="#ffffff" />

        <Suspense fallback={null}>
          <CameraFocusController
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            globeRef={globeRef}
            dots={dots}
            focusIso={focusCameraOnCountry}
          >
            <RotateController rotationSpeed={0.02}>
              <a.group ref={globeRef} visible={!isLoading}>
                <BaseSphere
                  radius={EARTH_RADIUS - 1}
                  color="#533f7b"
                  emissive="#08020e"
                  emissiveIntensity={0.4}
                  shininess={5}
                  specular="#222222"
                />
                <LandDots
                  dotColor="#e4d6f6"
                  highlightColor="#fdf6fe"
                  dots={dots}
                  pointSize={isSmallUp ? 2.7 : 2.3}
                  spotlightCountries={spotlightCountries}
                  edgeFadeStart={isSmallUp ? 0.6 : 0.8}
                  edgeFadeEnd={isSmallUp ? 0.3 : 0.2}
                />
                <Atmosphere
                  radius={EARTH_RADIUS}
                  scaleFactor={1}
                  color="#f1aece"
                  power={15}
                  intensity={5}
                  opacity={0.5}
                />
                {!spotlightCountries && !spotlightCities && (
                  <ArcGroup
                    locationArray={
                      !!spotlightMiles
                        ? getArcsFromLegs(spotlightMiles)
                        : flattenAllTrips(trips)
                    }
                    color="#ef9bfc"
                    radius={EARTH_RADIUS}
                    animationDuration={1000}
                    onProgressPersist={!!spotlightMiles}
                    freeMode={!spotlightMiles}
                  />
                )}
                {!!spotlightCities && (
                  <CityMarkers
                    cities={spotlightCities}
                    radius={EARTH_RADIUS}
                    color="#e6b3ff"
                    markerSize={1}
                  />
                )}
              </a.group>
            </RotateController>
          </CameraFocusController>
        </Suspense>
        {enableHelpers && (
          <SceneHelpers axesHelperRef={axesHelperRef} cameraRef={cameraRef} />
        )}
      </ScaleOffsetController>
    </Canvas>
  );
};

export default EarthScene;
