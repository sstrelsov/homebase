import { Image } from "@nextui-org/react";
import { useTheme } from "@nextui-org/use-theme";
import Typewriter from "../components/Typewriter";
import { useLinkColor } from "../utils/ColorContext";
import useAtOrAboveBreakpoint from "../utils/useAtOrAboveBreakpoint";

const LandingPage = () => {
  const { theme, setTheme } = useTheme();
  const isHoriztonal = useAtOrAboveBreakpoint("xl");
  const { setRandomColor } = useLinkColor();
  const handleImageClick = () => {
    setRandomColor(theme === "light" ? "dark" : "light");
    setTheme(theme === "light" ? "dark" : "light");
  };

  const cyclingPhrases = [
    "Hey, I'm Spencer!",
    "I'm a PM at Thomson Reuters",
    "I build AI for lawyers",
    "I build AI for journalists",
    "I love coding + design",
    "I love history",
    "I love storytelling",
  ];

  const accumulatingPhrases = [
    "Hey, I'm Spencer!\n\n",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers...and sometimes journalists :)",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design.",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design. I'm passionate about history, storytelling, photography and tech.\n\n",
    "Hey, I'm Spencer!\n\n I'm a PM at Thomson Reuters. I build AI for lawyers.\n\n I love coding + design. I'm passionate about history, storytelling, photography and tech.\n\n I'm based in Brooklyn, NY",
  ];

  return (
    <div className="xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start">
      <Image
        className="
          relative
          hover:cursor-pointer 
          transition-transform
          duration-300
          ease-in-out
          hover:scale-105
          active:scale-95
          xl:w-72
          sm:w-60
          w-52
        "
        src="/images/strelsov-headshot.png"
        alt="Spencer Strelsov Headshot"
        isBlurred
        onClick={handleImageClick}
      />
      <div className="flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start">
        <Typewriter
          typingSpeed={isHoriztonal ? 70 : 110}
          period={isHoriztonal ? 1000 : undefined}
          deletingSpeed={isHoriztonal ? 50 : 70}
          phrases={isHoriztonal ? accumulatingPhrases : cyclingPhrases}
          loop={isHoriztonal ? false : true}
          preserveTrailingNewlines={isHoriztonal ? true : false}
        />
      </div>
    </div>
  );
};

export default LandingPage;
