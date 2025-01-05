// SceneScaleAndOffsets.tsx
import { a, useSpring } from "@react-spring/three";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

const INITIAL_EARTH_SCALE = 0.55; // To allow time for the globe to load
const FULL_EARTH_SCALE = 1;
const FOUR_FIFTHS_EARTH_SCALE = 0.8;
const SEVEN_TENTHS_EARTH_SCALE = 0.7;
const THREE_FIFTHS_EARTH_SCALE = 0.6;

interface SceneScaleAndOffsetsProps {
  children: React.ReactNode;
}

/**
 * This component smoothly animates:
 * (1) The camera's view offset
 * (2) The global scale of its children
 */
const ScaleOffsetController = ({ children }: SceneScaleAndOffsetsProps) => {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const isXsUp = useAtOrAboveBreakpoint("xs");
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isLgUp = useAtOrAboveBreakpoint("lg");
  const isXLUp = useAtOrAboveBreakpoint("xl");

  // Camera offset based on breakpoints
  const [{ offsetX, offsetY }, offsetApi] = useSpring(() => ({
    offsetX: 0,
    offsetY: 0,
    config: { tension: 170, friction: 26 },
  }));

  useEffect(() => {
    const newOffsetX = isLgUp ? size.width * 0.2 : 0;
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

  // Decide target scale from breakpoints
  let targetScale = FULL_EARTH_SCALE;
  if (isXLUp) {
    targetScale = FULL_EARTH_SCALE;
  } else if (isMdUp) {
    targetScale = FOUR_FIFTHS_EARTH_SCALE;
  } else if (isXsUp) {
    targetScale = SEVEN_TENTHS_EARTH_SCALE;
  } else {
    targetScale = THREE_FIFTHS_EARTH_SCALE;
  }

  const [{ scale }, scaleApi] = useSpring(() => ({
    scale: INITIAL_EARTH_SCALE,
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

export default ScaleOffsetController;
