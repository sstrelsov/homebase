import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";
import Globe from "./layers/Globe";
import SceneScaleAndOffsets from "./layers/SceneScaleAndOffsets";
import SceneHelpers from "./SceneHelpers";
import { flattenAllTrips, getArcCities } from "./utils/tripMath";
import { trips } from "./utils/trips";

const MAX_ZOOMED_OUT = 600;
export const EARTH_RADIUS = 150;

interface EarthSceneProps {
  enableHelpers?: boolean;
}

/**
 * A top-level 3D Earth component that:
 * - Sets up a Three.js Canvas with OrbitControls and performance stats.
 * - Renders the `Globe` component and optional post-processing (ManualBloom).
 */
const EarthScene = ({ enableHelpers }: EarthSceneProps) => {
  // Refs for Three.js objects
  const controlsRef = useRef<any>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  // const isoFocused = useAppSelector(selectFocusIso);

  const isSmallUp = useAtOrAboveBreakpoint("sm");
  const jsonUrl = isSmallUp
    ? "/landDots-150rad-60k.json" // more dots
    : "/landDots-150rad-30k.json"; // fewer dots

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
      <SceneScaleAndOffsets>
        <OrbitControls
          ref={controlsRef}
          enableRotate={false}
          enableDamping={true}
          minDistance={300}
          minPolarAngle={0.3} // ~17 degrees
          maxPolarAngle={Math.PI - 0.3} // ~163 degrees
          enablePan={false}
          maxDistance={MAX_ZOOMED_OUT}
        />
        {/* 1) Key Light (strongest, casts shadows) */}
        <directionalLight
          intensity={1.6}
          color="#b3e2ff" // bright, cool blue
          position={[300, 300, 300]}
        />

        {/* Fill Light: from left-ish side, weaker */}
        <directionalLight
          intensity={2}
          color="#df3dff"
          position={[-300, -100, -500]}
        />

        <directionalLight
          intensity={1.8}
          color="#ff7a3d"
          position={[-300, -300, -100]}
        />

        {/* Rim Light: behind the globe for silhouette & drama: Creates a beautiful purple in top right */}
        <directionalLight
          intensity={1.8}
          color="#ff7a3d"
          position={[300, 100, -100]} // -300 also beautiful
        />

        {/* Kicker Light: from below or another interesting angle */}
        <directionalLight
          intensity={1.4}
          color="#8066ff"
          position={[-200, -200, -100]} // z=-300 also beautiful
        />

        <hemisphereLight intensity={0.7} position={[100, 100, 0]} />
        <Suspense fallback={null}>
          <Globe
            rotationSpeed={0.02}
            baseSphere={{
              radius: EARTH_RADIUS - 1,
              color: "#533f7b",
              emissive: "#24083c",
              shininess: 5,
              emissiveIntensity: 0.4,
              specular: "#222222",
            }}
            dots={{
              dotColor: "#df8cfd",
              highlightColor: "#86d4fc",
              pointSize: 2.5,
              jsonUrl,
              controlsRef,
              cameraRef,
            }}
            atmosphere={{
              radius: EARTH_RADIUS,
              scaleFactor: 1.001,
              color: "#f4bcf6",
              power: 5.0,
              intensity: 1.5,
              opacity: 0.5,
            }}
            arcs={{
              locationArray: flattenAllTrips(trips),
              color: "#dd6ff0",
              radius: EARTH_RADIUS,
              animationDuration: 1000,
              onProgressPersist: false,
              infiniteRandom: true,
              persistArcBehavior: undefined,
            }}
            cityMarkers={{
              cities: getArcCities(flattenAllTrips(trips)),
              radius: EARTH_RADIUS,
              color: "#dd6ff0",
              markerSize: 1,
            }}
          />
        </Suspense>
        {enableHelpers && (
          <SceneHelpers axesHelperRef={axesHelperRef} cameraRef={cameraRef} />
        )}
      </SceneScaleAndOffsets>
    </Canvas>
  );
};

export default EarthScene;
