import Earth from "../components/earth/Earth";
import Typewriter from "../components/Typewriter";

const TheGlobeProject = () => {
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
          <Typewriter
            phrases={["2024 Travel"]}
            typingSpeed={100}
            deletingSpeed={50}
          />
          <p className="text-xl mt-4 max-w-md ">
            Looking back on a year in review of travel and adventure. I have the
            opportunity to visit 10 cities in 5 countries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TheGlobeProject;
