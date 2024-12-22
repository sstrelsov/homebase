import { Image } from "@nextui-org/react";
import { useTheme } from "@nextui-org/use-theme";
import Typewriter from "../components/Typewriter";

const LandingPage = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeSwitch = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8">
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
        // width={`200 sm:240`}
        isBlurred
        onClick={handleThemeSwitch}
      />
      <div className="flex-1 text-left text-2xl sm:text-3xl md:text-4xl leading-relaxed xl:max-w-[25rem]">
        <Typewriter
          typingSpeed={130}
          deletingSpeed={70}
          phrases={[
            "Hey, I'm Spencer!",
            "I'm a PM at Thomson Reuters",
            "I build AI for lawyers",
            "I build AI for journalists",
            "I love coding + design",
            "I love history",
            "I love storytelling",
          ]}
        />
      </div>
    </div>
  );
};

export default LandingPage;
