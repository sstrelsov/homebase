import { useFrame } from "@react-three/fiber";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { selectFocusIso } from "../../../store/globeSlice";
import { useAppSelector } from "../../../store/hooks";
import { DotInfo } from "../../../types/earthTypes";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import { flyCameraToPoint, getCountryCentroid } from "../utils/earthMath";

export interface LandDotsProps {
  jsonUrl: string;
  pointSize: number;
  onCountrySelect?: (iso: string) => void;
  dotColor: string;
  highlightColor: string;
  onLoaded?: (loaded: boolean) => void;
  globeRef?: RefObject<THREE.Group | null>;
  controlsRef?: RefObject<any>;
  cameraRef?: RefObject<THREE.Camera | null>;
}

/**
 * A point cloud representing countries on the globe.
 * - Fetches dot coordinates (x,y,z).
 * - Handles highlighting & rotation when focusIso changes.
 */
const LandDots = ({
  jsonUrl,
  pointSize,
  onCountrySelect,
  onLoaded,
  dotColor,
  highlightColor,
  globeRef,
  controlsRef,
  cameraRef,
}: LandDotsProps) => {
  const focusIso = useAppSelector(selectFocusIso);
  const [dots, setDots] = useState<DotInfo[]>([]);

  // -------------------- Highlighting Logic --------------------
  const highlightRef = useRef<string | null>(null);

  const isSmUp = useAtOrAboveBreakpoint("sm");

  // -------------------- Pre-Converted Colors (Base & Highlight) --------------------
  const [baseR, baseG, baseB] = useMemo(() => {
    const color = new THREE.Color(dotColor);
    return [color.r, color.g, color.b];
  }, [dotColor]);

  const [highlightR, highlightG, highlightB] = useMemo(() => {
    const color = new THREE.Color(highlightColor);
    return [color.r, color.g, color.b];
  }, [highlightColor]);

  // -------------------- Fetch Country Dots on Mount --------------------
  useEffect(() => {
    const fetchDots = async () => {
      try {
        const response = await fetch(jsonUrl);
        const data: DotInfo[] = await response.json();
        console.log("Loaded landDots.json:", data);
        setDots(data);
        onLoaded?.(true);
      } catch (err) {
        console.error("Failed to load landDots.json:", err);
      }
    };

    fetchDots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonUrl]);

  // -------------------- Fly to Country / Focus Handling --------------------
  const handleFlyToIso = useCallback(
    (isoCode: string) => {
      if (!controlsRef?.current || !cameraRef?.current || !globeRef?.current) {
        return;
      }

      // 1) Get the 3D centroid of that ISO
      const centroidVec = getCountryCentroid({ isoA3: isoCode, dots });
      if (!centroidVec) return;

      // 2) Convert centroid from local space (globeRef) to world space
      const worldPos = centroidVec.clone();
      globeRef.current.localToWorld(worldPos);

      // 3) Fly camera to the new position
      flyCameraToPoint({
        camera: cameraRef.current,
        controls: controlsRef.current,
        targetPos: worldPos,
        distanceOffset: isSmUp ? 380 : 480,
      });
    },
    [cameraRef, controlsRef, globeRef, dots]
  );

  // Whenever focusIso changes, highlight + fly
  useEffect(() => {
    if (!focusIso || dots.length === 0) {
      highlightRef.current = null;
      return;
    }
    highlightRef.current = focusIso;

    if (globeRef?.current) {
      handleFlyToIso(focusIso);
    }
  }, [focusIso, dots, globeRef, handleFlyToIso]);

  // -------------------- Geometry: Positions & Colors --------------------
  const positions = useMemo(() => {
    if (!dots.length) return new Float32Array(0);
    const arr = dots.flatMap((d) => [d.x, d.y, d.z]);
    return new Float32Array(arr);
  }, [dots]);

  const colors = useMemo(() => {
    if (!dots.length) return new Float32Array(0);
    // For each dot, push the base color
    const arr: number[] = [];
    for (let i = 0; i < dots.length; i++) {
      arr.push(baseR, baseG, baseB);
    }
    return new Float32Array(arr);
  }, [dots, baseR, baseG, baseB]);

  // We'll store an explicit ref to the color attribute so we can update it each frame
  const colorAttrRef = useRef<THREE.BufferAttribute>(null);

  // -------------------- Animate the Dot Colors --------------------
  useFrame(() => {
    if (!colorAttrRef.current || !dots.length) return;
    const colorArray = colorAttrRef.current.array as Float32Array;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3;

      // If dot isoA3 matches the highlightRef, use highlight color
      if (highlightRef.current === dot.isoA3) {
        colorArray[offset] = highlightR;
        colorArray[offset + 1] = highlightG;
        colorArray[offset + 2] = highlightB;
      } else {
        // revert to base color
        colorArray[offset] = baseR;
        colorArray[offset + 1] = baseG;
        colorArray[offset + 2] = baseB;
      }
    }
    colorAttrRef.current.needsUpdate = true;
  });

  // -------------------- Early return if no dots loaded --------------------
  if (!dots.length) return null;

  // -------------------- Render the Point Cloud --------------------
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
