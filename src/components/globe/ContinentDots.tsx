// OfflineContinentDots.tsx
import { useEffect, useMemo, useState } from "react";

/** Example shape of each dot in landDots.json */
interface DotInfo {
  x: number;
  y: number;
  z: number;
  countryName: string;
  isoA3: string;
}

interface ContinentDotsProps {
  jsonUrl: string; // e.g. "/landDots.json"
  pointSize?: number;
}

export default function ContinentDots({
  jsonUrl,
  pointSize = 3,
}: ContinentDotsProps) {
  const [dots, setDots] = useState<DotInfo[]>([]);

  /** 1) Fetch the data on mount */
  useEffect(() => {
    async function fetchDots() {
      try {
        const res = await fetch(jsonUrl);
        const data = await res.json();
        console.log("Loaded landDots.json:", data);
        // data should be an array like [{x,y,z, countryName, isoA3}, ...]
        setDots(data);
      } catch (err) {
        console.error("Failed to load landDots.json:", err);
      }
    }
    fetchDots();
  }, [jsonUrl]);

  /** 2) Build Float32Array of positions from "dots" */
  const positions = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const { x, y, z } of dots) {
      arr.push(x, y, z);
    }
    return new Float32Array(arr);
  }, [dots]);

  // If no data yet, do nothing
  if (!dots.length) return null;

  /** 4) Return the <points> geometry */
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={2}
        sizeAttenuation
        transparent
        opacity={0.85}
        alphaTest={0.1} // optional, can help with blending edges
      />
    </points>
  );
}
