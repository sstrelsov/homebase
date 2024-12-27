import * as THREE from "three";
export const AtmosphereShader = {
  uniforms: {
    uColor: { value: new THREE.Color("#00aaff") },
    uIntensity: { value: 1.0 },
    uPower: { value: 2.0 },
    uOpacity: { value: 0.3 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      // Flip the normal so it faces outward on a back-sided sphere
      vNormal = -normalize(normal);

      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uPower;
    uniform float uOpacity;
    
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      // Calculate the view direction from fragment to camera
      vec3 viewDir = normalize(cameraPosition - vWorldPos);

      // Because we flipped the normal, this is a more direct Fresnel
      float fresnelTerm = dot(vNormal, viewDir);
      fresnelTerm = clamp(fresnelTerm, 0.0, 1.0);

      // Exponential falloff
      float intensity = pow(fresnelTerm, uPower) * uIntensity;

      // Final color with alpha
      gl_FragColor = vec4(uColor, intensity * uOpacity);
    }
  `,
};
