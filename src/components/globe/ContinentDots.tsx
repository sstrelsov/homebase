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
}

export default function ContinentDots({
  jsonUrl,
  pointSize = 3,
}: ContinentDotsProps) {
  const [dots, setDots] = useState<DotInfo[]>([]);
  const [highlightIso, setHighlightIso] = useState<string | null>(null);
  const highlightRef = useRef<string | null>(null);

  // We'll keep an "animation" timer to fade out highlights
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1) Fetch the data on mount
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

  // 2) Build positions array
  const positions = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const { x, y, z } of dots) {
      arr.push(x, y, z);
    }
    return new Float32Array(arr);
  }, [dots]);

  // 3) Build a color array: each vertex is [r,g,b], all default white
  const colors = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const dot of dots) {
      // Default color = white
      arr.push(1, 1, 1);
    }
    return new Float32Array(arr);
  }, [dots]);

  // 4) We'll store a reference to the color BufferAttribute
  const colorAttrRef = useRef<THREE.BufferAttribute>(null);

  // 5) On pointer down, find *all intersections*
  const handlePointerDown = useCallback(
    (event: any) => {
      if (!dots.length) return;

      // If we want the "closest" intersection:
      const intersection = event.intersections[0];
      if (!intersection) return;

      // Get the dot index
      const idx = intersection.index;
      if (idx == null || !dots[idx]) return;

      const dot = dots[idx];
      console.log(
        `Clicked dot #${idx}. Country = ${dot.countryName}, ISO = ${dot.isoA3}`
      );

      // We'll highlight ALL dots with this isoA3
      const iso = dot.isoA3;

      // Cancel any old highlight fade
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      // Set highlightIso in state
      setHighlightIso(iso);
      highlightRef.current = iso;

      // After 2 seconds, fade out
      highlightTimerRef.current = setTimeout(() => {
        setHighlightIso(null);
        highlightRef.current = null;
      }, 2000);

      event.stopPropagation();
    },
    [dots]
  );

  // 6) UseFrame (or useEffect) to update the color buffer each frame based on highlightIso
  useFrame(() => {
    if (!colorAttrRef.current) return;
    const colorArray = colorAttrRef.current.array as Float32Array;

    if (!dots.length) return;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3; // r,g,b
      if (highlightRef.current && dot.isoA3 === highlightRef.current) {
        // Highlight color = bright yellow
        colorArray[offset + 0] = 1; // R
        colorArray[offset + 1] = 1; // G
        colorArray[offset + 2] = 0; // B
      } else {
        // default white
        colorArray[offset + 0] = 1;
        colorArray[offset + 1] = 1;
        colorArray[offset + 2] = 1;
      }
    }
    // Mark attribute as needing update so Three.js re-renders
    colorAttrRef.current.needsUpdate = true;
  });

  if (!dots.length) return null;

  return (
    <points onPointerDown={handlePointerDown}>
      <bufferGeometry>
        {/* Position attribute */}
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
        {/* Color attribute */}
        <bufferAttribute
          ref={colorAttrRef}
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        // Enable vertexColors so each vertex can have its own color
        vertexColors
        size={pointSize}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}
