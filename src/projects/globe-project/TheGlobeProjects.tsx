import EarthScene from "../../components/earth/EarthScene";
import {
  flattenAllIsos,
  flattenAllTrips,
  getArcCities,
} from "../../components/earth/utils/tripMath";
import { trips } from "../../components/earth/utils/trips";
import CountryButtons from "./CountryButtons";

const TheGlobeProject = () => {
  const isos = flattenAllIsos(trips);
  const cities = Array.from(new Set(getArcCities(flattenAllTrips(trips))));
  return (
    <div className="relative w-full h-full">
      {/* Full-screen Earth in the background */}
      <div className="absolute inset-0 pointer-events-auto">
        <EarthScene />
      </div>
      {/* Right half overlay (non-blocking by default) */}
      <div className="flex absolute top-0 right-0 w-full lg:w-1/2 h-full items-end lg:items-center justify-center pointer-events-none z-10">
        {/* Make the actual text clickable */}
        <div className="flex flex-col pointer-events-auto text-2xl items-center px-2 pb-8 sm:text-4xl sm:flex-start lg:pb-0 sm:px-0">
          <div className="flex mb-2 sm:mb-4">Travels in 2024</div>
          <div className="flex flex-row gap-2">
            <CountryButtons isos={isos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheGlobeProject;
