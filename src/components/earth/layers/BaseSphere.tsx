export interface BaseSphereProps {
  radius: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  shininess: number;
  specular: string;
}

/**
 * Renders a basic 3D sphere mesh with customizable material properties.
 *
 * This component creates a sphere geometry using `MeshPhongMaterial` for realistic lighting effects,
 * including diffuse and specular reflection, as well as optional emissive glow.
 * It does not include any additional elements like atmosphere or land dots.
 *
 * @component
 * @param {BaseSphereProps} props - Properties to configure the sphere's appearance and material.
 *
 * @property {number} radius - The radius of the sphere geometry, which defines its size in the 3D scene.
 * @property {string} color - The base color of the sphere's material. Accepts a hex color string (e.g., `#ff0000`).
 * @property {string} emissive - The emissive color of the material, creating a glow effect independent of scene lighting.
 * @property {number} emissiveIntensity - The intensity of the emissive glow, where higher values produce a brighter glow.
 * @property {number} shininess - Controls the sharpness of the specular highlights on the sphere's surface.
 *   A higher value results in smaller, sharper highlights, while a lower value creates broader, diffused highlights.
 * @property {string} specular - The color of the specular highlights, often used to give materials a polished or metallic look.
 *   Accepts a hex color string (e.g., `#ffffff` for white highlights).
 *
 * @returns {JSX.Element} The rendered 3D sphere mesh.
 *
 * @example
 * // Render a sphere with a blue base color, faint emissive glow, and subtle specular highlights.
 * <BaseSphere
 *   radius={5}
 *   color="#1e90ff"
 *   emissive="#0a1e3c"
 *   emissiveIntensity={0.5}
 *   shininess={10}
 *   specular="#222222"
 * />
 */
const BaseSphere = ({
  radius,
  color,
  emissive,
  emissiveIntensity,
  shininess,
  specular,
}: BaseSphereProps) => {
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshPhongMaterial
        color={color}
        emissive={emissive}
        shininess={shininess}
        emissiveIntensity={emissiveIntensity}
        specular={specular}
      />
    </mesh>
  );
};

export default BaseSphere;
