import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, Color } from "three";
import { DotInfo } from "../../../types/earthTypes";

export interface LandDotsProps {
  dots: DotInfo[];
  spotlightCountries?: string[];
  pointSize: number;
  dotColor: string;
  highlightColor: string;
  shape?: "hexagon" | "octagon";
  edgeFadeStart?: number; // Angle in radians where fade starts (default: 0.7)
  edgeFadeEnd?: number; // Angle in radians where fade ends
}

const LandDots = ({
  dots,
  spotlightCountries,
  pointSize,
  dotColor,
  highlightColor,
  edgeFadeStart = 0.7,
  edgeFadeEnd = 0.35,
}: LandDotsProps) => {
  // 2) Convert dotColor and highlightColor to floats [0..1]
  const [baseR, baseG, baseB] = useMemo(() => {
    const color = new Color(dotColor);
    return [color.r, color.g, color.b];
  }, [dotColor]);

  const [highlightR, highlightG, highlightB] = useMemo(() => {
    const color = new Color(highlightColor);
    return [color.r, color.g, color.b];
  }, [highlightColor]);

  // 3) Build position array
  const positions = useMemo(() => {
    return new Float32Array(dots.flatMap((d) => [d.x, d.y, d.z]));
  }, [dots]);

  // 4) Build initial color array (all base color by default)
  const colors = useMemo(() => {
    return new Float32Array(dots.flatMap(() => [baseR, baseG, baseB]));
  }, [dots, baseR, baseG, baseB]);

  // 5) Ref to color attribute
  const colorAttrRef = useRef<BufferAttribute>(null);

  // 6) Update colors ONLY when `dots` or `spotlightCountries` changes
  useEffect(() => {
    if (!colorAttrRef.current || dots.length === 0) return;
    const colorArray = colorAttrRef.current.array as Float32Array;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const offset = i * 3;
      if (spotlightCountries && spotlightCountries.includes(dot.isoA3)) {
        colorArray[offset] = highlightR;
        colorArray[offset + 1] = highlightG;
        colorArray[offset + 2] = highlightB;
      } else {
        colorArray[offset] = baseR;
        colorArray[offset + 1] = baseG;
        colorArray[offset + 2] = baseB;
      }
    }
    // Mark attribute for GPU re-upload
    colorAttrRef.current.needsUpdate = true;
  }, [
    dots,
    spotlightCountries,
    baseR,
    baseG,
    baseB,
    highlightR,
    highlightG,
    highlightB,
  ]);

  if (dots.length === 0) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          ref={colorAttrRef}
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        depthWrite={false}
        uniforms={{
          size: { value: pointSize },
          edgeFadeStart: { value: edgeFadeStart },
          edgeFadeEnd: { value: edgeFadeEnd },
        }}
        vertexShader={`
          uniform float size;
          uniform float edgeFadeStart;
          uniform float edgeFadeEnd;

          varying vec3 vColor;
          varying float vOpacity;

          void main() {
            vColor = color;

            // Convert local 'position' to world space
            vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
            vec3 worldPos = worldPos4.xyz;

            // Normal from globe center
            vec3 worldNormal = normalize(worldPos);

            // Direction from camera
            vec3 cameraDir = normalize(cameraPosition);

            // Dot product in world space
            float dotProduct = dot(worldNormal, cameraDir);

            // Apply fade
            vOpacity = smoothstep(edgeFadeEnd, edgeFadeStart, dotProduct);

            // MVP transform
            vec4 mvPosition = viewMatrix * worldPos4;
            gl_Position = projectionMatrix * mvPosition;

            // Adjust point size based on distance (example factor)
            float distanceFactor = 800.0 / -mvPosition.z;
            gl_PointSize = size * distanceFactor;
          }
        `}
        fragmentShader={`
            varying vec3 vColor;
    varying float vOpacity;

    void main() {
      // gl_PointCoord: [0,1] range in x & y
      vec2 coord = gl_PointCoord * 2.0 - 1.0;
      float dist = length(coord);

     
      // Hard edge or smooth fade
      float alpha = 1.0;
      // float alpha = 1.0 - smoothstep(0.95, 1.0, dist);

      gl_FragColor = vec4(vColor, alpha * vOpacity);
    }
        `}
      />
    </points>
  );
};

export default LandDots;
