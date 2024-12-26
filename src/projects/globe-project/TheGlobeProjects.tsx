import Earth from "../../components/earth/Earth";
import Typewriter from "../../components/Typewriter";
import { setFocusIso } from "../../store/globeSlice";
import { useAppDispatch } from "../../store/hooks";
import CountryButtons from "./CountryButtons";

const TheGlobeProject = () => {
  const dispatch = useAppDispatch();

  const handleSwissClick = () => {
    console.log("Swiss flag clicked");
    dispatch(setFocusIso("CHE"));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Full-screen Earth in the background */}
      <div className="absolute inset-0 pointer-events-auto">
        <Earth />
      </div>
      {/* Right half overlay (non-blocking by default) */}
      <div className="absolute top-0 right-0 w-1/2 h-full flex items-center justify-center pointer-events-none z-10">
        {/* Make the actual text clickable */}
        <div className="pointer-events-auto text-4xl flex-col flex flex-start">
          <div className="flex mb-4">
            <Typewriter
              phrases={["2024 Travel"]}
              typingSpeed={100}
              deletingSpeed={50}
            />
          </div>
          <div className="flex flex-row gap-2">
            <CountryButtons isos={["CHE", "ISL", "COL", "GBR", "USA"]} />
          </div>
          <p className="text-xl mt-2 max-w-md text-left">
            Looking back on a year of travel and adventure. I had the
            opportunity to visit X cities in 5 countries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TheGlobeProject;
