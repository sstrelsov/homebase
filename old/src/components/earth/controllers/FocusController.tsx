// FocusController.tsx
import gsap from "gsap";
import React, { useEffect } from "react";
import * as THREE from "three";
import { DotInfo } from "../../../types/earthTypes";
import { getCountryCentroid } from "../../../utils/earthMath";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";
import { RotateControllerHandle } from "./RotateController";

interface FocusControllerProps {
  cameraRef: React.RefObject<THREE.Camera | null>;
  controlsRef: React.RefObject<any>;
  rotateControllerRef: React.RefObject<RotateControllerHandle | null>;
  dots: DotInfo[];
  children: React.ReactNode;
  focusIso?: string;
}

const FocusController = ({
  cameraRef,
  controlsRef,
  rotateControllerRef,
  dots,
  children,
  focusIso,
}: FocusControllerProps) => {
  const isSmUp = useAtOrAboveBreakpoint("sm");

  // Example camera positions
  const DEFAULT_CAM_POS = new THREE.Vector3(0, 400, 900);
  const FOCUS_CAM_POS = new THREE.Vector3(0, 150, 400);
  const ORIG_EULER = new THREE.Euler(0, 0, 0, "XYZ");
  useEffect(() => {
    // 1) If no focus iso: just zoom out camera, do NOT rotate globe
    if (!focusIso || dots.length === 0) {
      rotateControllerRef.current?.animateToRotation(
        ORIG_EULER.x,
        ORIG_EULER.y,
        ORIG_EULER.z
      );

      if (cameraRef.current) {
        gsap.to(cameraRef.current.position, {
          x: DEFAULT_CAM_POS.x,
          y: DEFAULT_CAM_POS.y,
          z: DEFAULT_CAM_POS.z,
          duration: 1.2,
          ease: "power2.inOut",
          onUpdate: () => controlsRef.current?.update(),
        });
      }
      return;
    }

    // 2) We have an iso -> get centroid
    const centroidVec = getCountryCentroid({ isoA3: focusIso, dots });
    if (!centroidVec) return;

    // Normalize to get direction from the globe center
    const point = centroidVec.clone().normalize();
    // We want that to map to e.g. +Z with a slight tilt
    const targetPos = new THREE.Vector3(0, 0.5, 1).normalize();

    // Build a quaternion from "point" to "targetPos"
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      point,
      targetPos
    );
    // Convert that to Euler
    const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

    // 3) Animate the globe rotation via RotateController
    rotateControllerRef.current?.animateToRotation(euler.x, euler.y, euler.z);

    // 4) Zoom the camera in
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        x: FOCUS_CAM_POS.x,
        y: FOCUS_CAM_POS.y,
        z: FOCUS_CAM_POS.z,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => controlsRef.current?.update(),
      });
    }
  }, [focusIso, dots, rotateControllerRef, cameraRef, controlsRef, isSmUp]);

  return <>{children}</>;
};

export default FocusController;
