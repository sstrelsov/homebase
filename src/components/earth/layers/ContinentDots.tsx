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
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { selectFocusIso } from "../../../store/globeSlice";
import { useAppSelector } from "../../../store/hooks";
import { DotInfo } from "../../../types/earthTypes";
import {
  flyCameraToPoint,
  getCountryCentroid,
  xyzToLatLon,
} from "../utils/focusIso";

export interface ContinentDotsProps {
  jsonUrl: string;
  pointSize: number;
  onCountrySelect?: (iso: string) => void;
  dotColor: string;
  highlightColor?: string;
  onLoaded?: (loaded: boolean) => void;
  globeRef?: RefObject<THREE.Group<THREE.Object3DEventMap> | null>;
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  cameraRef?: RefObject<THREE.Camera | null>;
}

/**
 * A point cloud representing countries on the globe.
 * - Fetches dot coordinates (x,y,z).
 * - Handles highlighting & rotation when focusIso changes.
 */
const ContinentDots = ({
  jsonUrl,
  pointSize,
  onCountrySelect,
  onLoaded,
  dotColor,
  highlightColor = "#FFFF00",
  globeRef,
  controlsRef,
  cameraRef,
}: ContinentDotsProps) => {
  const focusIso = useAppSelector(selectFocusIso);
  const [dots, setDots] = useState<DotInfo[]>([]);

  // For highlighting a country in yellow
  const highlightRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // For click/drag detection
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

  // ============ Fetch the dots =============
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

  const handleFlyTo = (isoCode: string) => {
    if (!controlsRef?.current || !cameraRef?.current) return;

    // 1) Get the 3D centroid of that ISO
    const centroidVec = getCountryCentroid(isoCode, dots);
    if (!centroidVec) return;

    if (!!globeRef?.current) {
      const worldPos = centroidVec.clone();
      globeRef.current.localToWorld(worldPos);
      flyCameraToPoint(cameraRef.current, controlsRef.current, worldPos, 300);
    }
  };

  // ============ If focusIso changes, rotate & highlight =============
  useEffect(() => {
    if (!focusIso || dots.length === 0) {
      highlightRef.current = null;
      return;
    }
    // E.g. if you have a point at x=0, y=0, z=1 => That’s equator +90°E
    const test = xyzToLatLon(0, 0, 1);
    console.log("lat:", THREE.MathUtils.radToDeg(test.lat)); // ~0
    console.log("lon:", THREE.MathUtils.radToDeg(test.lon)); // ~+90
    // highlight logic...
    highlightRef.current = focusIso;
    // ...
    console.log("SWISS: ", getCountryCentroid("CHE", dots));

    // 2) Also rotate the globe to that country’s centroid
    if (!!globeRef && globeRef.current !== null) {
      handleFlyTo(focusIso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIso, dots, globeRef]);

  // ============ Build geometry arrays (positions, colors) ============
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

  // ============ Pointer events for selecting a dot ============
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

  const handlePointerUp = useCallback(
    (event: any) => {
      if (!dots.length) return;
      if (event.intersections.length === 0) return;

      const intersection = event.intersections.sort(
        (a: any, b: any) => a.distance - b.distance
      )[0];
      const upDotIndex = intersection.index;

      // Make sure we clicked the same dot we pressed on
      if (
        upDotIndex == null ||
        pointerDownDotIndexRef.current == null ||
        upDotIndex !== pointerDownDotIndexRef.current
      ) {
        pointerDownRef.current = null;
        pointerDownDotIndexRef.current = null;
        return;
      }

      const idx = intersection.index;
      const dot = dots[idx];
      if (!dot) return;
      const centroid = getCountryCentroid(dot.isoA3, dots);
      console.log(
        `Clicked dot #${idx}.\nCountry=${dot.countryName}\nISO=${
          dot.isoA3
        }\nCentroid:${JSON.stringify(centroid, null, 2)}`
      );

      // 1) Fire onCountrySelect if needed
      onCountrySelect?.(dot.isoA3);
      handleFlyTo(dot.isoA3);
      // 2) Temporarily highlight this country
      highlightRef.current = dot.isoA3;
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => {
        highlightRef.current = null;
      }, 2000);

      // Reset
      pointerDownRef.current = null;
      pointerDownDotIndexRef.current = null;
      isDraggingRef.current = false;
      event.stopPropagation();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dots, onCountrySelect]
  );

  // ============ Animate the dot colors each frame ============
  useFrame(() => {
    if (!colorAttrRef.current || !dots.length) return;
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

export default ContinentDots;
