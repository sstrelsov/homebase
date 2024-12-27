import EarthScene from "../../components/earth/EarthScene";
import {
  flattenAllIsos,
  flattenAllTrips,
  getArcCities,
} from "../../components/earth/utils/tripMath";
import { trips } from "../../components/earth/utils/trips";
import Typewriter from "../../components/Typewriter";
import CountryButtons from "./CountryButtons";

const TheGlobeProject = () => {
  const isos = flattenAllIsos(trips);
  const cities = Array.from(new Set(getArcCities(flattenAllTrips(trips))));
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen Earth in the background */}
      <div className="absolute inset-0 pointer-events-auto">
        <EarthScene />
      </div>
      {/* Right half overlay (non-blocking by default) */}
      <div className="flex absolute top-0 right-0 w-full sm:w-1/2 h-full items-end sm:items-center justify-center pointer-events-none z-10">
        {/* Make the actual text clickable */}
        <div className="flex flex-col pointer-events-auto text-2xl items-center px-2 pb-8 sm:text-4xl sm:flex-start sm:pb-0 sm:px-0">
          <div className="flex mb-2 sm:mb-4">
            <Typewriter
              phrases={[
                "2024 Travel:",
                `2024 Travel: 3 continents`, // TODO: calculate this
                `2024 Travel: ${isos.length} countries`,
                `2024 Travel: ${cities.length} cities`,
              ]}
              loop={false}
              typingSpeed={100}
              deletingSpeed={50}
            />
          </div>
          <div className="flex flex-row gap-2">
            <CountryButtons isos={isos} />
          </div>
          <p className="text-medium sm:text-xl mt-2 max-w-md text-left">
            Looking back on a year of travel and adventure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TheGlobeProject;
