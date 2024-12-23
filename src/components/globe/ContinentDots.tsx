// ContinentDots.tsx
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface DotInfo {
  x: number;
  y: number;
  z: number;
  countryName: string;
  isoA3: string;
}

interface ContinentDotsProps {
  jsonUrl: string;
  pointSize?: number;
  onCountrySelect?: (iso: string) => void; // callback for country selection
}

export default function ContinentDots({
  jsonUrl,
  pointSize = 3,
  onCountrySelect,
}: ContinentDotsProps) {
  const [dots, setDots] = useState<DotInfo[]>([]);
  const highlightRef = useRef<string | null>(null);

  // We'll keep an "animation" timer to fade out highlights
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchDots() {
      try {
        const res = await fetch(jsonUrl);
        const data = await res.json();
        console.log("Loaded landDots.json:", data);
        setDots(data);
      } catch (err) {
        console.error("Failed to load landDots.json:", err);
      }
    }
    fetchDots();
  }, [jsonUrl]);

  // Convert array to Float32Array
  const positions = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const { x, y, z } of dots) {
      arr.push(x, y, z);
    }
    return new Float32Array(arr);
  }, [dots]);

  // Color array, each vertex is [r,g,b], default white
  const colors = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const dot of dots) {
      // default white
      arr.push(1, 1, 1);
    }
    return new Float32Array(arr);
  }, [dots]);

  // Store a reference to the color buffer
  const colorAttrRef = useRef<THREE.BufferAttribute>(null);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (event: any) => {
      if (!dots.length) return;

      const intersection = event.intersections[0];
      if (!intersection) return;

      const idx = intersection.index;
      if (idx == null || !dots[idx]) return;

      const dot = dots[idx];
      console.log(
        `Clicked dot #${idx}. Country = ${dot.countryName}, ISO = ${dot.isoA3}`
      );

      // If parent wants to handle selecting the entire country:
      if (onCountrySelect) onCountrySelect(dot.isoA3);

      // Cancel any old highlight fade
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      // Set highlightRef so we know which country is selected
      highlightRef.current = dot.isoA3;

      // After 2s, revert
      highlightTimerRef.current = setTimeout(() => {
        highlightRef.current = null;
      }, 2000);

      event.stopPropagation();
    },
    [dots, onCountrySelect]
  );

  // Animate the dot colors each frame
  useFrame(() => {
    if (!colorAttrRef.current || !dots.length) return;
    const colorArray = colorAttrRef.current.array as Float32Array;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3;
      if (highlightRef.current && dot.isoA3 === highlightRef.current) {
        // highlight color = bright yellow
        colorArray[offset + 0] = 1;
        colorArray[offset + 1] = 1;
        colorArray[offset + 2] = 0;
      } else {
        // default white
        colorArray[offset + 0] = 1;
        colorArray[offset + 1] = 1;
        colorArray[offset + 2] = 1;
      }
    }
    colorAttrRef.current.needsUpdate = true;
  });

  if (!dots.length) return null;

  return (
    <points onPointerDown={handlePointerDown}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          ref={colorAttrRef}
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={pointSize}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}
