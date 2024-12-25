import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DotInfo } from "../../../types/earthTypes";

export interface ContinentDotsProps {
  jsonUrl: string;
  pointSize: number;
  onCountrySelect?: (iso: string) => void;
  dotColor: string;
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
 *   @prop {(loaded: boolean) => void} onLoaded - Informs the parent when data is finished loading.
 *
 * Internally uses a BufferGeometry with position and color attributes.
 * On click, changes color to bright yellow for 2 seconds (highlight).
 */
const ContinentDots = ({
  jsonUrl,
  pointSize,
  onCountrySelect,
  onLoaded,
  dotColor,
}: ContinentDotsProps) => {
  const [dots, setDots] = useState<DotInfo[]>([]);
  const highlightRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-convert the hex into an RGB triple
  const [baseR, baseG, baseB] = useMemo(() => {
    const c = new THREE.Color(dotColor);
    return [c.r, c.g, c.b]; // each is 0-1 float
  }, [dotColor]);

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

  // Handle pointer down
  const handlePointerDown = useCallback(
    (event: any) => {
      if (!dots.length) {
        console.warn("No dots loaded yet.");
        return;
      }

      const intersection = event.intersections[0];
      if (!intersection) {
        console.warn("No intersection found.");
        return;
      }

      const idx = intersection.index;
      if (idx == null || !dots[idx]) {
        console.warn("No valid index found.");
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

      event.stopPropagation();
    },
    [dots, onCountrySelect]
  );

  // Animate the dot colors each frame
  useFrame(() => {
    if (!colorAttrRef.current || !dots.length) {
      console.warn("No colorAttrRef or dots yet.");
      return;
    }
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
    <points onPointerDown={handlePointerDown}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={pointSize}
        />
        <bufferAttribute
          ref={colorAttrRef}
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={pointSize}
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
};

export default ContinentDots;
