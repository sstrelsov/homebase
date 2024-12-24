// AtmosphereShader.ts
import * as THREE from "three";

export const AtmosphereShader = {
  uniforms: {
    uColor: { value: new THREE.Color("#00aaff") },
    uIntensity: { value: 1.0 }, // how strong the glow is
    uPower: { value: 2.0 }, // how quickly it falls off
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uPower;
    varying vec3 vNormal;
    
    void main() {
      // Fresnel-like term: how perpendicular the normal is to the view direction
      float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), uPower);
      gl_FragColor = vec4(uColor, intensity * uIntensity);
    }
  `,
};
