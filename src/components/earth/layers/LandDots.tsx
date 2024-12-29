// LandDots.tsx
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DotInfo } from "../../../types/earthTypes";

export interface LandDotsProps {
  dots: DotInfo[]; // <--- We receive the data from outside
  spotlightCountries?: string[]; // <--- Array of countries to highlight
  pointSize: number;
  dotColor: string;
  highlightColor: string;
}

/**
 * Renders a point cloud for countries on the globe.
 * No camera or "fly to" logic in here. Just geometry + color highlight.
 */
const LandDots = ({
  dots,
  spotlightCountries,
  pointSize,
  dotColor,
  highlightColor,
}: LandDotsProps) => {
  // Pre-calc base & highlight colors
  const [baseR, baseG, baseB] = useMemo(() => {
    const color = new THREE.Color(dotColor);
    return [color.r, color.g, color.b];
  }, [dotColor]);

  const [highlightR, highlightG, highlightB] = useMemo(() => {
    const color = new THREE.Color(highlightColor);
    return [color.r, color.g, color.b];
  }, [highlightColor]);

  // Build position array
  const positions = useMemo(() => {
    const arr = dots.flatMap((d) => [d.x, d.y, d.z]);
    return new Float32Array(arr);
  }, [dots]);

  // Build color array
  const colors = useMemo(() => {
    return new Float32Array(dots.flatMap(() => [baseR, baseG, baseB]));
  }, [dots, baseR, baseG, baseB]);

  // We'll store a ref to the color attribute so we can update it each frame
  const colorAttrRef = useRef<THREE.BufferAttribute>(null);

  // Animate the Dot Colors
  useFrame(() => {
    if (!colorAttrRef.current || dots.length === 0) return;
    const colorArray = colorAttrRef.current.array as Float32Array;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3;

      // If dot's isoA3 is in spotlightCountries, use highlight color, else base color
      if (spotlightCountries && spotlightCountries.includes(dot.isoA3)) {
        colorArray[offset] = highlightR;
        colorArray[offset + 1] = highlightG;
        colorArray[offset + 2] = highlightB;
      } else {
        colorArray[offset] = baseR;
        colorArray[offset + 1] = baseG;
        colorArray[offset + 2] = baseB;
      }
    }
    colorAttrRef.current.needsUpdate = true;
  });

  if (dots.length === 0) return null;

  return (
    <points>
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
};

export default LandDots;
