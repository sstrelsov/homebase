// ManualBloom.tsx
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

/**
 * 	•	strength (sometimes referred to as intensity)
- Higher value → brighter glow. Typical range might be 0.1 - 2.0.
	•	radius (sometimes called “blur size”)
- Higher value → more diffuse glow spreading outward from bright areas.
	•	threshold
- Higher value → only very bright parts of the scene glow. Setting 0.0 means anything above black can bloom; setting 0.9 means only extremely bright highlights bloom.

 */

interface ManualBloomProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
}

export default function ManualBloom({
  bloomStrength = 0.7,
  bloomRadius = 0.5,
  bloomThreshold = 0.0,
}: ManualBloomProps) {
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
}
