import gsap from "gsap";
import React, { useEffect } from "react";
import * as THREE from "three";
import { DotInfo } from "../../../types/earthTypes";
import { getCountryCentroid } from "../../../utils/earthMath";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

interface CameraFocusControllerProps {
  cameraRef: React.RefObject<THREE.Camera | null>;
  controlsRef: React.RefObject<any>;
  globeRef: React.RefObject<THREE.Group | null>;
  dots: DotInfo[];
  children: React.ReactNode;
  focusIso?: string;
}

const CameraFocusController = ({
  cameraRef,
  controlsRef,
  globeRef,
  dots,
  children,
  focusIso,
}: CameraFocusControllerProps) => {
  const isSmUp = useAtOrAboveBreakpoint("sm");

  useEffect(() => {
    if (!focusIso || !globeRef.current || dots.length === 0) {
      return;
    }

    // 1) Find the centroid for the country
    const centroidVec = getCountryCentroid({ isoA3: focusIso, dots });
    if (!centroidVec) return;

    // Normalize the centroid so it's a unit vector from globe center.
    const point = centroidVec.clone().normalize();

    // 2) Decide which direction on the globe is "front."
    //    Example: +Z axis. If your camera is roughly [0, 400, 900] or [0, 0, +someBigNumber],
    //    using (0,0,1) is a good choice. You can tilt slightly if you like:
    const targetPos = new THREE.Vector3(0, 400, 900).normalize();

    // Create quaternion to rotate "point" so that it aligns with "targetPos"
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      point,
      targetPos
    );

    // Convert quaternion to Euler angles
    const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

    // 3) Animate the rotation
    gsap.to(globeRef.current.rotation, {
      x: euler.x,
      y: euler.y,
      z: euler.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      },
    });
  }, [focusIso, globeRef, dots, isSmUp]);

  return <>{children}</>;
};

export default CameraFocusController;
