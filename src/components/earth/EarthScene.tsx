import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";
import Globe from "./layers/Globe";
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
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  // const isoFocused = useAppSelector(selectFocusIso);

  const isSmallUp = useAtOrAboveBreakpoint("sm");
  const jsonUrl = isSmallUp
    ? "/landDots-150rad-40k.json" // more dots
    : "/landDots-150rad-30k.json"; // fewer dots

  const isXLUp = useAtOrAboveBreakpoint("xl");
  const isSmUp = useAtOrAboveBreakpoint("sm");

  // useEffect(() => {
  //   if (!!isoFocused) {
  //     // Get markers from cities const cities = getArcCities(get)
  //   }
  // }, [isoFocused]);

  return (
    <Canvas
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 400, 900], fov: 35 }}
      onCreated={(state) => {
        cameraRef.current = state.camera; // Store camera reference
        state.camera.updateProjectionMatrix();
        const offsetX = isXLUp ? state.size.width * 0.2 : 0;
        const offsetY = isSmUp ? 0 : state.size.height * 0.07;
        state.camera.setViewOffset(
          /* fullWidth  */ state.size.width,
          /* fullHeight */ state.size.height,
          /* offsetX    */ offsetX,
          /* offsetY    */ offsetY,
          /* width      */ state.size.width,
          /* height     */ state.size.height
        );

        state.raycaster.params.Points.threshold = 2;
      }}
    >
      <OrbitControls
        ref={controlsRef}
        enableDamping={true}
        minDistance={300}
        minPolarAngle={0.3} // ~17 degrees
        maxPolarAngle={Math.PI - 0.3} // ~163 degrees
        enablePan={false}
        maxDistance={MAX_ZOOMED_OUT}
      />
      <directionalLight
        intensity={2.0}
        position={[-300, 200, 100]} // Some offset from Earth
      />
      <hemisphereLight intensity={0.5} position={[100, 100, 0]} />
      <Suspense fallback={null}>
        <Globe
          rotationSpeed={0.0002}
          radius={EARTH_RADIUS}
          dots={{
            dotColor: "#44ff00",
            highlightColor: "#86d4fc",
            pointSize: 2.5,
            jsonUrl,
            controlsRef,
            cameraRef,
          }}
          atmosphere={{
            color: "#00aaff",
            opacity: 0.03, // I fear this isn't hooked up to anything
            earthRadius: EARTH_RADIUS,
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
    </Canvas>
  );
};

export default EarthScene;
