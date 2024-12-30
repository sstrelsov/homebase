import { useTheme } from "@nextui-org/use-theme";
import { useEffect, useState } from "react";
import EarthScene from "../../components/earth/EarthScene";
import TravelStatsCard from "../../components/TravelStatsCard";
import { trips } from "../../data/trips";

import { CityLocation } from "../../types/earthTypes";
import {
  flattenAllIsos,
  flattenAllTrips,
  getArcCities,
} from "../../utils/arcs";
import CountryButtons from "./CountryButtons";

const TheGlobeProject = () => {
  const { setTheme } = useTheme();

  // Only looks good in dark mode
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  const isos =
    flattenAllIsos(trips); /** Hack: need update when more than 2024 travels */
  const cities = Array.from(new Set(getArcCities(flattenAllTrips(trips))));

  // Earth Layer Toggles
  const [showFlags, setShowFlags] = useState(false);
  const [spotlightCountries, setSpotlightCountries] = useState<
    string[] | undefined
  >(undefined);
  const [spotlightCities, setSpotlightCities] = useState<
    CityLocation[] | undefined
  >(undefined);
  const [spotlightMiles, setSpotlightMiles] = useState<
    CityLocation[] | undefined
  >(undefined);

  // Earth camera focus
  const [focusOnCountry, setFocusOnCountry] = useState<string | undefined>(
    undefined
  );
  /**
   * On country stat click, show or hide the flags and set the spotlight countries.
   */
  const handleCountryStatClick = () => {
    setShowFlags(!showFlags);
    setFocusOnCountry(undefined);
    setSpotlightMiles(undefined);
    if (!showFlags) {
      setSpotlightCountries(isos);
    } else {
      setSpotlightCountries(undefined);
    }
  };

  /**
   * Toggle a country in the spotlight
   * @param iso The ISO code of the country to toggle
   */
  const handleFlagClick = (iso: string) => {
    if (!focusOnCountry) {
      setSpotlightCountries([iso]);
      setFocusOnCountry(iso);
    } else if (!!focusOnCountry && focusOnCountry === iso) {
      setSpotlightCountries(isos);
      setFocusOnCountry(undefined);
    } else {
      setSpotlightCountries([iso]);
      setFocusOnCountry(iso);
    }
  };

  const handleCityStatClick = () => {
    console.log("Clicked city stats");
    if (!!spotlightCities) {
      setSpotlightCities(undefined);
    } else {
      setSpotlightCities(cities);
      setSpotlightMiles(undefined);
      setSpotlightCountries(undefined);
      setFocusOnCountry(undefined);
      setShowFlags(false);
    }
  };

  const handleMilesStatClick = () => {
    if (!!spotlightMiles) {
      setSpotlightMiles(undefined);
    } else {
      setSpotlightMiles(cities);
      setSpotlightCities(undefined);
      setSpotlightCountries(undefined);
      setFocusOnCountry(undefined);
      setShowFlags(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Full-screen Earth in the background */}
      <div className="absolute inset-0 pointer-events-auto">
        <EarthScene
          spotlightCountries={spotlightCountries}
          focusIso={focusOnCountry}
          spotlightCities={spotlightCities}
          spotlightMiles={spotlightMiles}
        />
      </div>
      {/* Right half overlay (non-blocking by default) */}
      <div className="flex absolute top-0 right-0 w-full lg:w-1/2 h-full items-end lg:items-center justify-center pointer-events-none z-10">
        {/* Make the actual text clickable */}
        <div className="flex flex-col pointer-events-auto text-2xl items-center px-2 pb-4 sm:text-4xl sm:flex-start lg:pb-0 sm:px-0">
          <TravelStatsCard
            onCountryStatClick={handleCountryStatClick}
            onCityStatClick={handleCityStatClick}
            onMilesStatClick={handleMilesStatClick}
          />
          <div
            className={`
              flex flex-row gap-2
              transition-all duration-300 ease-in-out
              transform
              ${showFlags ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}
            `}
          >
            <CountryButtons isos={isos} onClick={handleFlagClick} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheGlobeProject;
