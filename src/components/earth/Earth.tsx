import { useTheme } from "@nextui-org/use-theme";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense, useEffect, useRef, useState } from "react";
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
    }, 2000);
  };

  return (
    <div className="h-full w-full">
      <Canvas
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
        camera={{ position: [0, 0, MAX_ZOOMED_OUT], fov: 35 }}
      >
        <Perf position="bottom-right" />

        <OrbitControls
          minDistance={300}
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
            rotationCoords={[0.68, -0.3, 0.28]}
            rotationSpeed={-0.001}
            radius={EARTH_RADIUS}
            dots={{
              dotColor: "#a22eb6",
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
              color: "#edb119",
              radius: EARTH_RADIUS,
              animationDuration: 1500,
              sequential: false,
              onProgressPersist: true,
              onAllArcsDone: "persist",
              persistArcBehavior: "smooth",
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
