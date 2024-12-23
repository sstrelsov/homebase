import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { useTheme } from "@nextui-org/use-theme";
import { Perf } from "r3f-perf";
import { Suspense, useEffect } from "react";
import Globe from "./layers/Globe";
import ManualBloom from "./ManualBlooms";
const Earth = () => {
  // Temp fix: Theme must be set to dark to render the globe, canvas is black (known issue)
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme !== "dark") {
      setTheme("dark");
    }
  }, []);

  return (
    <Canvas
      // dpr={[1, 1]}
      gl={{ alpha: true }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, 600], fov: 40 }}
    >
      <Perf position="bottom-right" />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minDistance={400}
        maxDistance={1500}
      />
      {/* Subtle ambient light */}
      <ambientLight intensity={0.5} />
      {/* Main directional light (like the sun). Make it 1 for more */}
      <directionalLight intensity={0.5} position={[20, 10, 10]} />
      <hemisphereLight intensity={0.6} position={[0, 50, 0]} />
      <Suspense fallback={null}>
        <Globe
          rotationSpeed={-0.01}
          // Base Sphere
          radius={149}
          // Continents
          dotSize={3}
          dotColor="#ac431d"
          // Atmosphere
          atmosphereColor="#00aaff"
          atmosphereOpacity={0.03}
        />
        {/* Post-processing for glow/bloom */}
        <ManualBloom
          bloomStrength={0.3} // was 0.7
          bloomRadius={0.4} // was 0.5
          bloomThreshold={0.1} // instead of 0.0
        />
      </Suspense>
    </Canvas>
  );
};

export default Earth;
