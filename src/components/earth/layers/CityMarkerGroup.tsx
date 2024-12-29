import { useMemo } from "react";
import { CityLocation } from "../../../types/earthTypes";
import { latLongToVector3 } from "../../../utils/arcs";
import CityMarker from "./helpers/CityMarker";

export interface CityMarkersProps {
  cities: CityLocation[];
  radius: number;
  color?: string;
  markerSize?: number;
}

const CityMarkers = ({
  cities,
  radius,
  color = "#ffcd53",
  markerSize = 1.5,
}: CityMarkersProps) => {
  // 1) Deduplicate by name (optional if your data is guaranteed unique):
  const uniqueCities = useMemo(() => {
    const map = new Map();
    for (const city of cities) {
      map.set(city.name, city);
    }
    return Array.from(map.values());
  }, [cities]);

  return (
    <>
      {uniqueCities.map((city, i) => {
        // Convert lat/lon to Vector3 on the sphere
        const position = latLongToVector3(city.lat, city.lon, radius);

        return (
          <CityMarker
            key={city.name + i}
            position={position}
            color={color}
            markerSize={markerSize}
          />
        );
      })}
    </>
  );
};

export default CityMarkers;
