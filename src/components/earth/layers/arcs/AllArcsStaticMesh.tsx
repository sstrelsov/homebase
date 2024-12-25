import { useEffect, useMemo, useState } from "react";
import { buildAllArcs } from "../../utils/arcs";

interface Coordinates {
  lat: number;
  lon: number;
}

interface ArcLocation {
  start: Coordinates;
  end: Coordinates;
}

interface AllArcsStaticMeshProps {
  flights: ArcLocation[];
  color: string;
  radius: number;
  /**
   * If true, rapidly flickers arcs off/on for a short duration, then stays on.
   */
  flicker?: boolean;
  /**
   * If true, arcs smoothly transition from opacity 0 to 1.
   */
  smoothOn?: boolean;
}

const AllArcsStaticMesh = ({
  flights,
  color,
  radius,
  flicker = false,
  smoothOn = false,
}: AllArcsStaticMeshProps) => {
  // Single opacity state shared by all arcs
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // If flicker is true, we do the old-timey rapid toggling.
    if (flicker) {
      // Flicker for 1 second (1000 ms), toggling every 100 ms
      let elapsed = 0;
      const flickerInterval = 100;
      const totalDuration = 1000;
      const intervalId = setInterval(() => {
        elapsed += flickerInterval;
        // Randomly go 0 or 1
        setOpacity(Math.random() < 0.5 ? 0 : 1);

        // After flicker finishes, set full
        if (elapsed >= totalDuration) {
          clearInterval(intervalId);
          setOpacity(1);
        }
      }, flickerInterval);

      return () => clearInterval(intervalId);

      // Else if smoothOn is true, do a modern fade from 0 to 1
    } else if (smoothOn) {
      // We'll animate from 0 to 1 over 1 second
      let frameId: number | null = null;
      const startTime = performance.now();
      const duration = 1000; // 1 second

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1); // clamp 0..1
        setOpacity(t);

        if (t < 1) {
          frameId = requestAnimationFrame(animate);
        }
      };

      frameId = requestAnimationFrame(animate);
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };

      // Otherwise, show immediately at full opacity
    } else {
      setOpacity(1);
    }
  }, [flicker, smoothOn]);

  // Precompute the geometries
  const arcGeometries = useMemo(() => {
    return flights.map((flight) => {
      return buildAllArcs(
        flight.start.lat,
        flight.start.lon,
        flight.end.lat,
        flight.end.lon,
        radius
      );
    });
  }, [flights, radius]);

  return (
    <>
      {arcGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
      ))}
    </>
  );
};

export default AllArcsStaticMesh;
