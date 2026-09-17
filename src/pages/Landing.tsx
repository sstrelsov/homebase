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
    <div className="xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start px-6">
      <button
        type="button"
        aria-label="Toggle theme"
        className="relative cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 xl:w-72 sm:w-60 w-52 p-0 bg-transparent border-0"
        onClick={handleImageClick}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl before:content-[''] before:absolute before:inset-[-5%] before:bg-[url('/images/strelsov-headshot-416w.webp')] before:bg-cover before:bg-center before:blur-[20px] before:scale-105" />
        <picture className="relative block">
          <source
            type="image/avif"
            srcSet="/images/strelsov-headshot-416w.avif 416w, /images/strelsov-headshot-480w.avif 480w, /images/strelsov-headshot-576w.avif 576w"
            sizes="(min-width: 1280px) 288px, (min-width: 640px) 240px, 208px"
          />
          <source
            type="image/webp"
            srcSet="/images/strelsov-headshot-416w.webp 416w, /images/strelsov-headshot-480w.webp 480w, /images/strelsov-headshot-576w.webp 576w"
            sizes="(min-width: 1280px) 288px, (min-width: 640px) 240px, 208px"
          />
          <img
            src="/images/strelsov-headshot-416w.webp"
            alt="Spencer Strelsov Headshot"
            width={416}
            height={530}
            fetchPriority="high"
            className="relative rounded-xl w-full h-auto"
          />
        </picture>
      </button>
      <div className="flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start">
        <Typewriter
          typingSpeed={isHoriztonal ? 70 : 110}
          period={isHoriztonal ? 1000 : undefined}
          deletingSpeed={isHoriztonal ? 50 : 70}
          phrases={isHoriztonal ? accumulatingPhrases : cyclingPhrases}
          loop={!isHoriztonal}
          preserveTrailingNewlines={!!isHoriztonal}
        />
      </div>
    </div>
  );
};

export default LandingPage;
