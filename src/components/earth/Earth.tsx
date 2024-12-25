import { useTheme } from "@nextui-org/use-theme";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import Globe from "./layers/Globe";
import ManualBloom from "./layers/ManualBlooms";
import { flightPaths } from "./utils/flightPaths";

const MAX_ZOOMED_OUT = 600;
const ROTATION_START_ATLANTIC = [0.68, -0.3, 0.28];
const EARTH_RADIUS = 150;
const EARTH_TILT = 23.4 * (Math.PI / 180); // ~0.41
const STARTING_Y = -1;

/**
 * A top-level 3D Earth component that:
 * - Sets up a Three.js Canvas with OrbitControls and performance stats.
 * - Renders the `Globe` component and optional post-processing (ManualBloom).
 */
const Earth = () => {
  // Temp fix: Theme must be set to dark to render the globe, canvas is black (known issue)
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== "dark") {
      setTheme("dark");
    }
  }, [theme, setTheme]);

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

  return (
    <div className="h-full w-full">
      <Canvas
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
        camera={{ position: [0, -100, MAX_ZOOMED_OUT], fov: 35 }}
        onCreated={(state) => {
          // Increase the threshold so clicks are less “exact”.
          // Adjust the number until it feels right.
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
            isInteracting={false}
            rotationCoords={[EARTH_TILT, STARTING_Y, 0]}
            rotationSpeed={0.001}
            radius={EARTH_RADIUS}
            dots={{
              dotColor: "#00aaff",
              pointSize: 3,
              jsonUrl: "/landDots.json",
            }}
            // Atmosphere
            atmosphere={{
              color: "#00aaff",
              opacity: 0.03,
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
              persistArcBehavior: "smooth",
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
          <ManualBloom
            bloomStrength={1.2}
            bloomRadius={1}
            bloomThreshold={0.3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Earth;
