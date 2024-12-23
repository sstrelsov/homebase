import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { useLinkColor } from "../../utils/ColorContext";
import Globe from "./layers/Globe";
import ManualBloom from "./ManualBlooms";

const Earth = () => {
  const { linkColor } = useLinkColor();

  return (
    <Canvas camera={{ position: [0, 0, 600], fov: 40 }}>
      <OrbitControls enablePan={false} minDistance={400} maxDistance={1500} />
      {/* Subtle ambient light */}
      <ambientLight intensity={0.5} />
      {/* Main directional light (like the sun). Make it 1 for more */}
      <directionalLight intensity={0.5} position={[20, 10, 10]} />
      <hemisphereLight intensity={0.6} position={[0, 50, 0]} />
      <Globe
        rotationSpeed={-0.002}
        // Base Sphere
        radius={149}
        // Continents
        dotSize={3}
        dotColor={linkColor}
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
    </Canvas>
  );
};

export default Earth;
