import { useSpring } from "@react-spring/core";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import useAtOrAboveBreakpoint from "../../../utils/useAtOrAboveBreakpoint";

/**
 * This component smoothly animates the camera’s view offset
 * whenever the viewport size or breakpoint changes.
 */
const SmoothCameraOffsets = () => {
  const { camera, size } = useThree();

  // Your custom breakpoints
  const isXLUp = useAtOrAboveBreakpoint("xl");
  const isSmUp = useAtOrAboveBreakpoint("sm");

  // 1) Hook up react-spring to track the offsetX, offsetY values
  //    We start them at 0, but they get updated in useEffect below.
  const [{ offsetX, offsetY }, api] = useSpring(() => ({
    offsetX: 0,
    offsetY: 0,
    config: {
      tension: 170, // how stiff the spring is
      friction: 26, // how much it slows
    },
  }));

  // 2) Watch for size/breakpoint changes, then animate to the new target offset.
  useEffect(() => {
    const newOffsetX = isXLUp ? size.width * 0.2 : 0;
    const newOffsetY = isSmUp ? 0 : size.height * 0.07;

    api.start({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }, [size, isXLUp, isSmUp, api]);

  // 3) Every frame, set the camera’s offset to the *animated* values.
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

  return null;
};

export default SmoothCameraOffsets;
