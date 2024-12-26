import { Button } from "@nextui-org/react";
import Flag from "react-flagpack";
import Earth from "../components/earth/Earth";
import Typewriter from "../components/Typewriter";

const TheGlobeProject = () => {
  const handleSwissClick = () => {
    console.log("Swiss flag clicked");
    // moveGlobeToCountry("CHE");
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
            <Button
              onPress={handleSwissClick}
              isIconOnly
              size="md"
              variant="light"
            >
              <Flag code="CH" hasBorder={false} size="l" />
            </Button>
            <Button isIconOnly size="md" variant="light">
              <Flag code="IS" hasBorder={false} size="l" />
            </Button>
            <Button isIconOnly size="md" variant="light">
              <Flag code="CO" hasBorder={false} size="l" />
            </Button>
            <Button isIconOnly size="md" variant="light">
              <Flag code="GB-UKM" hasBorder={false} size="l" />
            </Button>
            <Button isIconOnly size="md" variant="light">
              <Flag code="US" size="l" hasBorder={false} />
            </Button>
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
