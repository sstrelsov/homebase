// RotateController.tsx
import { a, useSpring } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useDrag } from "react-use-gesture";
import * as THREE from "three";

// We define an interface for methods we expose via ref
export interface RotateControllerHandle {
  // Programmatic way to animate globe rotation (e.g. focusing on a country)
  animateToRotation: (x: number, y: number, z: number) => void;
}

interface RotateControllerProps {
  children: React.ReactNode;
  rotationSpeed?: number; // auto-rotation speed
}

/**
 * A "physical globe" approach:
 * - The user can click-drag the globe to spin it.
 * - We can also programmatically rotate to a certain Euler angle.
 */
const RotateController = forwardRef<
  RotateControllerHandle,
  RotateControllerProps
>(function RotateController({ children, rotationSpeed = 0.02 }, ref) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(new THREE.Euler(0, 0, 0));

  // Spring state
  const [springs, api] = useSpring(() => ({
    rotation: [0, 0, 0],
    config: { tension: 50, friction: 20 },
  }));

  const [isDragging, setIsDragging] = useState(false);

  // Expose an imperative handle so other components can programmatically rotate this group
  useImperativeHandle(ref, () => ({
    animateToRotation: (x: number, y: number, z: number) => {
      // Update rotationRef to the new target
      rotationRef.current.set(x, y, z);
      // Animate with react-spring
      api.start({ rotation: [x, y, z] });
    },
  }));

  // Use react-use-gesture to handle drag -> spin the globe
  const bind = useDrag(({ delta: [dx, dy], active }) => {
    setIsDragging(active);

    if (active && groupRef.current) {
      // Adjust rotationRef by drag delta
      const factor = 0.005;
      rotationRef.current.x += dy * factor;
      rotationRef.current.y += dx * factor;

      // Clamp vertical rotation to prevent flipping
      rotationRef.current.x = THREE.MathUtils.clamp(
        rotationRef.current.x,
        -Math.PI / 2,
        Math.PI / 2
      );

      // Update react-spring
      api.start({
        rotation: [
          rotationRef.current.x,
          rotationRef.current.y,
          rotationRef.current.z,
        ],
      });
    }
  });

  // Auto-rotate the globe if not dragging
  useFrame((_, delta) => {
    if (!isDragging) {
      rotationRef.current.y += rotationSpeed * delta;
      api.start({
        rotation: [
          rotationRef.current.x,
          rotationRef.current.y,
          rotationRef.current.z,
        ],
      });
    }
  });

  return (
    <a.group ref={groupRef} {...(bind() as any)} rotation={springs.rotation}>
      {children}
    </a.group>
  );
});

export default RotateController;
