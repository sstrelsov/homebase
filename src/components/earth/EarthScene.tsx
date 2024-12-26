import { useTheme } from "@nextui-org/use-theme";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";
import Globe from "./layers/Globe";
import ManualBloom from "./layers/ManualBlooms";
import { flightPaths } from "./utils/flightPaths";

const MAX_ZOOMED_OUT = 600;
const EARTH_RADIUS = 150;

/**
 * A top-level 3D Earth component that:
 * - Sets up a Three.js Canvas with OrbitControls and performance stats.
 * - Renders the `Globe` component and optional post-processing (ManualBloom).
 */
const EarthScene = () => {
  // Temp fix: Theme must be set to dark to render the globe, canvas is black (known issue)
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== "dark") {
      setTheme("dark");
    }
  }, [theme, setTheme]);

  const isSmallUp = useAtOrAboveBreakpoint("sm");
  const jsonUrl = isSmallUp
    ? "/landDots-150rad-40k.json" // more dots
    : "/landDots-150rad-30k.json"; // fewer dots

  const [isInteracting, setIsInteracting] = useState(false);
  const resumeRotationTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleInteractionStart = () => {
    // Clear any existing timeouts
    if (resumeRotationTimeout.current) {
      clearTimeout(resumeRotationTimeout.current);
      resumeRotationTimeout.current = null;
    }
    setIsInteracting(true);
  };

  const handleInteractionEnd = () => {
    // Wait 2 seconds before resuming rotation
    resumeRotationTimeout.current = setTimeout(() => {
      setIsInteracting(false);
    }, 1000);
  };

  const isXLUp = useAtOrAboveBreakpoint("xl");
  const isSmUp = useAtOrAboveBreakpoint("sm");

  return (
    <Canvas
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 140, MAX_ZOOMED_OUT], fov: 35 }}
      onCreated={(state) => {
        // Make sure the projection matrix is up to date
        state.camera.updateProjectionMatrix();

        // How far to shift the “center” of the image.
        // Try adjusting offsetX to something like size.width * 0.25 or 0.3, etc.
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
      {/* <Perf position="bottom-right" /> */}

      <OrbitControls
        enableDamping={true}
        minDistance={300}
        minPolarAngle={0.3} // ~17 degrees
        maxPolarAngle={Math.PI - 0.3} // ~163 degrees
        enablePan={false}
        maxDistance={MAX_ZOOMED_OUT}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />

      {/* Subtle ambient and hemispheral light */}
      <ambientLight intensity={1} />
      <hemisphereLight intensity={0.2} position={[0, 50, 0]} />

      <Suspense fallback={null}>
        <Globe
          isInteracting={isInteracting}
          rotationSpeed={0.001}
          radius={EARTH_RADIUS}
          dots={{
            dotColor: "#00aaff",
            pointSize: 2.5,
            jsonUrl,
          }}
          // Atmosphere
          atmosphere={{
            color: "#00aaff",
            opacity: 0.03, // I fear this isn't hooked up to anything
            earthRadius: EARTH_RADIUS,
          }}
          // Arcs
          arcs={{
            locationArray: flightPaths,
            color: "#dd6ff0",
            radius: EARTH_RADIUS,
            animationDuration: 700,
            sequential: false,
            onProgressPersist: true,
            onAllArcsDone: "persist",
            persistArcBehavior: undefined,
          }}
          cityMarkers={{
            cities: flightPaths.map((f) => ({
              lat: f.end.lat,
              lon: f.end.lon,
              name: f.end.name,
            })),
            radius: EARTH_RADIUS,
            color: "#dd6ff0",
            markerSize: 1,
          }}
        />
        <ManualBloom bloomStrength={1.2} bloomRadius={1} bloomThreshold={0.3} />
      </Suspense>
    </Canvas>
  );
};

export default EarthScene;
