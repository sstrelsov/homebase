// EarthScene.tsx (or Globe.tsx)
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";

import Atmosphere from "./Atmosphere";
import ContinentDots from "./ContinentDots";
import Earth from "./Earth";
// For demonstration, assume we do an import of local geojson
// or fetch it, whichever you prefer

export default function EarthScene() {
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);

  // Load geojson (or do fetch).
  // If you have a large file, use fetch instead.
  useEffect(() => {
    // If you're doing fetch:
    (async () => {
      await fetch("input.geojson")
        .then((res) => res.json())
        .then((data) => setGeoFeatures(data.features));
      // Or local import:
      // setGeoFeatures(worldGeoJSON.features || []);
    })();
  }, []);

  // Callback from ContinentDots
  const handleCountrySelect = (iso: string) => {
    setSelectedISO(iso);

    // Optionally, auto-clear after 2s
    // setTimeout(() => setSelectedISO(null), 2000);
  };

  return (
    <Canvas camera={{ position: [0, 0, 900], fov: 40 }}>
      <OrbitControls enablePan={false} minDistance={400} maxDistance={1500} />

      {/* Some lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight intensity={1} position={[10, 10, 10]} />

      {/* Earth & Atmosphere */}
      <Earth radius={149} />
      <Atmosphere earthRadius={149} />

      {/* Points for all land. 
          onCountrySelect => highlight the outline */}
      <ContinentDots
        jsonUrl="/landDots.json"
        pointSize={2}
        onCountrySelect={handleCountrySelect}
      />
    </Canvas>
  );
}
