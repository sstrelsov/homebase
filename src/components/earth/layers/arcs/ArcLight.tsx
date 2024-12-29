import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLongToVector3 } from "../../../../utils/arcs";
import LandingEffect from "./LandingEffect";

interface ArcProps {
  color: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  radius: number;
  animationDuration?: number;
  onDone?: () => void;
  onProgressPersist?: boolean;
}

/** "Two-phase" partial curve for retractable arcs. */
class PartialCurve extends THREE.Curve<THREE.Vector3> {
  baseCurve: THREE.Curve<THREE.Vector3>;
  minT: number;
  maxT: number;

  constructor(
    baseCurve: THREE.Curve<THREE.Vector3>,
    minT: number,
    maxT: number
  ) {
    super();
    this.baseCurve = baseCurve;
    this.minT = minT;
    this.maxT = maxT;
  }

  getPoint(t: number, optionalTarget?: THREE.Vector3) {
    const u = this.minT + (this.maxT - this.minT) * t;
    return this.baseCurve.getPoint(u, optionalTarget);
  }
}

const Arc = ({
  color,
  startLat,
  startLon,
  endLat,
  endLon,
  radius,
  animationDuration = 2500,
  onDone,
  onProgressPersist = false,
}: ArcProps) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geometryRef = useRef<THREE.TubeGeometry>(null!);
  const [done, setDone] = useState(false);
  const [startTime] = useState(() => performance.now());
  const [showLandingEffect, setShowLandingEffect] = useState(false);

  // Convert lat/lon → 3D vectors on the sphere
  const startVec = useMemo(
    () => latLongToVector3(startLat, startLon, radius),
    [startLat, startLon, radius]
  );
  const endVec = useMemo(
    () => latLongToVector3(endLat, endLon, radius),
    [endLat, endLon, radius]
  );

  // Full arc
  const fullCurve = useMemo(() => {
    const midPoint = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5);
    const distance = startVec.distanceTo(endVec);
    // Adjust how high the arc bulges upwards;
    // here we just do arcHeight ~ distance
    const arcHeight = distance;
    midPoint.setLength(midPoint.length() + arcHeight);

    const control1 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.25);
    const control2 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.75);

    return new THREE.CubicBezierCurve3(startVec, control1, control2, endVec);
  }, [startVec, endVec]);

  // Create a (full) TubeGeometry once
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(fullCurve, 64, 0.5, 8, false);
  }, [fullCurve]);

  useMemo(() => {
    geometryRef.current = tubeGeometry;
  }, [tubeGeometry]);

  useFrame(() => {
    if (done) return;

    const elapsed = performance.now() - startTime;
    let t = elapsed / animationDuration;
    if (t > 1) t = 1;

    if (onProgressPersist) {
      // Single-phase: 0->1 growth
      const indexCount = geometryRef.current.index
        ? geometryRef.current.index.count
        : geometryRef.current.attributes.position.count;
      const drawCount = Math.floor(indexCount * t);
      geometryRef.current.setDrawRange(0, drawCount);

      if (t >= 1) {
        geometryRef.current.setDrawRange(0, indexCount);
        if (!showLandingEffect) setShowLandingEffect(true);
        setDone(true);
        onDone?.();
      }
    } else {
      // Two-phase: extend in [0..0.5], retract in [0.5..1]
      if (!meshRef.current) return;

      let extendP = 0;
      let retractP = 0;

      if (t <= 0.5) {
        extendP = t / 0.5; // 0..1
        retractP = 0;
      } else {
        extendP = 1;
        retractP = (t - 0.5) / 0.5; // 0..1
        if (!showLandingEffect) setShowLandingEffect(true);
      }

      const startParam = retractP;
      const endParam = extendP;

      if (endParam <= startParam) {
        meshRef.current.visible = false;
      } else {
        meshRef.current.visible = true;
        const partialCurve = new PartialCurve(fullCurve, startParam, endParam);
        const newGeom = new THREE.TubeGeometry(partialCurve, 64, 0.5, 8, false);

        if (meshRef.current.geometry) {
          (meshRef.current.geometry as THREE.BufferGeometry).dispose();
        }
        meshRef.current.geometry = newGeom;
      }

      if (t >= 1) {
        meshRef.current.visible = false;
        setDone(true);
        onDone?.();
      }
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        {/* For persist arcs, we reuse the stable geometry */}
        {onProgressPersist && (
          <primitive object={tubeGeometry} attach="geometry" />
        )}
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {showLandingEffect && (
        <LandingEffect
          position={endVec}
          color="#dd6ff0"
          onDone={() => setShowLandingEffect(false)}
        />
      )}
    </>
  );
};

export default Arc;
