import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

interface ManualBloomProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}
/**
 * A custom post-processing bloom effect that uses:
 * - `EffectComposer` to chain multiple post-processing passes.
 * - `RenderPass` for the base scene rendering.
 * - `UnrealBloomPass` for the bloom effect.
 *
 * @param {ManualBloomProps} props
 * @prop {number} [bloomStrength=0.7] - Controls brightness of bloom highlights.
 * @prop {number} [bloomRadius=0.5] - Determines how large or soft the bloom edges appear.
 * @prop {number} [bloomThreshold=0.0] - Threshold above which areas start to bloom.
 *
 * Rendering order (the second arg in `useFrame`) is set to 1 so the bloom
 * pass happens after the scene renders. Returns null since all rendering
 * is handled via EffectComposer.
 */
const ManualBloom = ({
  bloomStrength = 0.7,
  bloomRadius = 0.5,
  bloomThreshold = 0.0,
}: ManualBloomProps) => {
  const composer = useRef<EffectComposer | null>(null);
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    // Create EffectComposer once on mount
    const effectComposer = new EffectComposer(gl);
    effectComposer.setSize(size.width, size.height);

    // 1. Render pass (renders the scene normally)
    const renderScene = new RenderPass(scene, camera);
    effectComposer.addPass(renderScene);

    // 2. UnrealBloomPass
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloomStrength, // strength (how bright the bloom is)
      bloomRadius, // radius (how wide or soft the bloom edges are)
      bloomThreshold // threshold (how bright an area must be before it blooms)
    );
    effectComposer.addPass(bloomPass);

    composer.current = effectComposer;
  }, [gl, scene, camera, size, bloomStrength, bloomRadius, bloomThreshold]);

  // Render the composer on every frame
  useFrame(() => {
    composer.current?.render();
  }, 1);

  return null;
};

export default ManualBloom;
