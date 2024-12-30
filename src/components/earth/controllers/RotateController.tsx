// RotateController.tsx
import { a, useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";
import { useDrag } from "react-use-gesture";
import * as THREE from "three";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

interface RotateControllerProps {
  rotationSpeed?: number;
  children: React.ReactNode;
}

/**
 * This component wraps children in a group that can be rotated by drag,
 * and auto-rotates at a given speed when not dragging.
 */
const RotateController = ({
  rotationSpeed = 0.02,
  children,
}: RotateControllerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const euler = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const isSmallUp = useAtOrAboveBreakpoint("sm");
  // We use a spring to smoothly rotate the group
  const [springs, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: {
      mass: 1,
      friction: isSmallUp ? 30 : 10,
      tension: isSmallUp ? 50 : 25,
    },
  }));

  // Track whether the user is dragging
  const [isDragging, setIsDragging] = useState(false);

  // Set up the drag gesture
  const bind = useDrag(({ offset: [ox, oy], active }) => {
    setIsDragging(active);

    // Convert offset into rotation
    const factor = 0.005;
    const newX = oy * factor; // drag up/down -> rotate X
    const newY = ox * factor; // drag left/right -> rotate Y

    // Prevent flipping the globe over the poles
    const clampedX = THREE.MathUtils.clamp(newX, -Math.PI / 2, Math.PI / 2);

    euler.x = clampedX;
    euler.y = newY;

    // Tell the spring to rotate to our updated euler
    api.start({ rotation: [euler.x, euler.y, 0] });
  });

  // Auto-rotate Y when not dragging
  useFrame((_, delta) => {
    if (!isDragging) {
      euler.y += rotationSpeed * delta;
      api.start({ rotation: [euler.x, euler.y, 0] });
    }
  });

  return (
    <a.group ref={groupRef} {...(bind() as any)} rotation={springs.rotation}>
      {children}
    </a.group>
  );
};

export default RotateController;
