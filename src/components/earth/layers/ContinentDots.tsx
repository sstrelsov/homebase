import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DotInfo } from "../../../types/earthTypes";

// Optional: A quick, minimal debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

export interface ContinentDotsProps {
  jsonUrl: string;
  pointSize: number;
  onCountrySelect?: (iso: string) => void;
  dotColor: string;
  highlightColor?: string;
  onLoaded?: (loaded: boolean) => void;
}

/**
 * A point cloud representing countries on the globe.
 * Fetches dot coordinates (x,y,z) from a JSON file, then displays them as points.
 * Allows clicking a point to highlight it briefly and optionally call onCountrySelect.
 *
 * @param {ContinentDotsProps} props
 *   @prop {string} jsonUrl - URL of the JSON data containing dot positions & country info.
 *   @prop {number} pointSize - Visual size of each point.
 *   @prop {(iso: string) => void} [onCountrySelect] - Callback invoked on country dot click.
 *   @prop {string} dotColor - Base color (hex) for the dots.
 *   @prop {string} [highlightColor] - Color (hex) to highlight the clicked dot with.
 *   @prop {(loaded: boolean) => void} onLoaded - Informs the parent when data is finished loading.
 *
 * Internally uses a BufferGeometry with position and color attributes.
 * On click, changes color to highlightColor for 2 seconds, then reverts.
 */
const ContinentDots = ({
  jsonUrl,
  pointSize,
  onCountrySelect,
  onLoaded,
  dotColor,
  highlightColor = "#FFFF00", // fallback if not provided
}: ContinentDotsProps) => {
  const [dots, setDots] = useState<DotInfo[]>([]);
  const highlightRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerDownDotIndexRef = useRef<number | null>(null);

  // Pre-convert the base color into an RGB triple
  const [baseR, baseG, baseB] = useMemo(() => {
    const c = new THREE.Color(dotColor);
    return [c.r, c.g, c.b]; // each is 0-1 float
  }, [dotColor]);

  // Pre-convert the highlight color into an RGB triple
  const [highlightR, highlightG, highlightB] = useMemo(() => {
    const c = new THREE.Color(highlightColor);
    return [c.r, c.g, c.b]; // each is 0-1 float
  }, [highlightColor]);

  useEffect(() => {
    const fetchDots = async () => {
      try {
        const res = await fetch(jsonUrl);
        const data = await res.json();
        console.log("Loaded landDots.json:", data);
        setDots(data);
        !!onLoaded && onLoaded(true);
      } catch (err) {
        console.error("Failed to load landDots.json:", err);
      }
    };
    fetchDots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonUrl]);

  // Positions
  const positions = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (const { x, y, z } of dots) {
      arr.push(x, y, z);
    }
    return new Float32Array(arr);
  }, [dots]);

  // Colors
  const colors = useMemo(() => {
    if (!dots.length) return new Float32Array([]);
    const arr: number[] = [];
    for (let i = 0; i < dots.length; i++) {
      // Use the user-specified base color for each dot
      arr.push(baseR, baseG, baseB);
    }
    return new Float32Array(arr);
  }, [dots, baseR, baseG, baseB]);

  const colorAttrRef = useRef<THREE.BufferAttribute>(null);

  // pointerDown → store initial position, reset isDragging, also store which dot (if any)
  const handlePointerDown = useCallback((e: any) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;

    // Clear old pointerDownDotIndex
    pointerDownDotIndexRef.current = null;

    // Check if pointerDown was actually on a dot
    if (e.intersections?.length) {
      // Sort by distance and grab the nearest intersection
      const firstHit = e.intersections.sort(
        (a: any, b: any) => a.distance - b.distance
      )[0];
      pointerDownDotIndexRef.current = firstHit.index ?? null;
    }

    e.stopPropagation();
  }, []);

  // pointerMove → check if we moved far enough to count as a drag
  const handlePointerMove = useCallback((e: any) => {
    if (!pointerDownRef.current) return;

    const dx = e.clientX - pointerDownRef.current.x;
    const dy = e.clientY - pointerDownRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If you want to be more/less sensitive, adjust this threshold
    if (distance > 20) {
      isDraggingRef.current = true;
    }
    e.stopPropagation();
  }, []);

  // pointerUp → only do the country highlight if NOT dragging
  const handlePointerUp = useCallback(
    (event: any) => {
      // It's a click/tap, so do the intersection picking
      if (!dots.length) {
        console.warn("No dots loaded yet.");
        return;
      }

      if (event.intersections.length === 0) {
        return;
      }

      const intersection = event.intersections.sort(
        (a: any, b: any) => a.distance - b.distance
      )[0];

      const upDotIndex = intersection.index;
      // Compare it to the pointerDown dot index
      if (
        upDotIndex == null ||
        pointerDownDotIndexRef.current === null ||
        upDotIndex !== pointerDownDotIndexRef.current
      ) {
        // Not the same dot -> skip
        pointerDownRef.current = null;
        pointerDownDotIndexRef.current = null;
        return;
      }

      const idx = intersection.index;
      if (idx == null || !dots[idx]) {
        console.warn("No valid index found for intersection.");
        return;
      }

      const dot = dots[idx];
      console.log(
        `Clicked dot #${idx}. Country = ${dot.countryName}, ISO = ${dot.isoA3}`
      );

      if (onCountrySelect) onCountrySelect(dot.isoA3);

      // Cancel any old highlight fade
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      // Set highlightRef
      highlightRef.current = dot.isoA3;

      // After 2s, revert
      highlightTimerRef.current = setTimeout(() => {
        highlightRef.current = null;
      }, 2000);

      // Reset
      pointerDownRef.current = null;
      pointerDownDotIndexRef.current = null;
      isDraggingRef.current = false;

      event.stopPropagation();
    },
    [dots, onCountrySelect]
  );

  // Animate the dot colors each frame
  useFrame(() => {
    if (!colorAttrRef.current || !dots.length) {
      return;
    }
    const colorArray = colorAttrRef.current.array as Float32Array;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3;

      if (highlightRef.current === dot.isoA3) {
        // highlight color
        colorArray[offset + 0] = highlightR;
        colorArray[offset + 1] = highlightG;
        colorArray[offset + 2] = highlightB;
      } else {
        // revert to base color
        colorArray[offset + 0] = baseR;
        colorArray[offset + 1] = baseG;
        colorArray[offset + 2] = baseB;
      }
    }
    colorAttrRef.current.needsUpdate = true;
  });

  if (!dots.length) return null;

  return (
    <points
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3} // Always 3 for XYZ
        />
        <bufferAttribute
          ref={colorAttrRef}
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={3} // Always 3 for RGB
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={pointSize} // Visual size of each point
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
};

export default ContinentDots;
