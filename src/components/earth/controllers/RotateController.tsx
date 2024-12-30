// RotateController.tsx
import { a, useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import React, { useRef, useState } from "react";
import { useDrag } from "react-use-gesture";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

interface RotateControllerProps {
  rotationSpeed?: number;
  children: React.ReactNode;
}

const RotateController = ({
  rotationSpeed = 0.02,
  children,
}: RotateControllerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
  const isSmallUp = useAtOrAboveBreakpoint("sm");

  const [springs, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: {
      mass: 1,
      friction: isSmallUp ? 30 : 10,
      tension: isSmallUp ? 50 : 25,
    },
  }));

  const [isDragging, setIsDragging] = useState(false);

  const bind = useDrag(({ delta: [dx, dy], active }) => {
    setIsDragging(active);

    if (groupRef.current) {
      const factor = 0.005;
      rotationRef.current.x += dy * factor;
      rotationRef.current.y += dx * factor;

      // Clamp vertical rotation to prevent flipping
      rotationRef.current.x = THREE.MathUtils.clamp(
        rotationRef.current.x,
        -Math.PI / 2,
        Math.PI / 2
      );

      api.start({
        rotation: [rotationRef.current.x, rotationRef.current.y, 0],
      });
    }
  });

  useFrame((_, delta) => {
    if (!isDragging && groupRef.current) {
      rotationRef.current.y += rotationSpeed * delta;
      api.start({
        rotation: [rotationRef.current.x, rotationRef.current.y, 0],
      });
    }
  });

  return (
    <a.group ref={groupRef} {...(bind() as any)} rotation={springs.rotation}>
      {children}
    </a.group>
  );
};

export default RotateController;
