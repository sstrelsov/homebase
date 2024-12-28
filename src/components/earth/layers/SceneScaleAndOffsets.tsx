// SceneScaleAndOffsets.tsx
import { a, useSpring } from "@react-spring/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

interface SceneScaleAndOffsetsProps {
  children: React.ReactNode;
}

/**
 * This component smoothly animates:
 * (1) The camera's view offset
 * (2) The global scale of its children
 */
const SceneScaleAndOffsets = ({ children }: SceneScaleAndOffsetsProps) => {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // 1) Still do your camera offset via react-spring
  const isXLUp = useAtOrAboveBreakpoint("xl");
  const isSmUp = useAtOrAboveBreakpoint("sm");

  const [{ offsetX, offsetY }, offsetApi] = useSpring(() => ({
    offsetX: 0,
    offsetY: 0,
    config: { tension: 170, friction: 26 },
  }));

  useEffect(() => {
    const newOffsetX = isXLUp ? size.width * 0.2 : 0;
    const newOffsetY = isSmUp ? 0 : size.height * 0.07;

    offsetApi.start({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }, [size, isXLUp, isSmUp, offsetApi]);

  useFrame(() => {
    camera.setViewOffset(
      size.width,
      size.height,
      offsetX.get(),
      offsetY.get(),
      size.width,
      size.height
    );
    camera.updateProjectionMatrix();
  });

  // 2) NEW: Animate a “currentScale” to smoothly transition based on breakpoints
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isXsUp = useAtOrAboveBreakpoint("xs");

  // Decide target scale from breakpoints
  let targetScale = 1.0;
  if (isMdUp) {
    targetScale = 1.0;
  } else if (isSmUp) {
    targetScale = 0.8;
  } else if (isXsUp) {
    targetScale = 0.7;
  } else {
    targetScale = 0.6;
  }

  // We can use either react-spring or a simple ref for the scale
  // Below is a simple approach with “useSpring”
  const [{ scale }, scaleApi] = useSpring(() => ({
    scale: 0.55, // initial scale
    config: { mass: 1, tension: 120, friction: 30 },
  }));

  // Whenever breakpoints change, we animate to a new scale
  useEffect(() => {
    scaleApi.start({ scale: targetScale });
  }, [targetScale, scaleApi]);

  return (
    <a.group ref={groupRef} scale={scale}>
      {children}
    </a.group>
  );
};

export default SceneScaleAndOffsets;
