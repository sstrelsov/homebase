import { useTheme } from "@nextui-org/use-theme";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Suspense, useEffect, useRef, useState } from "react";
import Globe from "./layers/Globe";
import ManualBloom from "./ManualBlooms";

const MAX_ZOOMED_OUT = 600;

const Earth = () => {
  // Temp fix: Theme must be set to dark to render the globe, canvas is black (known issue)
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme !== "dark") {
      setTheme("dark");
    }
  }, [theme, setTheme]);

  // Track whether the user is currently interacting
  const [isInteracting, setIsInteracting] = useState(false);

  // We'll also track a 2-second timer for after the user stops interacting
  const resumeRotationTimeout = useRef<NodeJS.Timeout | null>(null);

  function handleInteractionStart() {
    // Clear any existing timeouts
    if (resumeRotationTimeout.current) {
      clearTimeout(resumeRotationTimeout.current);
      resumeRotationTimeout.current = null;
    }
    setIsInteracting(true);
  }

  function handleInteractionEnd() {
    // Wait 2 seconds before resuming rotation
    resumeRotationTimeout.current = setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  }

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
            rotationSpeed={-0.001}
            radius={149}
            dotSize={3}
            dotColor="#a22eb6"
            atmosphereColor="#00aaff"
            atmosphereOpacity={0.03}
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
