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
        {/* 1) Key Light (strongest, casts shadows) */}
        <directionalLight
          intensity={1.6}
          color="#b3e2ff" // bright, cool blue
          position={[300, 3000, 300]}
        />

        {/* Fill Light: from left-ish side, weaker */}
        <directionalLight
          intensity={2}
          color="#df3dff"
          position={[-3000, -100, -300]}
        />

        <directionalLight
          intensity={1.8}
          color="#ff7a3d"
          position={[-300, -300, -100]}
        />

        {/* Rim Light: behind the globe for silhouette & drama: Creates a beautiful purple in top right */}
        <directionalLight
          intensity={3.8}
          color="#ff7a3d"
          position={[3000, 100, -600]} // -300 also beautiful
        />

        {/* Kicker Light: from below or another interesting angle */}
        <directionalLight
          intensity={1.4}
          color="#8066ff"
          position={[-200, -200, -100]} // z=-300 also beautiful
        />
        <directionalLight
          intensity={1.4}
          color="#ff9166"
          position={[-800, 0, -800]} // z=-300 also beautiful
        />

        <hemisphereLight intensity={0.7} position={[100, 100, 0]} />
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
                  dotColor="#d9c5f4"
                  highlightColor="#edb0ff"
                  dots={dots}
                  pointSize={isSmallUp ? 2.7 : 3}
                  spotlightCountries={spotlightCountries}
                  edgeFadeStart={isSmallUp ? 0.6 : 0.7}
                  edgeFadeEnd={isSmallUp ? 0.3 : 0.25}
                />
                <Atmosphere
                  radius={EARTH_RADIUS}
                  scaleFactor={1}
                  color="#bc95f3"
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
                    color="#dd6ff0"
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
