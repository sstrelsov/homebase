import { useTheme } from "@nextui-org/use-theme";
import type { ComponentProps } from "react";
import Typewriter from "../components/Typewriter";
import { useLinkColor } from "../utils/ColorContext";
import useAtOrAboveBreakpoint from "../utils/useAtOrAboveBreakpoint";

// Keep in sync with the headshot preload in index.html.
// Sizes match the button's w-52, sm:w-60, and xl:w-72.
const HEADSHOT_SIZES =
  "(min-width: 1280px) 288px, (min-width: 640px) 240px, 208px";
const headshotSrcSet = (format: "avif" | "webp") =>
  [416, 480, 576]
    .map((w) => `/images/strelsov-headshot-${w}w.${format} ${w}w`)
    .join(", ");

/** Every copy picks the same file for the viewport, so it downloads once. */
const Headshot = ({
  alt,
  ...props
}: ComponentProps<"img"> & { alt: string }) => (
  <picture>
    <source
      type="image/avif"
      srcSet={headshotSrcSet("avif")}
      sizes={HEADSHOT_SIZES}
    />
    <source
      type="image/webp"
      srcSet={headshotSrcSet("webp")}
      sizes={HEADSHOT_SIZES}
    />
    <img
      src="/images/strelsov-headshot-416w.webp"
      alt={alt}
      width={416}
      height={530}
      {...props}
    />
  </picture>
);

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
        className="relative transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 xl:w-72 sm:w-60 w-52"
        onClick={handleImageClick}
      >
        <Headshot
          alt="Spencer Strelsov Headshot"
          fetchPriority="high"
          className="relative z-10 w-full h-auto rounded-large"
        />
        {/* A blurred copy behind it makes the soft glow */}
        <Headshot
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-large blur-lg scale-105 saturate-150 opacity-30 translate-y-1"
        />
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
