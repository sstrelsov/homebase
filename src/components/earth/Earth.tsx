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
    <Canvas
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, MAX_ZOOMED_OUT], fov: 40 }}
    >
      <Perf position="bottom-right" />

      <OrbitControls
        minDistance={300}
        enablePan={false}
        maxDistance={MAX_ZOOMED_OUT}
        // Listen to orbit control events
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />

      {/* Subtle ambient light */}
      <ambientLight intensity={0.5} />
      {/* Main directional light (like the sun). Make it 1 for more */}
      <directionalLight intensity={0.5} position={[20, 10, 10]} />
      <hemisphereLight intensity={0.6} position={[0, 50, 0]} />

      <Suspense fallback={null}>
        <Globe
          isInteracting={isInteracting}
          rotationSpeed={-0.006}
          radius={149}
          dotSize={3}
          dotColor="#ac431d"
          atmosphereColor="#00aaff"
          atmosphereOpacity={0.03}
        />
        <ManualBloom
          bloomStrength={0.3}
          bloomRadius={0.4}
          bloomThreshold={0.1}
        />
      </Suspense>
    </Canvas>
  );
};

export default Earth;
