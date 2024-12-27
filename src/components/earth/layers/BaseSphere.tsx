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
      <meshPhongMaterial
        color="#063985"
        emissive="#081c3c"
        shininess={5}
        emissiveIntensity={0.4}
        specular={0x222222}
      />
    </mesh>
  );
};

export default BaseSphere;
