// DotFocusController.tsx
import React, { useEffect } from "react";
import * as THREE from "three";
import { selectFocusIso } from "../../../store/globeSlice";
import { useAppSelector } from "../../../store/hooks";
import { DotInfo } from "../../../types/earthTypes";
import { flyCameraToPoint, getCountryCentroid } from "../../../utils/earthMath";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

interface DotFocusControllerProps {
  cameraRef: React.RefObject<THREE.Camera | null>;
  controlsRef: React.RefObject<any>;
  globeRef: React.RefObject<THREE.Group | null>;
  dots: DotInfo[]; // The array of loaded dot data
  children: React.ReactNode;
}

/**
 * Watches the Redux focusIso and flies the camera to that ISO’s centroid.
 * Wraps child components to keep the camera logic separate.
 */
const CameraFocusController = ({
  cameraRef,
  controlsRef,
  globeRef,
  dots,
  children,
}: DotFocusControllerProps) => {
  const focusIso = useAppSelector(selectFocusIso);
  const isSmUp = useAtOrAboveBreakpoint("sm");

  useEffect(() => {
    // If missing any references or no focus iso, do nothing
    if (
      !focusIso ||
      !cameraRef.current ||
      !controlsRef.current ||
      !globeRef.current ||
      dots.length === 0
    ) {
      return;
    }

    // 1) Find the centroid for the country
    const centroidVec = getCountryCentroid({ isoA3: focusIso, dots });
    if (!centroidVec) return;

    // 2) Convert local (globe) space to world space
    const worldPos = centroidVec.clone();
    globeRef.current.localToWorld(worldPos);

    // 3) Fly camera
    flyCameraToPoint({
      camera: cameraRef.current,
      controls: controlsRef.current,
      targetPos: worldPos,
      distanceOffset: isSmUp ? 380 : 480,
    });
  }, [focusIso, cameraRef, controlsRef, globeRef, dots, isSmUp]);

  return <>{children}</>;
};

export default CameraFocusController;
