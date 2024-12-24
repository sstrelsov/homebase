import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLongToVector3 } from "../../utils/latLongToVector3";
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
    const arcHeight = distance * 1.5;
    midPoint.setLength(midPoint.length() + arcHeight);

    const control1 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.25);
    const control2 = new THREE.Vector3().lerpVectors(startVec, midPoint, 0.75);

    return new THREE.CubicBezierCurve3(startVec, control1, control2, endVec);
  }, [startVec, endVec]);

  // Create a (full) TubeGeometry once
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(fullCurve, 64, 0.5, 8, false);
  }, [fullCurve]);

  // Store that geometry in geometryRef so we can .setDrawRange() on it
  useMemo(() => {
    geometryRef.current = tubeGeometry;
  }, [tubeGeometry]);

  useFrame(() => {
    if (done) return;

    const elapsed = performance.now() - startTime;
    let t = elapsed / animationDuration;
    if (t > 1) t = 1;

    if (onProgressPersist) {
      // Single-phase (persist mode), 0->1, using setDrawRange
      const indexCount = geometryRef.current.index
        ? geometryRef.current.index.count
        : geometryRef.current.attributes.position.count;
      const drawCount = Math.floor(indexCount * t);
      geometryRef.current.setDrawRange(0, drawCount);

      // Optional: show the effect at t=1 in persist mode
      if (t >= 1) {
        geometryRef.current.setDrawRange(0, indexCount);
        // If you want the landing effect as soon as we fully reach the end:
        if (!showLandingEffect) {
          setShowLandingEffect(true);
        }
        setDone(true);
        onDone?.();
      }
    } else {
      // Two-phase: 0..0.5 => extend, 0.5..1 => retract
      if (!meshRef.current) return;

      let extendP = 0;
      let retractP = 0;

      if (t <= 0.5) {
        // extending
        extendP = t / 0.5; // 0..1
        retractP = 0;
      } else {
        // retracting
        extendP = 1;
        retractP = (t - 0.5) / 0.5; // 0..1

        // As soon as the arc hits the end (t >= 0.5) show landing effect
        if (!showLandingEffect) {
          setShowLandingEffect(true);
        }
      }

      const startParam = retractP; // grows 0..1 in second half
      const endParam = extendP; // 0..1 in first half, pinned at 1 in second half

      if (endParam <= startParam) {
        meshRef.current.visible = false;
      } else {
        meshRef.current.visible = true;
        const partialCurve = new PartialCurve(fullCurve, startParam, endParam);
        const newGeom = new THREE.TubeGeometry(partialCurve, 64, 0.5, 8, false);

        // Dispose old geometry to avoid leaks
        if (meshRef.current.geometry) {
          (meshRef.current.geometry as THREE.BufferGeometry).dispose();
        }
        meshRef.current.geometry = newGeom;
      }

      if (t >= 1) {
        // fully done
        meshRef.current.visible = false;
        setDone(true);
        onDone?.();
      }
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        {/* For persist arcs, we pass in the stable geometryRef */}
        {onProgressPersist ? (
          <primitive object={tubeGeometry} attach="geometry" />
        ) : null}
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {/* Show landing effect when showLandingEffect = true */}
      {showLandingEffect && (
        <LandingEffect
          position={endVec}
          color="#ffcd53"
          onDone={() => setShowLandingEffect(false)}
        />
      )}
    </>
  );
};

export default Arc;
