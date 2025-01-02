import * as THREE from "three";
/**
 * The "per-frame" update logic that lerps from (fromX, fromY) => (toX, toY).
 */
// Your animation state in module scope or top-level scope
let rotating = false;
let animationStart = 0;
const animationDuration = 1.0; // 1s
let fromX = 0,
  fromY = 0,
  toX = 0,
  toY = 0;
export function updateGlobeFrame(
  globeRef: React.RefObject<THREE.Group>,
  deltaSeconds: number
) {
  if (!rotating || !globeRef.current) return;

  const tNow = performance.now() / 1000 - animationStart;
  // fraction of animation done
  let t = tNow / animationDuration;
  if (t > 1.0) t = 1.0;

  const ease = THREE.MathUtils.smoothstep(t, 0, 1);

  const rot = globeRef.current.rotation;
  rot.x = THREE.MathUtils.lerp(fromX, toX, ease);
  rot.y = THREE.MathUtils.lerp(fromY, toY, ease);

  if (t >= 1.0) {
    rotating = false;
  }
}
