interface BaseSphereProps {
  radius: number;
}

/**
 * The main Earth sphere mesh, without any atmosphere or land dots.
 *
 * @param {BaseSphereProps} props
 *   @prop {number} radius - Radius of the sphere geometry.
 *
 * Uses a meshStandardMaterial for basic shading, plus a slight emissive glow.
 */
const BaseSphere = ({ radius }: BaseSphereProps) => {
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color="#0b2a57"
        emissive="#081c3c"
        emissiveIntensity={0.3}
        roughness={0.45}
      />
    </mesh>
  );
};

export default BaseSphere;
